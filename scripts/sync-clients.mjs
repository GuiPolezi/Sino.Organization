// Busca os locais de atendimento no Milldesk e gera src/data/clients.json,
// só com o que o site mostra: cliente, cidade, UF e posição no mapa.
// E-mail, telefone e endereço da API nunca saem deste script, e locais
// desabilitados no Milldesk ficam de fora.
//
// Uso:
//   npm run sync:clients                  (lê MILLDESK_API_KEY do .env)
//   npm run sync:clients -- --from arq.json   (usa um JSON local no formato da API)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { normalize } from './lib/geo.mjs';

const API_URL = 'https://v1.milldesk.com/api';
const CITIES_FILE = new URL('./data/municipios.json', import.meta.url);
const OUTPUT = 'src/data/clients.json';
const API_TIMEOUT_MS = 15000;
const ERROR_PREVIEW_LENGTH = 80;

// Faixas de CEP (3 primeiros dígitos) de cada UF, para desempatar cidades homônimas.
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

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

// Aceita `--nome valor` e `--nome=valor`; devolve null se o argumento não veio.
const readArgument = (name) => {
  const args = process.argv.slice(2);
  const index = args.findIndex((arg) => arg === name || arg.startsWith(`${name}=`));
  if (index === -1) return null;

  const value = args[index].includes('=')
    ? args[index].slice(name.length + 1)
    : args[index + 1];
  return value || fail(`Informe o arquivo depois de ${name}.`);
};

const fetchLocals = async () => {
  const apiKey = process.env.MILLDESK_API_KEY;
  if (!apiKey) {
    fail('Defina MILLDESK_API_KEY no arquivo .env (veja .env.example).');
  }

  // A chave vai na URL: nunca registre a URL em logs ou mensagens de erro.
  // Sem seguir redirecionamentos, para a chave não ser enviada a outro endereço.
  const response = await fetch(`${API_URL}/${encodeURIComponent(apiKey)}/listLocals`, {
    redirect: 'error',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  }).catch(() => {
    fail('Não foi possível conectar à API do Milldesk.');
  });
  if (!response.ok) fail(`A API do Milldesk respondeu HTTP ${response.status}.`);

  return response.json().catch(() => fail('A API do Milldesk não devolveu JSON.'));
};

const toRecords = (payload) => {
  if (payload?.error) {
    // A mensagem vem do servidor: tira a chave dela, crua ou codificada na URL.
    const apiKey = process.env.MILLDESK_API_KEY;
    const secrets = apiKey ? [apiKey, encodeURIComponent(apiKey)] : [];
    const reason = secrets
      .reduce((text, secret) => text.replaceAll(secret, '***'), String(payload.error))
      .slice(0, ERROR_PREVIEW_LENGTH);
    fail(`A API do Milldesk recusou a requisição: ${reason}.`);
  }
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') return Object.values(payload);
  return fail('Formato de resposta inesperado da API do Milldesk.');
};

const cities = JSON.parse(await readFile(CITIES_FILE, 'utf8')).map(
  ([name, uf, x, y]) => ({ name, uf, x, y, key: normalize(name) }),
);
const UFS = new Set(cities.map(({ uf }) => uf));
const citiesByKey = Map.groupBy(cities, ({ key }) => key);

