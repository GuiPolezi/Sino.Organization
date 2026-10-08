// Aparência de cada desenvolvedor: a configuração do mesmo boneco base do
// suporte, mapeada pelo id em src/data/dev-team.json. Para ajustar alguém,
// edite a entrada dele aqui. Sem uniforme: cada um com a sua camisa.

import { CABELOS, CALCAS, CAMISAS, PELES } from '../Suporte/boneco/aparencia.js';

/** @import { AparenciaTecnico } from '../Suporte/tipos.js' */

const PRETO = '#17130F';

/** @type {Record<string, AparenciaTecnico>} */
export const APARENCIAS_DEV = {
  'dev-1': {
    pele: PELES[0],
    camisa: CAMISAS[0],
    calca: CALCAS[0],
    cabelo: { estilo: 'curto', cor: CABELOS[1] },
    acessorio: 'oculos',
  },
  'dev-2': {
    pele: PELES[2],
    camisa: CAMISAS[1],
    calca: CALCAS[4],
    cabelo: { estilo: 'longo', cor: PRETO },
    acessorio: 'headset',
    altura: 0.95,
  },
  'dev-3': {
    pele: PELES[1],
    camisa: CAMISAS[2],
    calca: CALCAS[2],
    cabelo: { estilo: 'topete', cor: CABELOS[0] },
    acessorio: 'nenhum',
    barba: 'cavanhaque',
    altura: 1.05,
  },
  'dev-4': {
    pele: PELES[3],
    camisa: CAMISAS[3],
    calca: CALCAS[1],
    cabelo: { estilo: 'cacheado', cor: PRETO },
    acessorio: 'oculos',
  },
  'dev-5': {
    pele: PELES[0],
    camisa: CAMISAS[4],
    calca: CALCAS[3],
    cabelo: { estilo: 'coque', cor: CABELOS[3] },
    acessorio: 'nenhum',
    olhos: '#4F9A6A',
    altura: 0.93,
  },
  'dev-6': {
    pele: PELES[4],
    camisa: CAMISAS[5],
    calca: CALCAS[0],
    cabelo: { estilo: 'careca', cor: PRETO },
    acessorio: 'headset',
    barba: 'bigode',
    altura: 1.08,
  },
  'dev-7': {
    pele: PELES[1],
    camisa: CAMISAS[6],
    calca: CALCAS[4],
    cabelo: { estilo: 'moicano', cor: CABELOS[5] },
    acessorio: 'nenhum',
  },
  'dev-8': {
    pele: PELES[2],
    camisa: CAMISAS[7],
    calca: CALCAS[2],
    cabelo: { estilo: 'longo', cor: CABELOS[2], mechas: CABELOS[3] },
    acessorio: 'oculos',
    altura: 0.97,
  },
  'dev-9': {
    pele: PELES[0],
    camisa: CAMISAS[8],
    calca: CALCAS[1],
    cabelo: { estilo: 'curto', cor: CABELOS[4] },
    acessorio: 'bone',
    barba: 'cavanhaque',
    altura: 1.02,
  },
  'dev-10': {
    pele: PELES[3],
    camisa: '#5C7CFA',
    calca: CALCAS[3],
    cabelo: { estilo: 'cacheado', cor: CABELOS[0], mechas: CABELOS[2] },
    acessorio: 'gravata',
    olhos: '#3F8FE0',
  },
};
