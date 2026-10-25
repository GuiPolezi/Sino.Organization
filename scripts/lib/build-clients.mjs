// Clientes do mapa da home, a partir dos locais do Milldesk (`listLocals`). Sem
// acesso à rede nem a arquivos: quem chama passa os registros, os municípios e
// as exceções manuais. Usado pela API (server/fontes.mjs) e pelo relatório
// `npm run relatorio:clientes`.
//
// Só sai o que o site mostra: cliente, cidade, UF e posição no mapa. E-mail,
// telefone e endereço nunca saem daqui, e locais desabilitados ficam de fora.
//
// A cidade é deduzida do nome do local (resolve-city.mjs), porque o cadastro de
// cidade e região do Milldesk tem erros. Exceções em scripts/data/client-overrides.json:
//   exclude: locais que não são clientes (ex.: ambiente interno de testes)
//   cities:  { "Nome do local": "Cidade/UF" } para corrigir um caso à mão
import { normalize } from './geo.mjs';
import { createCityResolver } from './resolve-city.mjs';

// Estado-sede: entre cidades homônimas, e sem CEP, vale a deste estado.
const HOME_UF = 'SP';

// Faixas de CEP (3 primeiros dígitos) de cada UF, para desempatar cidades homônimas.
// A região do cadastro não é usada: muitas estão incorretas.
const CEP_RANGES = [
  ['SP', 10, 199], ['RJ', 200, 289], ['ES', 290, 299], ['MG', 300, 399],
  ['BA', 400, 489], ['SE', 490, 499], ['PE', 500, 569], ['AL', 570, 579],
  ['PB', 580, 589], ['RN', 590, 599], ['CE', 600, 639], ['PI', 640, 649],
  ['MA', 650, 659], ['PA', 660, 688], ['AP', 689, 689], ['AM', 690, 692],
  ['RR', 693, 693], ['AM', 694, 698], ['AC', 699, 699], ['DF', 700, 727],
  ['GO', 728, 729], ['DF', 730, 736], ['GO', 737, 767], ['RO', 768, 769],
  ['TO', 770, 779], ['MT', 780, 788], ['MS', 790, 799], ['PR', 800, 879],
  ['SC', 880, 899], ['RS', 900, 999],
];

// Erro com mensagem segura para mostrar (sem dados de clientes nem chaves).
export class ClientesError extends Error {}

const ufFromCep = (zipcode) => {
  const digits = String(zipcode ?? '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const prefix = Number(digits.slice(0, 3));
  return CEP_RANGES.find(([, min, max]) => prefix >= min && prefix <= max)?.[0] ?? null;
};

/**
 * @param {object[]} registros  locais crus do Milldesk
 * @param {{ municipios: [string, string, number, number][], overrides: { exclude?: string[], cities?: Record<string, string> } }} dados
 * @returns {{ clientes: object, relatorio: Record<string, string[] | number> }}
 */
export function montarClientes(registros, { municipios, overrides }) {
  const cities = municipios.map(([name, uf, x, y]) => ({ name, uf, x, y, key: normalize(name) }));
  const resolveCity = createCityResolver(cities, HOME_UF);

  // Exceções manuais. Uma cidade inexistente é erro de configuração.
  const excluded = new Set((overrides.exclude ?? []).map(normalize));
  const fixedCities = new Map(
    Object.entries(overrides.cities ?? {}).map(([client, target]) => {
      const [name, uf] = String(target).split('/');
      const city = cities.find((entry) => entry.key === normalize(name) && entry.uf === uf);
      if (!city) throw new ClientesError(`Cidade inválida em client-overrides.json: "${target}" (use "Cidade/UF").`);
      return [normalize(client), city];
    }),
  );

  const locate = (record) => {
    const fixed = fixedCities.get(normalize(record.location));
    if (fixed) return { city: fixed, how: 'override' };
    return resolveCity({ name: record.location, registeredCity: record.city, cepUf: ufFromCep(record.zipcode) });
  };

  const named = registros.filter((record) => String(record?.location ?? '').trim());
  // Só entram os locais com "Habilitado" marcado no Milldesk (`enabled: true`).
  const enabled = named.filter((record) => record.enabled === true);
  const records = enabled.filter((record) => !excluded.has(normalize(record.location)));

  // Uma resposta vazia ou em formato inesperado não pode apagar o mapa.
  if (records.length === 0) throw new ClientesError('Nenhum local habilitado encontrado no Milldesk.');

  const grouped = new Map();
  const relatorio = {
    lidos: records.length,
    desabilitados: named.length - enabled.length,
    excluidos: enabled.length - records.length,
    semCidade: [],
    aproximados: [],
    peloCadastro: [],
    naoConfirmados: [],
    conflitos: [],
  };

  for (const record of records) {
    const client = String(record.location).trim();
    const located = locate(record);
    if (!located) {
      relatorio.semCidade.push(client);
      continue;
    }

    const { city, how } = located;
    const line = `${client} -> ${city.name}/${city.uf}`;
    if (how === 'approximate') relatorio.aproximados.push(line);
    if (how === 'registered') relatorio.peloCadastro.push(line);
    if (how === 'unconfirmed') relatorio.naoConfirmados.push(line);
    if (how === 'conflict') relatorio.conflitos.push(`${line} (o nome sugere ${located.named.name}/${located.named.uf})`);

    const id = `${city.key.replaceAll(' ', '-')}-${city.uf.toLowerCase()}`;
    const entry = grouped.get(id) ?? { id, city: city.name, uf: city.uf, x: city.x, y: city.y, clients: new Set() };
    entry.clients.add(client);
    grouped.set(id, entry);
  }

  const cityList = [...grouped.values()]
    .map((entry) => ({ ...entry, clients: [...entry.clients].sort((a, b) => a.localeCompare(b, 'pt-BR')) }))
    .sort((a, b) => b.clients.length - a.clients.length || a.city.localeCompare(b.city, 'pt-BR'));

  // Se nenhum local foi situado, o formato da resposta provavelmente mudou.
  if (cityList.length === 0) {
    throw new ClientesError(`Nenhum dos ${records.length} locais teve a cidade reconhecida.`);
  }

  return {
    clientes: {
      totals: {
        clients: cityList.reduce((total, { clients }) => total + clients.length, 0),
        cities: cityList.length,
        states: new Set(cityList.map(({ uf }) => uf)).size,
      },
      cities: cityList,
    },
    relatorio,
  };
}
