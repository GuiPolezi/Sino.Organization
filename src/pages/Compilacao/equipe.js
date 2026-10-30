/*
 * A equipe de compilação: por enquanto escrita à mão aqui (não vem do Milldesk).
 * Nomes, funções e aparências são provisórios, sorteados para montar a cena;
 * quando a equipe de verdade chegar, troque as entradas (o id liga a pessoa à
 * aparência e à produção dela em dados.js).
 */
import { CALCAS, PELES, UNIFORME } from '../Suporte/boneco/aparencia.js';
import { mapearTecnico } from '../Suporte/mappers/equipe.js';

/** @import { AparenciaTecnico, Tecnico } from '../Suporte/tipos.js' */

const PRETO = '#17130F';
const CASTANHO = '#5B3A24';
const RUIVO = '#B4513A';
const LOIRO = '#C9A26B';

// No formato que /api/equipes/* devolve, para passar pelo mesmo mapper das outras equipes.
const PESSOAS = [
  { id: 'helena', name: 'Helena Duarte', role: 'Coordenadora de Compilação', absent: false },
  { id: 'marcos', name: 'Marcos Vieira', role: 'Compilador', absent: false },
  { id: 'leticia', name: 'Letícia Ramos', role: 'Compiladora', absent: false },
  { id: 'bruno', name: 'Bruno Tavares', role: 'Revisor de Normas', absent: false },
  { id: 'camila', name: 'Camila Nogueira', role: 'Compiladora', absent: false },
  { id: 'otavio', name: 'Otávio Mendes', role: 'Analista Legislativo', absent: false },
  { id: 'priscila', name: 'Priscila Andrade', role: 'Compiladora', absent: false },
];

/** @type {Record<string, AparenciaTecnico>} */
export const APARENCIAS_COMPILACAO = {
  helena: {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[1],
    cabelo: { estilo: 'comprido', cor: CASTANHO },
    acessorio: 'oculos',
    altura: 0.97,
  },
  marcos: {
    pele: PELES[3],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'raspado', cor: PRETO },
    acessorio: 'nenhum',
    barba: 'fechada',
    altura: 1.06,
  },
  leticia: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[4],
    cabelo: { estilo: 'coque', cor: RUIVO },
    acessorio: 'nenhum',
    olhos: '#3E8E5A',
    altura: 0.94,
  },
  bruno: {
    pele: PELES[2],
    camisa: '#6E7480',
    moletom: true,
    calca: CALCAS[2],
    cabelo: { estilo: 'cachinhos', cor: PRETO },
    acessorio: 'oculos',
    barba: 'curta',
  },
  camila: {
    pele: PELES[4],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[3],
    cabelo: { estilo: 'cacheado', cor: PRETO, mechas: LOIRO },
    acessorio: 'nenhum',
    altura: 0.96,
  },
  otavio: {
    pele: PELES[0],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[0],
    cabelo: { estilo: 'careca', cor: '#8A5A33' },
    acessorio: 'gravata',
    barba: 'bigode',
    altura: 1.04,
  },
  priscila: {
    pele: PELES[1],
    camisa: UNIFORME,
    logo: true,
    calca: CALCAS[1],
    cabelo: { estilo: 'longo', cor: LOIRO },
    acessorio: 'headset',
    altura: 0.95,
  },
};

/** @returns {Tecnico[]} */
export const EQUIPE_COMPILACAO = PESSOAS.map(mapearTecnico);

/**
 * A equipe, no mesmo formato assíncrono das páginas que buscam a sua na API.
 * @returns {Promise<Tecnico[]>}
 */
export const buscarEquipe = async () => EQUIPE_COMPILACAO;
