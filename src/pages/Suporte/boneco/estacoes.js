/*
 * Estações de trabalho do tapete: configuração e regras. Única fonte da verdade,
 * lida tanto pelo desenho (EstacoesTrabalho) quanto pelo comportamento do boneco.
 *
 * Bloco 2×2 no centro, fileiras frente a frente e monitores costas com costas:
 *   e1 | e2   ← fileira de trás (técnico sentado de frente para a câmera)
 *   e3 | e4   ← fileira da frente (técnico sentado de costas para a câmera)
 *
 * Convenção: rot é o giro da mesa em Y. A tela fica voltada para +z local e a
 * cadeira fica em +z local (lado de quem senta).
 */

/**
 * @typedef {object} Estacao
 * @property {string} id
 * @property {number} x
 * @property {number} z
 * @property {number} rot
 * @property {string | null} ocupante           id do técnico que reservou ou está usando
 * @property {{ x: number, z: number }} assento onde o técnico fica sentado
 * @property {{ x: number, z: number }} aprox   onde ele chega andando antes de sentar
 * @property {number} yaw                       direção em que ele olha sentado (para o monitor)
 */

const BASES = [
  { id: 'e1', x: -0.8, z: -0.4, rot: Math.PI },
  { id: 'e2', x: 0.8, z: -0.4, rot: Math.PI },
  { id: 'e3', x: -0.8, z: 0.4, rot: 0 },
  { id: 'e4', x: 0.8, z: 0.4, rot: 0 },
];

// Ponto local (lx, lz) da estação em coordenadas do mundo.
export function pontoLocal(estacao, lx, lz) {
  const c = Math.cos(estacao.rot);
  const s = Math.sin(estacao.rot);
  return { x: estacao.x + lx * c + lz * s, z: estacao.z - lx * s + lz * c };
}

/** @type {Estacao[]} */
export const ESTACOES = BASES.map((base) => ({
  ...base,
  ocupante: null,
  assento: pontoLocal(base, 0, 0.64),
  aprox: pontoLocal(base, 0, 1.5),
  yaw: base.rot + Math.PI,
}));

// Todos podem trabalhar ao mesmo tempo (1 técnico por computador).
export const MAX_SENTADOS = ESTACOES.length;

// Obstáculos (círculos) que os técnicos contornam e nunca atravessam.
// r é a distância mínima entre o centro do técnico e o centro do círculo;
// com r = 0 o obstáculo está desligado (ex.: o corredor do quadro, fechado);
// com `suave`, quem está dentro sai aos poucos, em vez de ir direto para a borda.
// O quadro da equipe acrescenta os dele a esta lista (quadro/posicao.js).
export const OBSTACULOS = ESTACOES.flatMap((estacao) => [
  { ...pontoLocal(estacao, -0.45, 0), r: 0.78, estacao: estacao.id }, // metade esquerda da mesa
  { ...pontoLocal(estacao, 0.45, 0), r: 0.78, estacao: estacao.id }, // metade direita da mesa
  { ...pontoLocal(estacao, 0, 0.78), r: 0.6, estacao: estacao.id }, // cadeira
]);

// O ponto está dentro da elipse da área livre? A folga encolhe a elipse.
export const dentroDaArea = (area, ponto, folga = 0) =>
  (ponto.x / (area.rx - folga)) ** 2 + (ponto.z / (area.rz - folga)) ** 2 <= 1;

export const longeDosObstaculos = (ponto, margem = 0.3) =>
  OBSTACULOS.every((o) => o.r <= 0 || Math.hypot(ponto.x - o.x, ponto.z - o.z) > o.r + margem);

// Retângulo que envolve os obstáculos das estações (calculado antes de o quadro
// acrescentar os dele), e a folga com que os técnicos o contornam.
const BLOCO = {
  minX: Math.min(...OBSTACULOS.map((o) => o.x - o.r)),
  maxX: Math.max(...OBSTACULOS.map((o) => o.x + o.r)),
  minZ: Math.min(...OBSTACULOS.map((o) => o.z - o.r)),
  maxZ: Math.max(...OBSTACULOS.map((o) => o.z + o.r)),
};
const FOLGA_CONTORNO = 0.5;
const CANTOS = [
  { x: BLOCO.minX - FOLGA_CONTORNO, z: BLOCO.minZ - FOLGA_CONTORNO },
  { x: BLOCO.maxX + FOLGA_CONTORNO, z: BLOCO.minZ - FOLGA_CONTORNO },
  { x: BLOCO.minX - FOLGA_CONTORNO, z: BLOCO.maxZ + FOLGA_CONTORNO },
  { x: BLOCO.maxX + FOLGA_CONTORNO, z: BLOCO.maxZ + FOLGA_CONTORNO },
];

const dentroDoBloco = (p) => p.x > BLOCO.minX && p.x < BLOCO.maxX && p.z > BLOCO.minZ && p.z < BLOCO.maxZ;

