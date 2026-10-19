/*
 * Quadro da equipe (cavalete): posição no tapete e área que ele ocupa no chão.
 * Fica na borda do tapete, virado para a câmera, para as anotações ficarem
 * legíveis, e muda de lugar em tela retrato (celular).
 */
import { ESTACOES, OBSTACULOS } from '../boneco/estacoes.js';
import { AREA } from '../store.js';

const GRAUS = Math.PI / 180;

// Quanto o tapete passa da área de caminhada (o disco creme de Cenario.jsx).
const MARGEM_TAPETE = 1.7;

// Posição aproximada da câmera na visão geral: o quadro "olha" para ela.
const CAMERA = { x: 0, z: 14 };

/*
 * "Corredor de visão" (corredorPaisagem / corredorRetrato): com o painel aberto,
 * esta área na frente do quadro cresce devagar e os técnicos saem da frente com
 * suavidade. O centro do 1º círculo fica dentro da pegada do cavalete (que chega
 * a z ≈ 0,55 na frente): assim quem está encostado no quadro é empurrado para
 * longe dele, e nunca contra ele. Em retrato o corredor é curto, para não
 * invadir as estações que ficam entre o quadro e a câmera. Cada página pode
 * trocar o corredor (configurarQuadro) para ele não cair em cima das mesas dela.
 */
export const CONFIG_QUADRO = {
  escala: 1,
  // Quanto o pé do cavalete entra no tapete a partir da borda (m).
  recuo: 1.15,
  // Ponto da borda do tapete, em graus: 0 = direita, −90 = fundo, 180 = esquerda.
  anguloPaisagem: -50, // fundo, à direita
  anguloRetrato: -90, // fundo, centralizado
  // Círculos do corredor, no espaço local do quadro (+z na frente dele).
  corredorPaisagem: [
    { x: 0, z: 0.5, rMax: 2.5 },
    { x: 0, z: 4.6, rMax: 1.4 },
  ],
  corredorRetrato: [
    { x: 0, z: 0.5, rMax: 1.6 },
    { x: 0, z: 0.5, rMax: 0 },
  ],
};

// Onde o quadro está agora. Mutado por posicionarQuadro e lido pela câmera a cada frame.
export const QUADRO = { x: 0, z: 0, rot: 0 };

// Pegada do cavalete no chão: círculos no espaço local do quadro.
const PEGADA = [
  { x: -0.85, z: 0.15, r: 0.75 },
  { x: 0, z: -0.2, r: 0.8 },
  { x: 0.85, z: 0.15, r: 0.75 },
];

// Rapidez com que o corredor abre e fecha, e com que a pegada cresce quando o quadro muda de lugar.
const RAPIDEZ_CORREDOR = 1.6;
const RAPIDEZ_PEGADA = 6;
// Mudança de posição (m) a partir da qual o quadro "mudou de lugar".
const MUDOU_DE_LUGAR = 0.01;
// A borda do corredor nunca chega a menos disto de uma mesa, cadeira ou ponto de chegada:
// senão a mesa expulsa e o corredor empurra de volta, e o técnico termina dentro da mesa.
const FOLGA_CORREDOR = 0.3;

// Entram na lista que os técnicos contornam. O corredor é suave: quem está dentro
// sai andando, em vez de ser jogado para a borda (aplicarLimites, em useComportamento.js).
const pegada = PEGADA.map(() => ({ x: 0, z: 0, r: 0, estacao: 'quadro' }));
const corredor = [0, 1].map(() => ({ x: 0, z: 0, r: 0, estacao: 'quadro-corredor', suave: true }));
OBSTACULOS.push(...pegada, ...corredor);

let corredorLocal = CONFIG_QUADRO.corredorPaisagem;

const aproximar = (obstaculo, alvo, rapidez, dt) => {
  obstaculo.r += (alvo - obstaculo.r) * (1 - Math.exp(-rapidez * dt));
  if (obstaculo.r < 0.01 && alvo === 0) obstaculo.r = 0;
};

const ehDoQuadro = (o) => o.estacao === 'quadro' || o.estacao === 'quadro-corredor';

/**
 * Raio que o trecho i do corredor tem quando aberto: o configurado, limitado para a
 * borda ficar a FOLGA_CORREDOR de toda pegada de estação e de todo ponto de chegada,
 * em qualquer orientação (rede de segurança para a configuração de cada página).
 * @param {number} i
 */
