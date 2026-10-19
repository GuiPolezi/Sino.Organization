/*
 * As seis mesas de trabalho de /desenvolvimento: onde ficam no tapete.
 *
 * No meio, um bloco de quatro como o do suporte (duas coladas lado a lado e
 * mais duas na frente, monitores costas com costas), um pouco à direita do
 * centro. Nas pontas da esquerda, duas mesas soltas: uma no fundo e outra na
 * frente, como um cantinho de trabalho. O quadro da equipe fica no fundo à
 * direita, e a frente à direita fica livre para a equipe circular. A direita é
 * evitada de propósito: com o painel aberto, o quadro abre um "corredor" ali
 * (quadro/posicao.js) que empurraria quem fosse sentar; o corredor desta
 * página (CORREDOR_DEV) é mais curto que o padrão, para não cair sobre o bloco.
 *
 * O ponto de aproximação (1,5 m na frente da cadeira) tem de cair dentro da
 * área de caminhada, senão ninguém senta: por isso a mesa solta do fundo tem a
 * cadeira voltada para a câmera (o dev trabalha de costas, com a tela à vista)
 * e a da frente tem a cadeira voltada para o fundo (o dev trabalha de frente
 * para a câmera), um pouco mais virada para fora, para o ponto de chegada sair
 * do vão entre ela e o bloco. As posições foram conferidas contra a pegada e o
 * corredor do quadro e contra a elipse, nas duas formas do tapete
 * (estacoes.test.mjs).
 */

/** @import { BaseEstacao } from '../../Suporte/boneco/estacoes.js' */

/*
 * O tapete desta página é maior que o de /suporte: são dez desenvolvedores e
 * seis mesas. O tapete creme tem 9,3 × 5,9 m (5,6 × 7,0 em retrato) e a equipe
 * anda até 0,55 m da borda dele (no /suporte, a área para 1,7 m antes). A
 * câmera recua 1,32×, para o tapete inteiro, com a borda escura, caber numa
 * tela 16:9 como 1536 × 864 (store.js, configurarCena).
 */
export const CENA_DEV = {
  areaPaisagem: { rx: 8.75, rz: 5.35 },
  areaRetrato: { rx: 5.05, rz: 6.45 },
  margemTapete: 0.55,
  recuo: 1.32,
};

// Giro em Y: 0 = cadeira para a câmera (+z); π = cadeira para o fundo.
const bloco = (cx, cz) => [
  { id: 'dev-b1', x: cx - 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'dev-b2', x: cx + 0.8, z: cz - 0.4, rot: Math.PI },
  { id: 'dev-b3', x: cx - 0.8, z: cz + 0.4, rot: 0 },
  { id: 'dev-b4', x: cx + 0.8, z: cz + 0.4, rot: 0 },
];

// O bloco em x 0,6 deixa o canto traseiro-direito dele longe do pé do quadro.
const PAISAGEM = [
  { id: 'dev-fundo', x: -4.4, z: -2.9, rot: 0.45 },
  { id: 'dev-frente', x: -4.2, z: 1.85, rot: Math.PI - 0.25 },
  ...bloco(0.6, 0),
];

/**
 * Corredor do quadro em paisagem (quadro/posicao.js, espaço local do quadro):
 * mais curto que o padrão de /suporte, para a borda dele não cair sobre a mesa
 * e a cadeira da direita do bloco.
 */
export const CORREDOR_DEV = [
  { x: 0, z: 0.5, rMax: 2.0 },
  { x: 0, z: 4.6, rMax: 0.85 },
];

// Em retrato o tapete é estreito e alto, e o quadro fica no fundo, no centro.
const RETRATO = [
  { id: 'dev-fundo', x: -2.6, z: -3.5, rot: 0.3 },
  { id: 'dev-frente', x: 2.6, z: 3.5, rot: Math.PI - 0.3 },
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
