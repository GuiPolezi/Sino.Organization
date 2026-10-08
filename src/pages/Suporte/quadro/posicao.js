/*
 * Quadro da equipe (cavalete): posição no tapete e área que ele ocupa no chão.
 * Fica na borda do tapete, virado para a câmera, para as anotações ficarem
 * legíveis, e muda de lugar em tela retrato (celular).
 */
import { OBSTACULOS } from '../boneco/estacoes.js';

const GRAUS = Math.PI / 180;

// Quanto o tapete passa da área de caminhada (o disco creme de Cenario.jsx).
const MARGEM_TAPETE = 1.7;

// Posição aproximada da câmera na visão geral: o quadro "olha" para ela.
const CAMERA = { x: 0, z: 14 };

export const CONFIG_QUADRO = {
  escala: 1,
  // Quanto o pé do cavalete entra no tapete a partir da borda (m).
  recuo: 1.15,
  // Ponto da borda do tapete, em graus: 0 = direita, −90 = fundo, 180 = esquerda.
  anguloPaisagem: -50, // fundo, à direita
  anguloRetrato: -90, // fundo, centralizado
};

// Onde o quadro está agora. Mutado por posicionarQuadro e lido pela câmera a cada frame.
export const QUADRO = { x: 0, z: 0, rot: 0 };

// Pegada do cavalete no chão: círculos no espaço local do quadro.
const PEGADA = [
  { x: -0.85, z: 0.15, r: 0.75 },
  { x: 0, z: -0.2, r: 0.8 },
  { x: 0.85, z: 0.15, r: 0.75 },
];

/*
 * "Corredor de visão": com o painel aberto, esta área na frente do quadro cresce
 * devagar e os técnicos saem da frente com suavidade. O centro do 1º círculo
 * fica dentro da pegada do cavalete (que chega a z ≈ 0,55 na frente): assim quem
 * está encostado no quadro é empurrado para longe dele, e nunca contra ele.
 * Em retrato o corredor é curto, para não invadir as estações que ficam entre
 * o quadro e a câmera.
 */
const CORREDOR = {
  paisagem: [
    { x: 0, z: 0.5, rMax: 2.5 },
    { x: 0, z: 4.6, rMax: 1.4 },
  ],
  retrato: [
    { x: 0, z: 0.5, rMax: 1.6 },
    { x: 0, z: 0.5, rMax: 0 },
  ],
};
// Rapidez com que o corredor abre e fecha.
const RAPIDEZ_CORREDOR = 1.6;

// Entram desligados (r = 0) na lista que os técnicos contornam; posicionarQuadro os liga.
const pegada = PEGADA.map(() => ({ x: 0, z: 0, r: 0, estacao: 'quadro' }));
const corredor = CORREDOR.paisagem.map(() => ({ x: 0, z: 0, r: 0, estacao: 'quadro-corredor' }));
OBSTACULOS.push(...pegada, ...corredor);

let corredorLocal = CORREDOR.paisagem;

export function atualizarCorredor(dt, aberto) {
  const k = 1 - Math.exp(-RAPIDEZ_CORREDOR * dt);
  corredor.forEach((obstaculo, i) => {
    const alvo = aberto ? corredorLocal[i].rMax : 0;
    obstaculo.r += (alvo - obstaculo.r) * k;
    if (obstaculo.r < 0.01) obstaculo.r = 0;
  });
}

/**
 * Coloca o quadro na borda do tapete e atualiza os obstáculos dele.
 * @param {{ rx: number, rz: number }} area área de caminhada atual (store.js)
 * @param {boolean} retrato
 */
export function posicionarQuadro(area, retrato) {
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

  PEGADA.forEach((local, i) => {
    noMundo(local, pegada[i]);
    pegada[i].r = local.r * CONFIG_QUADRO.escala;
  });
  corredorLocal = retrato ? CORREDOR.retrato : CORREDOR.paisagem;
  corredorLocal.forEach((local, i) => noMundo(local, corredor[i]));

  return { ...QUADRO };
}

// Tira o quadro do caminho dos técnicos (a cena saiu da tela).
export function removerQuadro() {
  [...pegada, ...corredor].forEach((obstaculo) => {
    obstaculo.r = 0;
  });
}