export function raioDoCorredor(i) {
  const trecho = corredorLocal[i];
  if (!trecho || trecho.rMax <= 0) return 0;
  const c = corredor[i];
  let r = trecho.rMax;
  for (const o of OBSTACULOS) {
    if (o.r <= 0 || ehDoQuadro(o)) continue;
    r = Math.min(r, Math.hypot(c.x - o.x, c.z - o.z) - o.r - FOLGA_CORREDOR);
  }
  for (const { aprox } of ESTACOES) r = Math.min(r, Math.hypot(c.x - aprox.x, c.z - aprox.z) - FOLGA_CORREDOR);
  return Math.max(0, r);
}

// Os círculos do corredor (centro no mundo e raio quando aberto), para os testes.
export const corredorAberto = () => corredor.map((c, i) => ({ x: c.x, z: c.z, r: raioDoCorredor(i) }));

// A cada frame: o corredor abre ou fecha devagar e a pegada cresce até o tamanho dela.
export function atualizarObstaculos(dt, aberto) {
  corredor.forEach((obstaculo, i) => {
    aproximar(obstaculo, aberto ? raioDoCorredor(i) : 0, RAPIDEZ_CORREDOR, dt);
  });
  pegada.forEach((obstaculo, i) => {
    aproximar(obstaculo, PEGADA[i].r * CONFIG_QUADRO.escala, RAPIDEZ_PEGADA, dt);
  });
}

/**
 * Coloca o quadro na borda do tapete e leva os obstáculos dele junto. Se o quadro
 * mudou de lugar (a tela girou), os obstáculos recomeçam do zero e crescem de
 * novo em atualizarObstaculos: quem estiver no lugar novo sai aos poucos, sem
 * ser jogado de uma vez. No mesmo lugar, eles ficam como estão.
 * @param {{ rx: number, rz: number }} area área de caminhada atual (store.js)
 * @param {boolean} retrato
 */
export function posicionarQuadro(area, retrato) {
  const antes = { ...QUADRO };
  const angulo = GRAUS * (retrato ? CONFIG_QUADRO.anguloRetrato : CONFIG_QUADRO.anguloPaisagem);
  const rx = area.rx + MARGEM_TAPETE;
  const rz = area.rz + MARGEM_TAPETE;

  // Ponto da borda da elipse e a normal dela ali, apontando para fora.
  const bordaX = rx * Math.cos(angulo);
  const bordaZ = rz * Math.sin(angulo);
  const normalX = Math.cos(angulo) / rx;
  const normalZ = Math.sin(angulo) / rz;
  const norma = Math.hypot(normalX, normalZ);

  QUADRO.x = bordaX - (normalX / norma) * CONFIG_QUADRO.recuo;
  QUADRO.z = bordaZ - (normalZ / norma) * CONFIG_QUADRO.recuo;
  QUADRO.rot = Math.atan2(CAMERA.x - QUADRO.x, CAMERA.z - QUADRO.z);

  const cos = Math.cos(QUADRO.rot);
  const sen = Math.sin(QUADRO.rot);
  const noMundo = (local, obstaculo) => {
    obstaculo.x = QUADRO.x + local.x * cos + local.z * sen;
    obstaculo.z = QUADRO.z - local.x * sen + local.z * cos;
  };

  PEGADA.forEach((local, i) => noMundo(local, pegada[i]));
  corredorLocal = retrato ? CONFIG_QUADRO.corredorRetrato : CONFIG_QUADRO.corredorPaisagem;
  corredor.forEach((obstaculo, i) => noMundo(corredorLocal[i] ?? { x: 0, z: 0 }, obstaculo));

  if (Math.hypot(QUADRO.x - antes.x, QUADRO.z - antes.z) > MUDOU_DE_LUGAR) removerQuadro();

  return { ...QUADRO };
}

// Tira o quadro do caminho dos técnicos (mudou de lugar, ou a cena saiu da tela).
export function removerQuadro() {
  [...pegada, ...corredor].forEach((obstaculo) => {
    obstaculo.r = 0;
  });
}

// Já no carregamento o quadro ocupa o lugar dele em paisagem (a área padrão de
// store.js), com a pegada inteira: nenhum técnico é sorteado em cima do cavalete.
function colocarNoLugar() {
  posicionarQuadro(AREA, false);
  PEGADA.forEach((local, i) => {
    pegada[i].r = local.r * CONFIG_QUADRO.escala;
  });
}

/**
 * Troca partes da configuração (uma página com outro corredor, por exemplo) e
 * recoloca o quadro. Chamar antes de os bonecos nascerem.
 * @param {Partial<typeof CONFIG_QUADRO>} config
 */
export function configurarQuadro(config) {
  Object.assign(CONFIG_QUADRO, config);
  colocarNoLugar();
}

colocarNoLugar();
