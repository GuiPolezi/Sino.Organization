// Projeção única do mapa do Brasil: usada para desenhar os estados e para
// posicionar as cidades, de modo que os dois sempre coincidam.
export const MAP_VIEW = { width: 1000, height: 1031 };

const BOUNDS = { lonMin: -74.2, lonMax: -34.6, latMax: 5.5 };
// Latitude média do país: corrige o achatamento dos graus de longitude.
const MID_LATITUDE = 14.5;

const LON_FACTOR = Math.cos((MID_LATITUDE * Math.PI) / 180);
const SCALE = MAP_VIEW.width / ((BOUNDS.lonMax - BOUNDS.lonMin) * LON_FACTOR);

const round = (value) => Math.round(value * 10) / 10;

export const project = (lon, lat) => [
  round((lon - BOUNDS.lonMin) * LON_FACTOR * SCALE),
  round((BOUNDS.latMax - lat) * SCALE),
];

export const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
