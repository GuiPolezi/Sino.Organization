// Gera os dados geográficos fixos do mapa de clientes:
//   - src/components/Clients/brazilMap.js: contorno dos estados em SVG (IBGE)
//   - scripts/data/municipios.json: [nome, UF, x, y] de cada município
// Uso: npm run build:geo (só é preciso rodar de novo se a projeção mudar).
import { mkdir, writeFile } from 'node:fs/promises';
import { MAP_VIEW, project } from './lib/geo.mjs';

const SOURCES = {
  states:
    'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=UF',
  cities:
    'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/municipios.csv',
  ufs: 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv/estados.csv',
};
const MAP_OUTPUT = 'src/components/Clients/brazilMap.js';
const CITIES_OUTPUT = 'scripts/data/municipios.json';

const download = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`);
  return response.text();
};

const parseCsv = (text) => {
  const [header, ...lines] = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => {
    const values = line.split(',');
    if (values.length !== columns.length) {
      throw new Error(`Linha de CSV inesperada: ${line}`);
    }
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
};

const ringToPath = (ring) =>
  `M${ring.map(([lon, lat]) => project(lon, lat).join(' ')).join('L')}Z`;

const geometryToPath = ({ type, coordinates }) => {
  const polygons = type === 'MultiPolygon' ? coordinates : [coordinates];
  return polygons.flatMap((polygon) => polygon.map(ringToPath)).join('');
};

const [statesText, citiesText, ufsText] = await Promise.all(
  Object.values(SOURCES).map(download),
);

const ufByCode = new Map(parseCsv(ufsText).map((row) => [row.codigo_uf, row]));

const states = JSON.parse(statesText)
  .features.map(({ properties, geometry }) => {
    const { uf, nome } = ufByCode.get(properties.codarea);
    return { uf, name: nome, d: geometryToPath(geometry) };
  })
  .sort((a, b) => a.uf.localeCompare(b.uf));

const cities = parseCsv(citiesText).map((row) => [
  row.nome,
  ufByCode.get(row.codigo_uf).uf,
  ...project(Number(row.longitude), Number(row.latitude)),
]);

const mapModule = `// Gerado por scripts/build-geo-data.mjs (malha do IBGE por UF). Não edite à mão.
export const MAP_VIEW = ${JSON.stringify(MAP_VIEW)};

export const STATES = ${JSON.stringify(states, null, 2)};
`;

await mkdir('scripts/data', { recursive: true });
await mkdir('src/components/Clients', { recursive: true });
await writeFile(MAP_OUTPUT, mapModule);
await writeFile(CITIES_OUTPUT, `${JSON.stringify(cities)}\n`);

process.stdout.write(
  `${states.length} estados -> ${MAP_OUTPUT}\n${cities.length} municípios -> ${CITIES_OUTPUT}\n`,
);
