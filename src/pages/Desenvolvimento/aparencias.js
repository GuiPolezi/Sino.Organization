// Aparência de cada desenvolvedor: a configuração do mesmo boneco base do
// suporte, mapeada pelo id em src/data/dev-team.json. Para ajustar alguém,
// edite a entrada dele aqui. Quase todos vestem a camisa verde do uniforme, a
// mesma do suporte, com o logo da empresa no peito; o Caique vai de moletom.

import { CABELOS, CALCAS, PELES, UNIFORME } from '../Suporte/boneco/aparencia.js';

/** @import { AparenciaTecnico } from '../Suporte/tipos.js' */

const PRETO = '#17130F';
const MOLETOM_CINZA = '#6E7480';

/** @type {Record<string, AparenciaTecnico>} */
export const APARENCIAS_DEV = {
  adriano: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'curto', cor: CABELOS[1] },
    acessorio: 'oculos',
  },
  antonio: {
    pele: PELES[2],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[4],
    cabelo: { estilo: 'topete', cor: PRETO },
    acessorio: 'headset',
    altura: 0.95,
  },
  arnaldo: {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[2],
    cabelo: { estilo: 'topete', cor: CABELOS[0] },
    acessorio: 'nenhum',
    barba: 'cavanhaque',
    altura: 1.05,
  },
  caique: {
    pele: PELES[3],
    camisa: MOLETOM_CINZA,
    moletom: true,
    calca: CALCAS[1],
    cabelo: { estilo: 'raspado', cor: PRETO },
    acessorio: 'nenhum',
  },
  donizeti: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[3],
    cabelo: { estilo: 'volumoso', cor: PRETO },
    acessorio: 'oculos',
    barba: 'fechada',
    altura: 0.93,
  },
  eduardo: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'topete', cor: PRETO },
    acessorio: 'oculos',
    altura: 1.08,
  },
  'guilherme-a': {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[4],
    cabelo: { estilo: 'cachinhos', cor: PRETO },
    acessorio: 'nenhum',
    barba: 'curta',
  },
  ketlyn: {
    pele: PELES[2],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[2],
    cabelo: { estilo: 'comprido', cor: PRETO },
    acessorio: 'nenhum',
    altura: 0.97,
  },
  gustavo: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[1],
    cabelo: { estilo: 'topete', cor: CABELOS[3] },
    acessorio: 'nenhum',
    barba: 'bigode',
    olhos: '#3F8FE0',
    altura: 1.02,
  },
  rafael: {
    pele: PELES[3],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[3],
    cabelo: { estilo: 'cacheado', cor: CABELOS[0], mechas: CABELOS[2] },
    acessorio: 'gravata',
    olhos: '#3F8FE0',
  },
};
