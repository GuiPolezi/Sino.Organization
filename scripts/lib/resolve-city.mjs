// Descobre a cidade de um local do Milldesk a partir do NOME do local.
// O cadastro de cidade/região lá tem muitos erros (várias câmaras estão como
// "São Paulo"), então:
//
//   - Câmaras e prefeituras ("Colina CM", "Lins PM"): o nome é a cidade, e a
//     cidade do cadastro só serve de confirmação ou de último recurso.
//   - Demais locais (cartórios, clubes, autarquias): o nome pode citar a
//     cidade ("Tabelião de Notas de Amparo"), mas também bairros e palavras
//     comuns que são nomes de cidade ("Registro", "Lapa"). Por isso a cidade do
//     nome só vale dentro do estado esperado, e, se ela contradiz o cadastro,
//     vale o cadastro e o caso é sinalizado.
//
// Entre cidades homônimas vale a UF do CEP e, sem ela, o estado-sede.
import { normalize } from './geo.mjs';

// CM = Câmara Municipal, PM = Prefeitura Municipal.
const KIND_TOKENS = new Set(['cm', 'pm']);
const LINK_WORDS = new Set(['de', 'do', 'da']);
const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'd']);
// Sufixo regional omitido no dia a dia: "Bragança" é Bragança Paulista.
const HOME_SUFFIX = 'paulista';
// Nomes muito curtos não entram na busca por aproximação.
const MIN_APPROXIMATE_LENGTH = 4;
const SEGMENT_SEPARATOR = /\s+-\s+|[()]/;
// UF escrita depois da cidade no cadastro: "São Paulo - SP", "Campinas/SP".
const TRAILING_UF = /\s*[-/,(]\s*[A-Za-z]{2}\)?\s*$/;

const words = (key) => key.split(' ').filter(Boolean);
const withoutStopwords = (key) =>
  words(key).filter((word) => !STOPWORDS.has(word)).join(' ');
const first = (items, pick) => {
  for (const item of items) {
    const result = pick(item);
    if (result) return result;
  }
  return null;
};

