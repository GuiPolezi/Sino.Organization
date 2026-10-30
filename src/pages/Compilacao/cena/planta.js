/*
 * A planta de /compilacao (só dados, sem React nem three.js): onde fica cada
 * coisa no tapete, nas duas formas dele (paisagem e retrato).
 *
 *   • sete mesas de trabalho, as mesmas de /suporte: um bloco de quatro no meio,
 *     duas soltas na direita e uma no fundo
 *   • o cantinho do café, na esquerda: a mesa com a cafeteira, as xícaras e a
 *     flor, e na frente dela dois pufes em roda, um de frente para o outro
 *   • a estátua de Têmis no fundo (é o "quadro" da equipe: quadro/posicao.js)
 *
 * Tudo vira estação (Suporte/boneco/estacoes.js): as mesas, para trabalhar; os
 * pufes, para sentar; e dois lugares em pé na frente da mesa do café, para
 * pegar e devolver a xícara. Pufes e café são "especiais": só o comportamento
 * da página (cafe.js) leva alguém até eles.
 *
 * Eixos: +x direita · +z frente (câmera) · y altura · 1 unidade = 1 m.
 * Giro das mesas: 0 = cadeira para a câmera (+z); π = cadeira para o fundo.
 */
import { pontoLocal } from '../../Suporte/boneco/estacoes.js';
import { ASSENTO_PUFE } from '../../Reuniao/cena/planta.js';

/** @import { BaseEstacao } from '../../Suporte/boneco/estacoes.js' */

// O tapete de /desenvolvimento: cabem as sete mesas, o café e a estátua (store.js, configurarCena).
export const CENA_COMPILACAO = {
  areaPaisagem: { rx: 8.75, rz: 5.35 },
  areaRetrato: { rx: 5.05, rz: 6.45 },
  margemTapete: 0.55,
  recuo: 1.32,
};

/*
 * A estátua no lugar do quadro (quadro/posicao.js): no fundo, quase no centro (mais à
 * esquerda, o título da página a cobria), ou no centro em retrato. Maior que o quadro
 * das outras equipes (escala), para ser a peça de destaque da sala. O corredor que abre
 * na frente dela com o painel é o curto de /desenvolvimento, para não cair nas mesas.
 */
export const QUADRO_COMPILACAO = {
  escala: 1.3,
  anguloPaisagem: -94,
  anguloRetrato: -90,
  corredorPaisagem: [
    { x: 0, z: 0.5, rMax: 2.0 },
    { x: 0, z: 4.6, rMax: 0.85 },
  ],
  // Com o painel aberto a câmera recua e sobe: a estátua é alta e a folha fica à direita dela.
  foco: {
    largo: { dx: 2.3, y: 4.2, z: 9.4, olhar: 2.1 },
    estreito: { dx: 0.8, y: 6.4, z: 13.5, olhar: 0.2 },
  },
};

// Mesa do café (m): largura, profundidade e altura do tampo.
export const MESA_CAFE = { largura: 1.5, profundidade: 0.8, altura: 0.78 };
// Os dois lugares em pé, na frente da mesa: x local de cada um e a distância da mesa.
const LUGARES_CAFE = [
  { id: 'cafe-cafeteira', x: 0.38 },
  { id: 'cafe-xicaras', x: -0.32 },
];
const ASSENTO_CAFE = 0.72;
const CHEGADA_CAFE = 1.25;
// Do centro do pufe até onde o boneco chega andando, e o raio dele (com metade do corpo).
const CHEGADA_PUFE = 0.95;
const RAIO_PUFE = 0.75;
// A roda de pufes: distância de cada pufe ao centro e quanto os dois ficam atrás dele (rad),
// para quem senta aparecer de três quartos para a câmera, e não de perfil.
const RAIO_RODA = 1.05;
const GIRO_RODA = 0.35;

// O bloco 2×2 de /suporte, com centro em (cx, cz).
const bloco = (cx, cz) => [
  { id: 'c-b1', x: cx - 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'c-b2', x: cx + 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'c-b3', x: cx - 0.8, z: cz + 0.4, rot: 0 },
  { id: 'c-b4', x: cx + 0.8, z: cz + 0.4, rot: 0 },
];

/*
 * Os dois pufes em roda em volta de `centro`, cada um olhando para ele: quem senta
 * fica de frente para quem está no outro. forma: 'baixo' (redondo) ou 'alto' (com
 * encosto), as do pufe da sala de reunião.
 */
function rodaDePufes({ x, z }) {
  const dx = Math.cos(GIRO_RODA) * RAIO_RODA;
  const dz = Math.sin(GIRO_RODA) * RAIO_RODA;
  return [
    { id: 'pufe-vermelho', x: x - dx, z: z - dz, cor: '#E25656', forma: 'baixo', olhar: { x, z } },
    { id: 'pufe-amarelo', x: x + dx, z: z - dz, cor: '#F2B632', forma: 'alto', olhar: { x, z } },
  ];
}

