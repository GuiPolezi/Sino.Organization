/*
 * Cenário de reunião: a planta (só dados, sem React nem three.js).
 *
 * Tapete elíptico de 14 × 10 m. No fundo, uma parede de vidro contínua em arco,
 * com uma paisagem viva atrás e o logo da empresa; o quadro com o título da
 * reunião; a luminária de pé; a mesa com até 6 cadeiras; os pufes nas laterais.
 * Cadeiras e pufes aparecem conforme a quantidade de membros (montarLugares) e
 * o céu muda conforme a hora da reunião (temaHorario.js).
 *
 * Eixos: +x direita · +z frente (câmera) · y altura · 1 unidade = 1 m.
 */

export const TAPETE = { rx: 7, rz: 5 };

/*
 * Logo da empresa, desenhado num canvas. tipo 'anel': quadrado arredondado
 * vazado. `imagem` (URL de PNG/SVG com fundo transparente, com CORS) tem
 * prioridade; `texto` troca o desenho por letras.
 */
export const LOGO = {
  tipo: 'anel',
  cor: '#1F7A4D',
  imagem: null,
  texto: null,
  // Trecho da parede (0 = o da esquerda), posição nele (m, a partir do centro), tamanho e giro.
  trecho: 8,
  x: 0,
  y: 1.7,
  tamanho: 1.15,
  giro: 0.18,
};

// ── Parede de vidro: uma só, em arco, acompanhando a borda de trás do tapete ──
// Dividida em trechos retos (como uma fachada de verdade), sem espaço entre eles.
export const ESCALA_ARCO = 0.97;
export const PAREDE = { de: 164, ate: 16, trechos: 10 }; // graus: 90° = fundo no centro
export const VIDRO = { altura: 2.9, espessuraMoldura: 0.09 };

// Ponto do arco no ângulo g (graus), `extra` metros além dele.
export const noArco = (g, extra = 0) => {
  const a = (g * Math.PI) / 180;
  return {
    x: (TAPETE.rx * ESCALA_ARCO + extra) * Math.cos(a),
    z: -(TAPETE.rz * ESCALA_ARCO + extra) * Math.sin(a),
  };
};

export const PAINEIS = Array.from({ length: PAREDE.trechos }, (_, i) => {
  const passo = (PAREDE.ate - PAREDE.de) / PAREDE.trechos;
  const a = noArco(PAREDE.de + passo * i);
  const b = noArco(PAREDE.de + passo * (i + 1));
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return {
    indice: i,
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
    largura: Math.hypot(dx, dz),
    rot: Math.atan2(-dz, dx), // x local ao longo do trecho (esquerda → direita)
    primeiro: i === 0,
    ultimo: i === PAREDE.trechos - 1,
  };
});

// Fundo pintado (céu, morros, campo): distância atrás do vidro e altura.
export const NATUREZA = { afastamento: 2.4, altura: 5.5 };

// ── Mesa de reunião ──
export const MESA = { x: 0, z: -0.5, comp: 2.4, larg: 1.2, altura: 0.76 };

/*
 * Lugares à mesa, no formato das estações (Suporte/boneco/estacoes.js):
 * x, z = ponto na BORDA da mesa; rot = giro para o lado de fora (a cadeira fica em +z local).
 */
const { x: MX, z: MZ, comp: MC, larg: ML } = MESA;
export const LUGARES_MESA = {
  r1: { id: 'r1', x: MX - 0.6, z: MZ - ML / 2, rot: Math.PI }, // fundo, esquerda (de frente para a câmera)
  r2: { id: 'r2', x: MX + 0.6, z: MZ - ML / 2, rot: Math.PI }, // fundo, direita
  r3: { id: 'r3', x: MX - MC / 2, z: MZ, rot: -Math.PI / 2 }, // cabeceira esquerda (de perfil)
  r4: { id: 'r4', x: MX + MC / 2, z: MZ, rot: Math.PI / 2 }, // cabeceira direita
  r5: { id: 'r5', x: MX - 0.6, z: MZ + ML / 2, rot: 0 }, // frente, esquerda (de costas para a câmera)
  r6: { id: 'r6', x: MX + 0.6, z: MZ + ML / 2, rot: 0 }, // frente, direita
};

/*
 * Quadro (cavalete) e luminária: no fundo, perto do vidro. Ficam ~0,5 m mais
 * para trás que no esboço (z −3,0 e −3,25): ali eles fechavam o corredor atrás da
 * mesa, e ninguém chegava às cadeiras do fundo (r1 e r2) com as cabeceiras
 * ocupadas (simulação dos bonecos: 0 vezes em 10 min com 4 membros).
 */