export function createCityResolver(cities, homeUf) {
  const byKey = Map.groupBy(cities, ({ key }) => key);
  const byUf = Map.groupBy(cities, ({ uf }) => uf);
  const longestName = Math.max(...cities.map(({ key }) => words(key).length));

  const exactIn = (key, uf) => (byKey.get(key) ?? []).find((city) => city.uf === uf) ?? null;

  const exactElsewhere = (key) => {
    const candidates = byKey.get(key) ?? [];
    return candidates.length === 1 ? candidates[0] : null;
  };

  const withHomeSuffix = (key) => exactIn(`${key} ${HOME_SUFFIX}`, homeUf);

  // "Santo Antônio Aracangua" -> Santo Antônio do Aracanguá. Só vale se a
  // resposta for única na UF. `anyWord` aceita também a palavra solta no meio
  // do nome ("Aracangua"); é o teste mais frouxo, usado só na cidade do cadastro.
  const approximateIn = (key, uf, { anyWord = false } = {}) => {
    if (key.length < MIN_APPROXIMATE_LENGTH) return null;

    const bare = withoutStopwords(key);
    const isSingleWord = anyWord && words(key).length === 1;
    const tests = [
      (city) => city.key.startsWith(`${key} `),
      (city) => withoutStopwords(city.key) === bare,
      (city) => isSingleWord && words(city.key).includes(key),
    ];

    return first(tests, (test) => {
      const hits = (byUf.get(uf) ?? []).filter(test);
      return hits.length === 1 ? hits[0] : null;
    });
  };

  const parseSegment = (text) => {
    const tokens = words(normalize(text));
    return {
      key: tokens.filter((token) => !KIND_TOKENS.has(token)).join(' '),
      hasKind: tokens.some((token) => KIND_TOKENS.has(token)),
    };
  };

  // A cidade do cadastro, tolerando grafia abreviada ("Bragança").
  const fromRegistry = (registeredCity, ufs) => {
    const { key } = parseSegment(String(registeredCity ?? '').replace(TRAILING_UF, ''));
    if (!key) return null;

    return (
      first(ufs, (uf) => exactIn(key, uf)) ??
      withHomeSuffix(key) ??
      exactElsewhere(key) ??
      first(ufs, (uf) => approximateIn(key, uf, { anyWord: true }))
    );
  };

  // "Pinhal CM" cadastrado em Espírito Santo do Pinhal: o cadastro confirma.
  const confirmedBy = (registered, key) =>
    registered && ` ${registered.key} `.includes(` ${key} `) ? registered : null;

  /*
   * Câmara/prefeitura: cada nível é tentado em todos os trechos do nome antes
   * de passar ao seguinte, do mais seguro para o mais aproximado.
   */
  const fromMunicipalName = (keys, cepUf, registered) => {
    const registeredInCepUf = registered?.uf === cepUf ? registered : null;
    const levels = [
      [(key) => cepUf && exactIn(key, cepUf), 'name'],
      [(key) => cepUf === homeUf && withHomeSuffix(key), 'approximate'],
      [(key) => cepUf && approximateIn(key, cepUf), 'approximate'],
      [(key) => confirmedBy(registeredInCepUf, key), 'approximate'],
      [(key) => exactIn(key, homeUf), 'name'],
      [(key) => withHomeSuffix(key), 'approximate'],
      [(key) => confirmedBy(registered, key), 'approximate'],
      // Com CEP, outro estado só entra se for o do CEP (primeiro nível).
      [(key) => !cepUf && exactElsewhere(key), 'name'],
      [(key) => approximateIn(key, homeUf), 'approximate'],
    ];

    return first(levels, ([pick, how]) => {
      const city = first(keys, pick);
      // Nome idêntico ao da cidade não é aproximação, venha de onde vier.
      return city ? { city, how: keys.includes(city.key) ? 'name' : how } : null;
    });
  };

  // Última cidade citada depois de de/do/da, ignorando as que fazem parte de
  // um nome maior ("de Santana de Parnaíba" não é Parnaíba).
  const lastMention = (name) => {
    const tokens = words(normalize(name));
    let coveredUntil = 0;
    let last = null;

    tokens.forEach((token, index) => {
      if (!LINK_WORDS.has(token) || index < coveredUntil) return;
      for (let length = longestName; length >= 1; length -= 1) {
        const key = tokens.slice(index + 1, index + 1 + length).join(' ');
        if (byKey.has(key)) {
          last = key;
          coveredUntil = index + 1 + length;
          break;
        }
      }
    });

    return last;
  };

  // Demais locais: a cidade do nome só vale dentro das UFs esperadas.
  const fromOtherName = (name, keys, ufs) => {
    const mention = lastMention(name);
    const candidates = mention ? [...keys, mention] : keys;
    return first(candidates, (key) => first(ufs, (uf) => exactIn(key, uf)));
  };

  /*
   * Devolve { city, how } ou null. `how` diz de onde veio a cidade:
   *   'name'        o nome do local traz a cidade, e o CEP ou o cadastro confirmam
   *   'unconfirmed' o nome traz a cidade, mas nada mais a confirma
   *   'approximate' o nome traz a cidade abreviada
   *   'registered'  o nome não traz cidade; vale a do cadastro
   *   'conflict'    nome e cadastro discordam; vale o cadastro (`named` é a outra)
   * Só 'name' dispensa conferência.
   */
  return ({ name, registeredCity, cepUf }) => {
    const ufs = [...new Set([cepUf, homeUf].filter(Boolean))];
    const segments = String(name).split(SEGMENT_SEPARATOR).map(parseSegment);
    const keys = segments.map(({ key }) => key).filter(Boolean);
    const registered = fromRegistry(registeredCity, ufs);

    // Câmara/prefeitura cujo nome não fecha com cidade nenhuma fica sem cidade:
    // usar o cadastro aqui repetiria o erro das câmaras lançadas em "São Paulo".
    // Aqui o nome é a cidade: basta o CEP cair no mesmo estado para confirmar.
    if (segments.some(({ hasKind }) => hasKind)) {
      const found = fromMunicipalName(keys, cepUf, registered);
      const isConfirmed = found?.city.uf === cepUf || found?.city === registered;
      return found?.how === 'name' && !isConfirmed ? { ...found, how: 'unconfirmed' } : found;
    }

    const named = fromOtherName(name, keys, ufs);
    if (named && registered && named !== registered) {
      return { city: registered, how: 'conflict', named };
    }
    // Palavras comuns também são nomes de cidade ("Registro"): sem o cadastro
    // para confirmar, a cidade tirada do nome fica marcada para conferência.
    if (named) return { city: named, how: registered ? 'name' : 'unconfirmed' };
    return registered ? { city: registered, how: 'registered' } : null;
  };
}