// Trecho [t0, t1] do segmento a→b que fica dentro da faixa [min, max] de um eixo; null se nenhum.
function recortar(origem, delta, min, max, t0, t1) {
  if (Math.abs(delta) < 1e-9) return origem > min && origem < max ? [t0, t1] : null;
  const ta = (min - origem) / delta;
  const tb = (max - origem) / delta;
  const entrada = Math.max(t0, Math.min(ta, tb));
  const saida = Math.min(t1, Math.max(ta, tb));
  return entrada < saida ? [entrada, saida] : null;
}

function cruzaBloco(a, b) {
  const emX = recortar(a.x, b.x - a.x, BLOCO.minX, BLOCO.maxX, 0, 1);
  return !!emX && !!recortar(a.z, b.z - a.z, BLOCO.minZ, BLOCO.maxZ, emX[0], emX[1]);
}

const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Para cada canto, os dois ligados a ele por um lado livre do retângulo.
const VIZINHOS = [[1, 2], [0, 3], [0, 3], [1, 2]];
// Perto assim de um canto, o técnico já o alcançou e segue para o próximo.
const CANTO_ALCANCADO = 0.35;

// Distância de cada canto até o alvo, dando a volta pelos cantos vizinhos quando preciso.
function distanciasAteAlvo(alvo) {
  const ate = CANTOS.map((canto) => (cruzaBloco(canto, alvo) ? Infinity : distancia(canto, alvo)));
  for (let volta = 0; volta < 2; volta++) {
    CANTOS.forEach((canto, i) => {
      for (const j of VIZINHOS[i]) ate[i] = Math.min(ate[i], distancia(canto, CANTOS[j]) + ate[j]);
    });
  }
  return ate;
}

/*
 * Caminho até o alvo: para onde mirar agora e quanto falta andar. Mira o próprio
 * alvo ou, com o bloco de estações no meio, o próximo canto do caminho mais curto
 * em volta dele. Sem isso, quem vai para o outro lado do bloco fica empurrando
 * as mesas e nunca chega.
 */
export function rotaAte(pos, alvo) {
  // Sem estações (cenário vazio) não há bloco para contornar.
  if (!ESTACOES.length || dentroDoBloco(alvo) || !cruzaBloco(pos, alvo)) return { ponto: alvo, comprimento: distancia(pos, alvo) };

  const ateAlvo = distanciasAteAlvo(alvo);
  let melhor = alvo;
  let comprimento = distancia(pos, alvo);
  let menorCusto = Infinity;
  CANTOS.forEach((canto, i) => {
    const ateCanto = distancia(pos, canto);
    if (ateCanto < CANTO_ALCANCADO) return;
    // Cantos escondidos atrás do bloco só servem se não houver outro.
    const custo = ateCanto + ateAlvo[i] + (cruzaBloco(pos, canto) ? 100 : 0);
    if (custo < menorCusto) {
      menorCusto = custo;
      melhor = canto;
      comprimento = ateCanto + ateAlvo[i];
    }
  });
  return { ponto: melhor, comprimento };
}

/*
 * Reserva exclusiva: 1 técnico por computador. Acontece na decisão de ir
 * trabalhar, antes de andar até lá, então dois técnicos nunca disputam o mesmo PC.
 */
export function reservarEstacao(idTecnico, area) {
  if (ESTACOES.some((e) => e.ocupante === idTecnico)) return null;
  const ocupadas = ESTACOES.filter((e) => e.ocupante !== null).length;
  if (ocupadas >= MAX_SENTADOS) return null;
  const livres = ESTACOES.filter((e) => e.ocupante === null && dentroDaArea(area, e.aprox, 0.2));
  if (!livres.length) return null;
  const estacao = livres[Math.floor(Math.random() * livres.length)];
  estacao.ocupante = idTecnico;
  return estacao;
}

// Libera a estação do técnico (levantou, desistiu, foi selecionado andando, desmontou).
export function liberarEstacao(estadoTecnico) {
  if (!estadoTecnico) return;
  const { estacao } = estadoTecnico;
  if (estacao && estacao.ocupante === estadoTecnico.id) estacao.ocupante = null;
  estadoTecnico.estacao = null;
  estadoTecnico.indo = false;
}

// O técnico ainda é o dono da estação em que está sentado?
export const aindaEDono = (estadoTecnico) =>
  !!estadoTecnico.estacao && estadoTecnico.estacao.ocupante === estadoTecnico.id;

/*
 * Cenário vazio: tira as estações e todos os obstáculos, inclusive os que outros
 * módulos acrescentaram (o quadro da equipe). Os bonecos passam a só andar e
 * fazer ações. Vale para a página inteira e é chamado uma vez, antes de a cena
 * nascer (pages/Desenvolvimento).
 */
export function esvaziarCenario() {
  ESTACOES.length = 0;
  OBSTACULOS.length = 0;
}

// Zera todas as reservas (hot reload e testes).
export function resetarEstacoes() {
  ESTACOES.forEach((estacao) => {
    estacao.ocupante = null;
  });
}
