/*
 * As seis mesas de trabalho de /desenvolvimento: onde ficam no tapete.
 *
 * No meio, um bloco de quatro como o do suporte (duas coladas lado a lado e
 * mais duas na frente, monitores costas com costas), um pouco à direita do
 * centro. Nas pontas da esquerda, duas mesas soltas: uma no fundo e outra na
 * frente, como um cantinho de trabalho. O quadro da equipe fica no fundo à
 * direita, e a frente à direita fica livre para a equipe circular. A direita é
 * evitada de propósito: com o painel aberto, o quadro abre um "corredor" ali
 * (quadro/posicao.js) que empurraria quem fosse sentar.
 *
 * O ponto de aproximação (1,5 m na frente da cadeira) tem de cair dentro da
 * área de caminhada, senão ninguém senta: por isso a mesa solta do fundo tem a
 * cadeira voltada para a câmera (o dev trabalha de costas, com a tela à vista)
 * e a da frente tem a cadeira voltada para o fundo (o dev trabalha de frente
 * para a câmera). As posições foram conferidas contra a pegada e o corredor do
 * quadro e contra a elipse, nas duas formas do tapete (estacoes.test.mjs).
 */

/** @import { BaseEstacao } from '../../Suporte/boneco/estacoes.js' */

// Giro em Y: 0 = cadeira para a câmera (+z); π = cadeira para o fundo.
const bloco = (cx, cz) => [
  { id: 'dev-b1', x: cx - 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'dev-b2', x: cx + 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'dev-b3', x: cx - 0.8, z: cz + 0.4, rot: 0 },
  { id: 'dev-b4', x: cx + 0.8, z: cz + 0.4, rot: 0 },
];

const PAISAGEM = [
  { id: 'dev-fundo', x: -3.6, z: -2.4, rot: 0.45 },
  { id: 'dev-frente', x: -3.4, z: 1.5, rot: Math.PI - 0.45 },
  ...bloco(0.8, 0),
];

// Em retrato o tapete é estreito e alto, e o quadro fica no fundo, no centro.
const RETRATO = [
  { id: 'dev-fundo', x: -2.2, z: -2.9, rot: 0.3 },
  { id: 'dev-frente', x: 2.2, z: 2.9, rot: Math.PI - 0.3 },
  ...bloco(0, 0),
];

/** Ids das mesas do bloco central. */
export const IDS_DO_BLOCO = bloco(0, 0).map(({ id }) => id);

/**
 * As mesas para a forma do tapete.
 * @param {boolean} retrato
 * @returns {BaseEstacao[]}
 */
export const basesDasMesas = (retrato) => (retrato ? RETRATO : PAISAGEM).map((base) => ({ ...base }));