const xQuadro = 2.5;
const zQuadro = -3.55;
// De frente para a câmera da visão geral (em z = 14).
export const QUADRO_REUNIAO = { x: xQuadro, z: zQuadro, rot: Math.atan2(0 - xQuadro, 14 - zQuadro) };

// ── Luminária de pé (acende no entardecer e à noite) ──
export const LUMINARIA = { x: -2.6, z: -3.75 };

// Pegada do cavalete no espaço dele (+z à frente): as três pernas e o meio, sob a lousa.
const PEGADA_QUADRO = [
  { x: -0.9, z: 0.45, r: 0.4 },
  { x: 0.9, z: 0.45, r: 0.4 },
  { x: 0, z: -0.85, r: 0.4 },
  { x: 0, z: 0, r: 0.7 },
];
const noQuadro = ({ x, z, r }) => {
  const c = Math.cos(QUADRO_REUNIAO.rot);
  const s = Math.sin(QUADRO_REUNIAO.rot);
  return { x: QUADRO_REUNIAO.x + x * c + z * s, z: QUADRO_REUNIAO.z - x * s + z * c, r };
};

// ── Pufes, na ordem em que aparecem. forma: 'baixo' (redondo) ou 'alto' (com encosto) ──
export const POLTRONAS = [
  { id: 'p1', x: -4.4, z: -1.5, cor: '#1E88B8', forma: 'baixo', rot: 0.5 },
  { id: 'p2', x: 4.2, z: -0.4, cor: '#E25656', forma: 'baixo', rot: -0.3 },
  { id: 'p3', x: 5.15, z: -1.55, cor: '#E25656', forma: 'alto', rot: -0.7 },
  { id: 'p4', x: -4.2, z: 0.55, cor: '#F2B632', forma: 'baixo', rot: 0.9 },
  { id: 'p5', x: 4.3, z: 1.45, cor: '#5DAA4F', forma: 'baixo', rot: -1.0 },
  { id: 'p6', x: -5.25, z: -0.55, cor: '#1E88B8', forma: 'alto', rot: 1.1 },
];

/*
 * Quantos lugares mostrar para N membros:
 *   até 4      → só cadeiras (1 por membro): as do fundo e depois as cabeceiras
 *   5 a 10     → as 4 cadeiras + 1 pufe por membro além de 4
 *   11 e 12    → mais as 2 cadeiras da frente
 *   acima de 12 → os demais ficam em pé, andando pela sala
 */
export const ORDEM_CADEIRAS = ['r1', 'r2', 'r3', 'r4'];
export const CADEIRAS_EXTRAS = ['r5', 'r6'];

/**
 * @param {number} membros
 * @returns {{ cadeiras: string[], poltronas: string[], emPe: number }}
 */
export function montarLugares(membros) {
  const n = Math.max(0, Math.floor(Number(membros) || 0));
  const cadeiras = ORDEM_CADEIRAS.slice(0, Math.min(n, ORDEM_CADEIRAS.length));
  const resto = n - cadeiras.length;
  const poltronas = POLTRONAS.slice(0, Math.max(0, Math.min(resto, POLTRONAS.length))).map(({ id }) => id);
  const resto2 = resto - poltronas.length;
  const extras = CADEIRAS_EXTRAS.slice(0, Math.max(0, Math.min(resto2, CADEIRAS_EXTRAS.length)));
  return {
    cadeiras: [...cadeiras, ...extras],
    poltronas,
    emPe: Math.max(0, resto2 - extras.length),
  };
}

/*
 * Obstáculos fixos (círculos que os bonecos contornam; r já inclui o corpo).
 * As cadeiras e os pufes ATIVOS entram pela pegada de cada lugar (lugares.js).
 */
export const OBSTACULOS_FIXOS = [
  // tampo da mesa
  { x: MX - 0.6, z: MZ, r: 1.0 },
  { x: MX + 0.6, z: MZ, r: 1.0 },
  // cavalete e luminária (a base tem 0,25 m de raio; r soma o corpo)
  ...PEGADA_QUADRO.map(noQuadro),
  { x: LUMINARIA.x, z: LUMINARIA.z, r: 0.55 },
  // parede de vidro: círculos ao longo de cada trecho, para ninguém encostar nele
  ...PAINEIS.flatMap((p) =>
    [-0.35, 0, 0.35].map((f) => ({
      x: p.x + Math.cos(p.rot) * f * p.largura,
      z: p.z - Math.sin(p.rot) * f * p.largura,
      r: 0.5,
    })),
  ),
];
