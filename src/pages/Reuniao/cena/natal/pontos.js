/*
 * Natal da sala de reunião: onde fica cada enfeite (docs/tema-natal.md, 4.6).
 * Só dados, sem React nem three.js: o teste (natal.test.mjs) lê daqui.
 */
import { LOGO, MESA, PAINEIS, QUADRO_REUNIAO, TAPETE, VIDRO, noArco } from '../planta.js';

// ── Árvore: canto esquerdo do fundo, entre a luminária e o vidro, virada para a câmera ──
const xArvore = -4.05;
const zArvore = -2.85;
export const ARVORE_REUNIAO = {
  x: xArvore,
  z: zArvore,
  escala: 0.92,
  rot: Math.atan2(0 - xArvore, 14 - zArvore),
  // Obstáculo: cobre a saia e os presentes; fecha o canto atrás do p1.
  r: 0.85,
};

export const OBSTACULOS_NATAL_REUNIAO = [{ x: ARVORE_REUNIAO.x, z: ARVORE_REUNIAO.z, r: ARVORE_REUNIAO.r }];

// Presentes A e D (4.1) entre a árvore e o vidro, dentro do obstáculo.
export const PRESENTES_REUNIAO = [
  { modelo: 'A', x: -3.5, z: -3.1, giro: 0.28 },
  { modelo: 'D', x: -4.55, z: -3.2, giro: -0.22 },
];

// Ponto local (lx, y, lz) de um trecho do vidro no mundo (mesma conta de noQuadro em planta.js).
const doTrecho = (p, lx, y, lz) => {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  return [p.x + lx * c + lz * s, y, p.z - lx * s + lz * c];
};

// ── Festão no vidro: uma barriga por trecho, de canto a canto, do lado da sala ──
// 2,78 no plano: com o raio do tubo encostava 5 mm no trilho.
const ALTO_FESTAO = 2.77;
const BARRIGA = 0.18;
// No trecho do logo a barriga é menor, para não encostar nele.
const BARRIGA_LOGO = 0.1;
const Z_FESTAO = 0.09;
const AMOSTRAS = 9;

export const alturaDoFestao = (u, barriga) => ALTO_FESTAO - barriga * (1 - (2 * u - 1) ** 2);

/** Uma lista de pontos (mundo) por trecho, para o <Festao curvas>. */
export const CURVAS_FESTAO_VIDRO = PAINEIS.map((p) => {
  const barriga = p.indice === LOGO.trecho ? BARRIGA_LOGO : BARRIGA;
  return Array.from({ length: AMOSTRAS }, (_, k) => {
    const u = k / (AMOSTRAS - 1);
    return doTrecho(p, (u - 0.5) * p.largura, alturaDoFestao(u, barriga), Z_FESTAO);
  });
});

// ── Neve de spray: cantos de baixo dos trechos das pontas ──
// O plano pedia 0, 2, 7 e 9; o 2 fica atrás da árvore, então vão os dois de cada ponta.
export const TRECHOS_NEVE = [0, 1, 8, 9];
export const NEVE = { largura: 0.9, altura: 0.6, y: 0.42, z: 0.015 };

/**
 * Os planos de neve: centro (mundo), giro do trecho e se o desenho é espelhado
 * (o canto da direita usa a mesma textura virada).
 * @returns {{ centro: [number, number, number], rot: number, espelhado: boolean }[]}
 */
export const PLANOS_NEVE = TRECHOS_NEVE.flatMap((indice) => {
  const p = PAINEIS[indice];
  const dx = p.largura / 2 - NEVE.largura / 2;
  return [-1, 1].map((lado) => ({
    centro: doTrecho(p, lado * dx, NEVE.y, NEVE.z),
    rot: p.rot,
    espelhado: lado === 1,
  }));
});

// ── Guirlanda: no montante entre os trechos 4 e 5 (o eixo da sala) ──
const juncao = noArco(90);
export const GUIRLANDA_REUNIAO = {
  x: juncao.x,
  z: juncao.z + 0.11,
  y: 1.85,
  diametro: 0.55,
  // A fita sobe da guirlanda até o trilho de cima do vidro.
  topoFita: VIDRO.altura - VIDRO.espessuraMoldura,
};

// ── Centro de mesa: no local da mesa, longe da jarra e das xícaras ──
export const CENTRO_MESA = { x: -0.4, z: -0.28, altura: MESA.altura, raio: 0.15 };

// ── Laço no canto de cima à esquerda da moldura do quadro (QuadroReuniao.jsx: W 2,1 · H 1,32 · C 1,78) ──
export const LACO_QUADRO = { quadro: QUADRO_REUNIAO, posicao: [-2.1 / 2 + 0.05, 1.78 + 1.32 / 2 + 0.02, 0.06], escala: 0.2 };

// ── Luzinhas na paisagem ──
// Cópia das árvores de Paisagem.jsx (ARVORES e rnd de comum.js): manter igual se elas mudarem.
const rnd = (i, k = 1) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const arvoreDaPaisagem = (i) => ({
  ...noArco(14 + i * 12.5 + rnd(i, 5) * 5, 0.9 + rnd(i, 6) * 1.0),
  alt: 1.0 + rnd(i, 7) * 0.8,
  fase: rnd(i, 8) * 6,
});

// O plano pedia 2, 6 e 10; a 2 fica atrás do logo e a 6 atrás da guirlanda.
const ARVORES_ACESAS = [3, 7, 11];
const LAMPADAS = 10;
// Copa principal (Paisagem.jsx): esfera em y 0,95 com raios 0,425 × 0,375, na escala `alt`.
const COPA = { y: 0.95, rx: 0.425, ry: 0.375, folga: 1.05 };

/** Lâmpadas em espiral (2 voltas) na copa, já na escala da árvore, relativas ao pé dela. */
const espiral = (alt, fase) =>
  Array.from({ length: LAMPADAS }, (_, k) => {
    const t = k / (LAMPADAS - 1);
    const h = -0.7 + t;
    const r = COPA.rx * Math.sqrt(1 - h * h) * COPA.folga;
    const a = fase + t * Math.PI * 4;
    return [r * Math.cos(a) * alt, (COPA.y + h * COPA.ry) * alt, r * Math.sin(a) * alt];
  });

export const LUZES_PAISAGEM = ARVORES_ACESAS.map((i) => {
  const a = arvoreDaPaisagem(i);
  return { indice: i, x: a.x, z: a.z, fase: a.fase, pontos: espiral(a.alt, a.fase) };
});

// Usado pelo teste: o centro da árvore fica no tapete.
export const dentroDoTapete = ({ x, z }) => (x / TAPETE.rx) ** 2 + (z / TAPETE.rz) ** 2 <= 1;