const PLANTAS = {
  paisagem: {
    mesas: [
      ...bloco(1.4, 0.4),
      // As duas da direita, em diagonal, com quem trabalha de frente para a câmera.
      { id: 'c-dir-fundo', x: 5.3, z: -2.3, rot: Math.PI - 0.45 },
      { id: 'c-dir-frente', x: 6.3, z: 0.9, rot: Math.PI - 0.45 },
      // A do fundo, de costas para a câmera, com a tela à vista.
      { id: 'c-fundo', x: 2.4, z: -3.6, rot: 0.15 },
    ],
    cafe: { x: -6.1, z: -1.7, rot: 0.4 },
    // Na frente da mesa do café.
    pufes: rodaDePufes({ x: -5.5, z: 1.0 }),
  },
  retrato: {
    mesas: [
      ...bloco(0.9, 0),
      { id: 'c-dir-fundo', x: 2.7, z: -3.4, rot: -0.35 },
      { id: 'c-dir-frente', x: 2.4, z: 3.6, rot: Math.PI - 0.3 },
      { id: 'c-fundo', x: -2.6, z: -3.2, rot: 0.35 },
    ],
    // De lado, com a frente virada para o meio do tapete.
    cafe: { x: -3.4, z: 1.2, rot: Math.PI / 2 },
    pufes: rodaDePufes({ x: -2.7, z: 3.5 }),
  },
};

/** Ids das mesas de trabalho. */
export const IDS_DAS_MESAS = PLANTAS.paisagem.mesas.map(({ id }) => id);

/**
 * A planta da forma do tapete: mesas, mesa do café e pufes (com o giro de cada pufe).
 * @param {boolean} retrato
 */
export function planta(retrato) {
  const { mesas, cafe, pufes } = retrato ? PLANTAS.retrato : PLANTAS.paisagem;
  return {
    mesas: mesas.map((mesa) => ({ ...mesa, tipo: 'mesa' })),
    cafe: { ...cafe },
    pufes: pufes.map((pufe) => ({ ...pufe, rot: Math.atan2(pufe.olhar.x - pufe.x, pufe.olhar.z - pufe.z) })),
  };
}

// Senta de costas no pufe, chegando pela frente dele e já olhando para onde ele aponta.
function lugarNoPufe(pufe) {
  const ux = Math.sin(pufe.rot);
  const uz = Math.cos(pufe.rot);
  const { frente, quadril } = ASSENTO_PUFE[pufe.forma];
  return {
    id: pufe.id,
    x: pufe.x,
    z: pufe.z,
    rot: pufe.rot,
    tipo: 'pufe',
    especial: true,
    alturaQuadril: quadril,
    trajetoDireto: true,
    semBloco: true,
    assento: { x: pufe.x + ux * frente, z: pufe.z + uz * frente },
    aprox: { x: pufe.x + ux * CHEGADA_PUFE, z: pufe.z + uz * CHEGADA_PUFE },
    yaw: pufe.rot,
    obstaculos: [{ x: pufe.x, z: pufe.z, r: RAIO_PUFE }],
  };
}

// Em pé na frente da mesa do café, olhando para ela. A mesa é obstáculo à parte (obstaculosDaMobilia).
function lugarNoCafe(cafe, { id, x }) {
  const assento = pontoLocal(cafe, x, ASSENTO_CAFE);
  return {
    id,
    ...assento,
    rot: cafe.rot,
    tipo: 'cafe',
    especial: true,
    emPe: true,
    trajetoDireto: true,
    semBloco: true,
    assento,
    aprox: pontoLocal(cafe, x, CHEGADA_CAFE),
    yaw: cafe.rot + Math.PI,
    obstaculos: [],
  };
}

/**
 * Todas as estações da forma do tapete: as mesas, os pufes e os dois lugares do café.
 * @param {boolean} retrato
 * @returns {BaseEstacao[]}
 */
export function basesDaPlanta(retrato) {
  const { mesas, cafe, pufes } = planta(retrato);
  return [...mesas, ...pufes.map(lugarNoPufe), ...LUGARES_CAFE.map((lugar) => lugarNoCafe(cafe, lugar))];
}

/** Marca dos obstáculos do cenário (a mesa do café) na lista de Suporte/boneco/estacoes.js. */
export const MARCA_MOBILIA = 'cenario-compilacao';

/**
 * A mesa do café como obstáculo: dois círculos ao longo do tampo (r já soma o corpo).
 * @param {boolean} retrato
 */
export function obstaculosDaMobilia(retrato) {
  const { cafe } = planta(retrato);
  return [-0.4, 0.4].map((x) => ({ ...pontoLocal(cafe, x, 0), r: 0.75, estacao: MARCA_MOBILIA }));
}
