/*
 * Como o gorro assenta em cada cabelo (docs/tema-natal.md, 5.4). Só dados e
 * funções puras: rodam nos testes em Node.
 *
 * ENCAIXE: `escala` alarga o gorro (aba e corpo, só na horizontal) e `dy` o
 * sobe ou desce, para a aba cobrir a casca do cabelo sem afundar nela.
 * CABELO_SOB_GORRO: o que muda no cabelo por baixo de um gorro cheio. Cada
 * chave é uma peça do Cabelo (Boneco.jsx): `null` esconde, um objeto troca a
 * posição e a escala. Sem ajuste (Natal desligado), o cabelo é o de hoje.
 */
import { GORROS, gorroDe } from './catalogo.js';

const CURTO = Object.freeze({ escala: 1.03, dy: 0 });
const RENTE = Object.freeze({ escala: 0.97, dy: -0.02 });
const DEGRADE = Object.freeze({ escala: 1.12, dy: 0.015 });
const ALTO = Object.freeze({ escala: 1.08, dy: 0.015 });
const CACHOS = Object.freeze({ escala: 1.15, dy: 0.02 });

/** Aba por estilo de cabelo (todos os de EstiloCabelo, em Suporte/tipos.js). */
export const ENCAIXE = Object.freeze({
  careca: RENTE,
  raspado: RENTE,
  // O degradê é rente nas laterais, mas tem 4,5 cm de volume no alto.
  degrade: DEGRADE,
  degradeLateral: DEGRADE,
  degradeMedio: DEGRADE,
  curto: CURTO,
  longo: CURTO,
  comprido: CURTO,
  compridoSemFranja: CURTO,
  ombro: CURTO,
  coque: CURTO,
  topete: ALTO,
  volumoso: ALTO,
  samurai: Object.freeze({ escala: 1.04, dy: 0 }),
  cacheado: CACHOS,
  cacheadoLongo: CACHOS,
  cachinhos: Object.freeze({ escala: 1.08, dy: 0.01 }),
  moicano: Object.freeze({ escala: 1.0, dy: 0 }),
});

// O arco do headset passa por baixo da aba: o gorro alarga um pouco.
const ESCALA_HEADSET = 1.06;

/**
 * Encaixe de uma aparência: o do cabelo, alargado pelo headset.
 * @param {{ cabelo: { estilo: string }, acessorio?: string }} aparencia
 */
export function encaixeDe(aparencia) {
  const base = ENCAIXE[aparencia.cabelo.estilo] ?? CURTO;
  if (aparencia.acessorio !== 'headset') return base;
  return { ...base, escala: Math.max(base.escala, ESCALA_HEADSET) };
}

// Índices 0..n−1: na lista de cachos de Boneco.jsx, os primeiros são os do alto.
const primeiros = (n) => Object.freeze(Array.from({ length: n }, (_, i) => i));

// Comprido: o cabelo das costas começa sob a aba (topo em y 0,13; a ponta de baixo não muda).
const COSTAS_SOB_ABA = Object.freeze({ rabo: Object.freeze({ position: [0, -0.38, -0.3], scale: [1.25, 1.35, 0.5] }) });

// Topete e volumoso viram franja, aparecendo por baixo da aba.
const FRANJA = Object.freeze({ topete: Object.freeze({ position: [0, 0.17, 0.27], scale: [1.25, 0.45, 0.75] }) });

/** O que muda em cada cabelo sob um gorro cheio (todos os estilos menos o mini). */
export const CABELO_SOB_GORRO = Object.freeze({
  degradeMedio: Object.freeze({ topete: null }),
  topete: FRANJA,
  volumoso: FRANJA,
  // Coque baixo, na nuca.
  coque: Object.freeze({ coque: Object.freeze({ position: [0, 0.03, -0.33], scale: 0.85 }) }),
  samurai: Object.freeze({
    coque: Object.freeze({ position: [0, 0.1, -0.36], scale: [0.9, 0.85, 0.9] }),
    peDoCoque: null,
  }),
  // Esconde os cachos do alto: o do topo e o anel de 35° (cacheado), ou os
  // anéis de 0°, 25° e 50° (cachinhos, que furariam o cone). Os outros escapam
  // por baixo da aba.
  cacheado: Object.freeze({ cachosOcultos: primeiros(7) }),
  cacheadoLongo: Object.freeze({ cachosOcultos: primeiros(7) }),
  cachinhos: Object.freeze({ cachosOcultos: primeiros(21) }),
  moicano: Object.freeze({ moicano: null }),
  // O cabelo das costas sobe até y 0,24 e furaria o gorro atrás: começa mais
  // baixo, sob a aba, com a mesma ponta embaixo.
  longo: Object.freeze({ rabo: Object.freeze({ position: [0, -0.2, -0.2], scale: [1.15, 0.85, 0.55] }) }),
  comprido: COSTAS_SOB_ABA,
  compridoSemFranja: COSTAS_SOB_ABA,
});

// O mini fica no alto, de lado: o coque e o cabelo comprido ficam à mostra.
// Só o que o engoliria muda: a crista, o topete e os cachos logo embaixo dele
// (o do topo e os vizinhos do lado esquerdo, a ~290° da frente).
const CACHOS_SOB_MINI = Object.freeze({ cachosOcultos: Object.freeze([0, 5, 6]) });
const SOB_MINI = Object.freeze({
  moicano: CABELO_SOB_GORRO.moicano,
  topete: FRANJA,
  volumoso: FRANJA,
  cacheado: CACHOS_SOB_MINI,
  cacheadoLongo: CACHOS_SOB_MINI,
  cachinhos: Object.freeze({ cachosOcultos: Object.freeze([0, 7, 8, 19]) }),
});

/**
 * Ajuste do cabelo e dos acessórios da cabeça sob o gorro da pessoa.
 * Devolve sempre um objeto novo (nunca altera as tabelas).
 * @param {string} id
 * @param {{ cabelo: { estilo: string }, acessorio?: string }} aparencia
 */
export function cabeloSobGorro(id, aparencia) {
  const estilo = gorroDe(id);
  const tabela = GORROS[estilo].mini ? SOB_MINI : CABELO_SOB_GORRO;
  const ajuste = { ...(tabela[aparencia.cabelo.estilo] ?? {}) };
  if (aparencia.acessorio === 'bone') ajuste.semBone = true;
  // Com o gorro cheio, o alto do arco do headset fica escondido por ele.
  if (aparencia.acessorio === 'headset' && !GORROS[estilo].mini) ajuste.semArco = true;
  return ajuste;
}