const ufFromCep = (zipcode) => {
  const digits = String(zipcode ?? '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const prefix = Number(digits.slice(0, 3));
  return CEP_RANGES.find(([, min, max]) => prefix >= min && prefix <= max)?.[0] ?? null;
};

// "Campinas - SP", "Campinas/SP" e "Campinas (SP)" viram { name, uf }.
const splitCityAndUf = (rawCity) => {
  const text = String(rawCity ?? '').trim();
  const match = text.match(/^(.+?)\s*[-/,(]\s*([A-Za-z]{2})\)?$/);
  const uf = match?.[2].toUpperCase();
  return uf && UFS.has(uf) ? { name: match[1], uf } : { name: text, uf: null };
};

const pick = (candidates, uf) => {
  const inUf = uf ? candidates.filter((city) => city.uf === uf) : candidates;
  return inUf.length === 1 ? inUf[0] : null;
};

// Último recurso: procura o nome de um município dentro do nome do local.
// Só vale com a UF conhecida; sem ela, "Padaria Natal" viraria Natal/RN.
const findInText = (text, uf) => {
  if (!uf) return null;
  const haystack = ` ${normalize(text)} `;
  const found = cities
    .filter((city) => city.uf === uf && haystack.includes(` ${city.key} `))
    .sort((a, b) => b.key.length - a.key.length);
  const longest = found.filter((city) => city.key.length === found[0].key.length);
  return longest.length === 1 ? longest[0] : null;
};

// Devolve { city, guessed }: `guessed` marca a cidade deduzida do nome do local.
// Pistas de UF que se contradizem (escrita na cidade, CEP, região), ou uma UF
// que contradiz a cidade, deixam o local sem cidade, em vez de colocá-lo em
// outro estado.
const resolveCity = (record) => {
  const { name, uf: writtenUf } = splitCityAndUf(record.city);
  const regionUf = String(record.region ?? '').trim().toUpperCase();
  const hints = new Set(
    [writtenUf, ufFromCep(record.zipcode), UFS.has(regionUf) ? regionUf : null].filter(Boolean),
  );
  if (hints.size > 1) return { city: null, guessed: false };

  const [uf = null] = hints;
  const candidates = citiesByKey.get(normalize(name)) ?? [];

  if (candidates.length > 0) return { city: pick(candidates, uf), guessed: false };
  return { city: findInText(record.location, uf), guessed: true };
};

const source = readArgument('--from');
const payload = source !== null ? JSON.parse(await readFile(source, 'utf8')) : await fetchLocals();
const named = toRecords(payload).filter((record) => String(record?.location ?? '').trim());
// Só entram os locais com "Habilitado" marcado no Milldesk (`enabled: true`).
const records = named.filter((record) => record.enabled === true);
const disabledCount = named.length - records.length;

// Uma resposta vazia ou em formato inesperado não pode apagar os dados atuais.
if (records.length === 0) {
  fail(`Nenhum local habilitado encontrado na resposta: ${OUTPUT} não foi alterado.`);
}

const grouped = new Map();
const unmatched = [];
const guessed = [];

for (const record of records) {
  const client = String(record.location).trim();
  const { city, guessed: isGuess } = resolveCity(record);

  if (!city) {
    unmatched.push(client);
    continue;
  }
  if (isGuess) guessed.push(`${client} -> ${city.name}/${city.uf}`);

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
  fail(`Nenhum dos ${records.length} locais teve a cidade reconhecida: ${OUTPUT} não foi alterado.`);
}

const output = {
  source: source !== null ? 'sample' : 'milldesk',
  totals: {
    clients: cityList.reduce((total, { clients }) => total + clients.length, 0),
    cities: cityList.length,
    states: new Set(cityList.map(({ uf }) => uf)).size,
  },
  cities: cityList,
};

await mkdir('src/data', { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);

process.stdout.write(
  `${records.length} locais habilitados lidos (${disabledCount} desabilitados ignorados): ${output.totals.clients} clientes em ${output.totals.cities} cidades e ${output.totals.states} estados -> ${OUTPUT}\n`,
);
if (unmatched.length > 0) {
  process.stdout.write(
    `${unmatched.length} locais sem cidade reconhecida (ficaram fora do mapa):\n${unmatched.map((name) => `  - ${name}`).join('\n')}\n`,
  );
}
if (guessed.length > 0) {
  process.stdout.write(
    `${guessed.length} locais com a cidade deduzida pelo nome (confira):\n${guessed.map((line) => `  - ${line}`).join('\n')}\n`,
  );
}
