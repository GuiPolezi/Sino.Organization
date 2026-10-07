// Aparência de cada técnico = configuração do MESMO boneco base, mapeada pelo
// id do técnico em scripts/data/support-team.json. Para ajustar alguém, edite a
// entrada dele em `aparencias`. Técnicos sem entrada recebem uma aparência
// gerada a partir do id, sempre a mesma.

/** @import { AparenciaTecnico } from '../tipos.js' */

export const PELES = ['#F3D2B8', '#E7B793', '#C98E69', '#9C6644', '#6F4730'];
export const CAMISAS = ['#7FA7D9', '#E58F8F', '#8CC7A1', '#F2C46D', '#B79CE0', '#6FC3C8', '#F0A36B', '#D58BB8', '#9AA7B8'];
export const CALCAS = ['#3E4A63', '#5A4E6B', '#4A5C55', '#6B5B4E', '#2F3B4C'];
export const CABELOS = ['#2B1E16', '#5B3A24', '#8A5A33', '#C9A26B', '#3A3A3A', '#B4513A'];
export const ESTILOS = ['curto', 'coque', 'moicano', 'careca', 'longo'];
export const ACESSORIOS = ['nenhum', 'oculos', 'headset', 'bone', 'maleta', 'gravata'];

// Camisa verde do uniforme do suporte.
const UNIFORME = '#4FA46B';
const PRETO = '#17130F';

/** @type {Record<string, AparenciaTecnico>} */
export const aparencias = {
  roberto: {
    pele: PELES[0],
    camisa: UNIFORME,
    calca: CALCAS[0],
    cabelo: { estilo: 'curto', cor: '#4A3020' },
    acessorio: 'oculos',
    barba: 'bigode',
  },
  fabio: {
    pele: PELES[0],
    camisa: UNIFORME,
    calca: CALCAS[4],
    cabelo: { estilo: 'topete', cor: PRETO },
    acessorio: 'nenhum',
    barba: 'bigode',
    olhos: '#3F8FE0',
  },
  'guilherme-p': {
    pele: PELES[0],
    camisa: UNIFORME,
    calca: CALCAS[2],
    cabelo: { estilo: 'cacheado', cor: PRETO, mechas: '#EFEAE0' },
    acessorio: 'nenhum',
  },
  luiz: {
    pele: PELES[0],
    camisa: UNIFORME,
    calca: CALCAS[3],
    cabelo: { estilo: 'careca', cor: '#3A2A20' },
    acessorio: 'oculos',
    barba: 'cavanhaque',
  },
};

function hash(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** @returns {AparenciaTecnico} */
export function aparenciaDe(id) {
  if (Object.hasOwn(aparencias, id)) return aparencias[id];

  const h = hash(id);
  const escolher = (lista, deslocamento) => lista[(h >>> deslocamento) % lista.length];
  return {
    pele: escolher(PELES, 0),
    camisa: escolher(CAMISAS, 3),
    calca: escolher(CALCAS, 7),
    cabelo: { estilo: escolher(ESTILOS, 11), cor: escolher(CABELOS, 15) },
    acessorio: escolher(ACESSORIOS, 19),
    altura: 0.94 + ((h >>> 23) % 15) / 100,
  };
}
