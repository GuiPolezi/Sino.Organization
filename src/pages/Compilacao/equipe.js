/*
 * A equipe de compilação: por enquanto escrita à mão aqui (não vem do Milldesk).
 * Os nomes são os da equipe; funções e aparências ainda são provisórias. O id
 * liga a pessoa à aparência, à produção (dados.js) e à atuação (atuacao.js).
 */
import { CALCAS, PELES, UNIFORME } from '../Suporte/boneco/aparencia.js';
import { mapearTecnico } from '../Suporte/mappers/equipe.js';

/** @import { AparenciaTecnico, Tecnico } from '../Suporte/tipos.js' */

const PRETO = '#17130F';
const CASTANHO = '#5B3A24';
const LOIRO = '#C9A26B';

// No formato que /api/equipes/* devolve, para passar pelo mesmo mapper das outras equipes.
const PESSOAS = [
  { id: 'leonardo', name: 'Leonardo', role: 'Compilador', absent: false },
  { id: 'ramon', name: 'Ramon', role: 'Compilador', absent: false },
  { id: 'gdressano', name: 'G.Dressano', role: 'Compilador', absent: false },
  { id: 'glopes', name: 'G.Lopes', role: 'Compilador', absent: false },
  { id: 'nathalia', name: 'Nathalia', role: 'Coordenadora de Compilação', absent: false },
  { id: 'laura', name: 'Laura', role: 'Compiladora', absent: false },
  { id: 'damaris', name: 'Damaris', role: 'Compiladora', absent: false },
];

/** @type {Record<string, AparenciaTecnico>} */
export const APARENCIAS_COMPILACAO = {
  // Pele clara, cabelo com degradê só nas laterais e barba rala, crescendo.
  leonardo: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'degradeLateral', cor: PRETO },
    acessorio: 'nenhum',
    barba: 'curta',
    altura: 1.06,
  },
  ramon: {
    pele: PELES[2],
    camisa: '#6E7480',
    moletom: true,
    calca: CALCAS[2],
    cabelo: { estilo: 'cachinhos', cor: PRETO },
    acessorio: 'oculos',
    barba: 'curta',
  },
  // Cabelo curto e loiro, sem fone, e só bigode (loiro, a cor do cabelo), sem barba.
  gdressano: {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[4],
    cabelo: { estilo: 'curto', cor: LOIRO },
    acessorio: 'nenhum',
    barba: 'bigode',
    altura: 1.03,
  },
  // Cabelo grande preso num coque samurai e barba grande, os dois pretos.
  glopes: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'samurai', cor: PRETO },
    acessorio: 'nenhum',
    barba: 'grande',
    altura: 1.01,
  },
  nathalia: {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[1],
    cabelo: { estilo: 'comprido', cor: CASTANHO },
    acessorio: 'oculos',
    altura: 0.97,
  },
  // Cabelo preto, longo e sem franja; olhos pretos (sem cor de olhos, ficam os escuros).
  laura: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[3],
    cabelo: { estilo: 'compridoSemFranja', cor: PRETO },
    acessorio: 'nenhum',
    altura: 0.94,
  },
  // Pele morena mais clara, cabelo cacheado longo e preto, óculos e roupa social
  // (blazer azul-ardósia sobre a camisa branca, sem o uniforme; o tom é claro o
  // bastante para as iniciais escuras do avatar do card continuarem legíveis).
  damaris: {
    pele: PELES[2],
    camisa: '#6A7FA8',
    social: true,
    calca: CALCAS[4],
    cabelo: { estilo: 'cacheadoLongo', cor: PRETO },
    acessorio: 'oculos',
    altura: 0.96,
  },
};

/*
 * As iniciais do avatar. O mapper usa a primeira e a última palavra; "G.Dressano"
 * e "G.Lopes" são uma palavra só e ficariam os dois com "G": aqui viram "GD" e "GL".
 */
const iniciaisDe = (nome, padrao) => (nome.includes('.') ? nome.split('.').map((parte) => parte.charAt(0)).join('').toUpperCase() : padrao);

/** @returns {Tecnico[]} */
export const EQUIPE_COMPILACAO = PESSOAS.map(mapearTecnico).map((pessoa) => ({
  ...pessoa,
  avatarIniciais: iniciaisDe(pessoa.nome, pessoa.avatarIniciais),
}));

/**
 * A equipe, no mesmo formato assíncrono das páginas que buscam a sua na API.
 * @returns {Promise<Tecnico[]>}
 */
export const buscarEquipe = async () => EQUIPE_COMPILACAO;
