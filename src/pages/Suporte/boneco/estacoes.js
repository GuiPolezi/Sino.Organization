/*
 * Estações de trabalho do tapete: configuração e regras. Única fonte da verdade,
 * lida tanto pelo desenho (EstacoesTrabalho) quanto pelo comportamento do boneco.
 *
 * Cada página define as suas (definirEstacoes). A de /suporte nasce com o bloco
 * 2×2 do centro, fileiras frente a frente e monitores costas com costas:
 *   e1 | e2   ← fileira de trás (técnico sentado de frente para a câmera)
 *   e3 | e4   ← fileira da frente (técnico sentado de costas para a câmera)
 * A de /desenvolvimento põe duas mesas soltas em cantos do tapete.
 *
 * Convenção: rot é o giro da mesa em Y. A tela fica voltada para +z local e a
 * cadeira fica em +z local (lado de quem senta).
 */

/**
 * @typedef {object} BaseEstacao
 * @property {string} id
 * @property {number} x
 * @property {number} z
 * @property {number} rot
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
 * @property {number} [elevacao]                quanto o corpo sobe sentado (padrão: 0,17 da cadeira)
 * @property {boolean} [trajetoDireto]          senta indo reto da chegada ao assento (pufe, sem encosto)
 * @property {{ x: number, z: number, r: number }[]} [obstaculos] pegada própria (padrão: mesa e cadeira)
 * @property {boolean} [semBloco]                peça redonda e solta (pufe): os bonecos desviam dela
 *   como de um obstáculo, sem o retângulo de contorno das mesas
 */

/** O bloco 2×2 de /suporte. */
export const BASES_SUPORTE = [
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
export const ESTACOES = [];

// Obstáculos (círculos) que os técnicos contornam e nunca atravessam.
// r é a distância mínima entre o centro do técnico e o centro do círculo;
// com r = 0 o obstáculo está desligado (ex.: o corredor do quadro, fechado);
// com `suave`, quem está dentro sai aos poucos, em vez de ir direto para a borda.
// O quadro da equipe acrescenta os dele a esta lista (quadro/posicao.js).
export const OBSTACULOS = [];

// Pegada de uma estação no chão: as duas metades da mesa e a cadeira (ou a que a base trouxer).
const obstaculosDa = (estacao) =>
  estacao.obstaculos
    ? estacao.obstaculos.map((o) => ({ ...o, estacao: estacao.id }))
    : [
        { ...pontoLocal(estacao, -0.45, 0), r: 0.78, estacao: estacao.id },
        { ...pontoLocal(estacao, 0.45, 0), r: 0.78, estacao: estacao.id },
        { ...pontoLocal(estacao, 0, 0.78), r: 0.6, estacao: estacao.id },
      ];

// Assento, chegada e direção calculados pela mesa; a base pode trazer os seus (um pufe).
const montarEstacao = (base) => ({
  assento: pontoLocal(base, 0, 0.64),
  aprox: pontoLocal(base, 0, 1.5),
  yaw: base.rot + Math.PI,
  ...base,
  ocupante: null,
});

/*
 * Blocos que os técnicos contornam: retângulos em volta das pegadas, um por
 * grupo de estações encostadas (o 2×2 de /suporte é um bloco só; duas mesas
 * soltas são dois). Cada bloco guarda os cantos, por onde a rota dá a volta.
 */
const FOLGA_CONTORNO = 0.5;
let BLOCOS = [];

const retanguloDe = (obstaculos) => ({
  minX: Math.min(...obstaculos.map((o) => o.x - o.r)),
  maxX: Math.max(...obstaculos.map((o) => o.x + o.r)),
  minZ: Math.min(...obstaculos.map((o) => o.z - o.r)),
  maxZ: Math.max(...obstaculos.map((o) => o.z + o.r)),
});

const seTocam = (a, b) => a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ;

// Junta as pegadas que se tocam até não sobrar par encostado; cada grupo vira um bloco.
// Peças soltas (semBloco) ficam de fora: perto umas das outras, os retângulos delas se
// juntariam num bloco enorme, fechando um pedaço do chão que na verdade é livre.
function montarBlocos(estacoes) {
  let grupos = estacoes.filter((estacao) => !estacao.semBloco).map((estacao) => ({ ids: [estacao.id], ...retanguloDe(obstaculosDa(estacao)) }));
  let juntou = true;
  while (juntou) {
    juntou = false;
    for (let i = 0; i < grupos.length && !juntou; i += 1) {
      for (let j = i + 1; j < grupos.length; j += 1) {
        if (!seTocam(grupos[i], grupos[j])) continue;
        const [a, b] = [grupos[i], grupos[j]];
        const unido = {
          ids: [...a.ids, ...b.ids],
          minX: Math.min(a.minX, b.minX),
          maxX: Math.max(a.maxX, b.maxX),
          minZ: Math.min(a.minZ, b.minZ),
          maxZ: Math.max(a.maxZ, b.maxZ),
        };
        grupos = [...grupos.filter((_, k) => k !== i && k !== j), unido];
        juntou = true;
        break;
      }
    }
  }
  return grupos.map((bloco, indice) => ({
    ...bloco,
    indice,
    cantos: [
      { x: bloco.minX - FOLGA_CONTORNO, z: bloco.minZ - FOLGA_CONTORNO },
      { x: bloco.maxX + FOLGA_CONTORNO, z: bloco.minZ - FOLGA_CONTORNO },
      { x: bloco.minX - FOLGA_CONTORNO, z: bloco.maxZ + FOLGA_CONTORNO },
      { x: bloco.maxX + FOLGA_CONTORNO, z: bloco.maxZ + FOLGA_CONTORNO },
    ],
  }));
}

/**
 * Define as estações do cenário: refaz ESTACOES, os obstáculos delas e os
 * blocos de contorno. Os obstáculos de outros módulos (o quadro da equipe)
 * ficam. Chamada antes de a cena nascer e de novo se o tapete mudar de forma.
 *
 * Com `manterOcupantes`, uma estação que continua (mesmo id) é a mesma de antes,
 * com o mesmo ocupante: quem está sentado nela fica. Só quem estava numa que
 * saiu perde a reserva (e levanta). Sem a opção, todas recomeçam livres.
 * @param {BaseEstacao[]} bases
 * @param {{ manterOcupantes?: boolean }} [opcoes]
 * @returns {Estacao[]} as estações novas (o próprio ESTACOES)
 */
export function definirEstacoes(bases, { manterOcupantes = false } = {}) {
  const antigas = new Set(ESTACOES.map(({ id }) => id));
  const outros = OBSTACULOS.filter(({ estacao }) => !antigas.has(estacao));
  const porId = new Map(ESTACOES.map((estacao) => [estacao.id, estacao]));
  const ficam = new Set(bases.map(({ id }) => id));
  if (manterOcupantes) {
    porId.forEach((estacao, id) => {
      if (!ficam.has(id)) estacao.ocupante = null;
    });
  }

  const novas = bases.map((base) => {
    const antiga = manterOcupantes ? porId.get(base.id) : null;
    if (!antiga) return montarEstacao(base);
    return Object.assign(antiga, montarEstacao(base), { ocupante: antiga.ocupante });
  });
  ESTACOES.splice(0, ESTACOES.length, ...novas);
  OBSTACULOS.splice(0, OBSTACULOS.length, ...ESTACOES.flatMap(obstaculosDa), ...outros);
  BLOCOS = montarBlocos(ESTACOES);
  return ESTACOES;
}

// Todos podem trabalhar ao mesmo tempo (1 técnico por computador).
export const maxSentados = () => ESTACOES.length;

// O ponto está dentro da elipse da área livre? A folga encolhe a elipse.
export const dentroDaArea = (area, ponto, folga = 0) =>
  (ponto.x / (area.rx - folga)) ** 2 + (ponto.z / (area.rz - folga)) ** 2 <= 1;

export const longeDosObstaculos = (ponto, margem = 0.3) =>
  OBSTACULOS.every((o) => o.r <= 0 || Math.hypot(ponto.x - o.x, ponto.z - o.z) > o.r + margem);

const dentroDoBloco = (bloco, p) => p.x > bloco.minX && p.x < bloco.maxX && p.z > bloco.minZ && p.z < bloco.maxZ;

// O ponto está fora do retângulo de todos os blocos de mesas?
export const foraDosBlocos = (p) => BLOCOS.every((bloco) => !dentroDoBloco(bloco, p));

/**
 * Tira o ponto de dentro do retângulo de cada bloco, pela borda mais perto: fecha o
 * vão entre as cadeiras de mesas encostadas, onde os círculos deixam um bolso em que
 * o técnico fica preso. Quem vai sentar numa estação do bloco (idDestino) pode entrar.
 * @param {{ x: number, z: number }} p mutado
 * @param {string | null} idDestino
 * @param {number} [maximo] quanto sai por chamada (por frame), em metros
 */
export function expulsarDosBlocos(p, idDestino, maximo = Infinity) {
  for (const bloco of BLOCOS) {
    if (!dentroDoBloco(bloco, p) || (idDestino && bloco.ids.includes(idDestino))) continue;
    const aEsquerda = p.x - bloco.minX;
    const aDireita = bloco.maxX - p.x;
    const atras = p.z - bloco.minZ;
    const aFrente = bloco.maxZ - p.z;
    const menor = Math.min(aEsquerda, aDireita, atras, aFrente);
    const passo = Math.min(menor, maximo);
    if (menor === aEsquerda) p.x -= passo;
    else if (menor === aDireita) p.x += passo;
    else if (menor === atras) p.z -= passo;
    else p.z += passo;
  }
}

// Trecho [t0, t1] do segmento a→b que fica dentro da faixa [min, max] de um eixo; null se nenhum.
function recortar(origem, delta, min, max, t0, t1) {
  if (Math.abs(delta) < 1e-9) return origem > min && origem < max ? [t0, t1] : null;
  const ta = (min - origem) / delta;
  const tb = (max - origem) / delta;
  const entrada = Math.max(t0, Math.min(ta, tb));
  const saida = Math.min(t1, Math.max(ta, tb));
  return entrada < saida ? [entrada, saida] : null;
}

// Onde (0..1) o segmento a→b entra no bloco; null se não cruza.
function entradaNoBloco(bloco, a, b) {
  const emX = recortar(a.x, b.x - a.x, bloco.minX, bloco.maxX, 0, 1);
  const trecho = emX && recortar(a.z, b.z - a.z, bloco.minZ, bloco.maxZ, emX[0], emX[1]);
  return trecho ? trecho[0] : null;
}

const cruzaBloco = (bloco, a, b) => entradaNoBloco(bloco, a, b) !== null;

const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Para cada canto, os dois ligados a ele por um lado livre do retângulo.
const VIZINHOS = [[1, 2], [0, 3], [0, 3], [1, 2]];
// Perto assim de um canto, o técnico já o alcançou e segue para o próximo.
const CANTO_ALCANCADO = 0.35;

// Distância de cada canto do bloco até o alvo, dando a volta pelos cantos vizinhos quando preciso.
function distanciasAteAlvo(bloco, alvo) {
  const { cantos } = bloco;
  const ate = cantos.map((canto) => (cruzaBloco(bloco, canto, alvo) ? Infinity : distancia(canto, alvo)));
  for (let volta = 0; volta < 2; volta++) {
    cantos.forEach((canto, i) => {
      for (const j of VIZINHOS[i]) ate[i] = Math.min(ate[i], distancia(canto, cantos[j]) + ate[j]);
    });
  }
  return ate;
}

// Folga com que os cantos são trazidos para dentro da elipse.
const FOLGA_CANTO = 0.25;

// Um canto fora da área de caminhada é trazido para a borda dela: mirá-lo lá fora é ficar empurrando a borda.
function cantoNaArea(canto, area) {
  if (!area || dentroDaArea(area, canto, FOLGA_CANTO)) return canto;
  const e = Math.sqrt((canto.x / (area.rx - FOLGA_CANTO)) ** 2 + (canto.z / (area.rz - FOLGA_CANTO)) ** 2);
  return { x: canto.x / e, z: canto.z / e };
}

// Folga mínima de um canto a um obstáculo de outro grupo (quadro incluso); mais perto, o canto não serve.
const FOLGA_CANTO_OBSTACULO = 0.3;
// Até onde um canto perto de um obstáculo duro de outro grupo é afastado dele.
const AFASTAR_CANTO = 0.4;
// Um canto já mirado continua valendo enquanto custar no máximo isto a mais que o melhor.
const HISTERESE_CANTO = 0.5;

const deOutroGrupo = (bloco, o) => o.r > 0 && !bloco.ids.includes(o.estacao);

// Afasta o canto dos obstáculos duros de outros grupos (o pé do quadro, outra mesa) até a folga.
function afastarDeObstaculos(canto, bloco) {
  let p = canto;
  for (const o of OBSTACULOS) {
    if (o.suave || !deOutroGrupo(bloco, o)) continue;
    const dist = distancia(p, o);
    const minimo = o.r + AFASTAR_CANTO;
    if (dist >= minimo) continue;
    p = dist < 1e-6 ? { x: o.x + minimo, z: o.z } : { x: o.x + ((p.x - o.x) / dist) * minimo, z: o.z + ((p.z - o.z) / dist) * minimo };
  }
  return p;
}

// Um canto recortado para dentro do próprio bloco ou em cima de outro obstáculo não leva a lugar nenhum.
const cantoValido = (canto, bloco) =>
  !dentroDoBloco(bloco, canto) &&
  OBSTACULOS.every((o) => !deOutroGrupo(bloco, o) || distancia(canto, o) >= o.r + FOLGA_CANTO_OBSTACULO);

// O canto i do bloco como ponto de rota, ou null se não serve. Calculado aqui, e não em
// definirEstacoes, porque os obstáculos do quadro entram na lista depois.
function cantoDeRota(bloco, i, area, offset) {
  const base = bloco.cantos[i];
  // Cada boneco mira um ponto um pouco diferente ao longo do lado, para dez não disputarem o mesmo.
  let canto = offset ? { x: base.x + offset, z: base.z } : base;
  canto = cantoNaArea(afastarDeObstaculos(cantoNaArea(canto, area), bloco), area);
  return cantoValido(canto, bloco) ? canto : null;
}

/*
 * Caminho até o alvo: para onde mirar agora e quanto falta andar. Mira o próprio
 * alvo ou, com um bloco de estações no meio, o próximo canto do caminho mais
 * curto em volta dele (o primeiro bloco que a reta cruza, se houver mais de um).
 * Sem isso, quem vai para o outro lado de uma mesa fica empurrando a mesa e
 * nunca chega. Com a área, os cantos de uma mesa encostada na borda ficam
 * dentro dela. Quando mira um canto, devolve também o identificador dele
 * (`canto`): passado de volta em `preferido`, o canto é mantido enquanto valer e
 * não custar muito mais que o melhor, para a escolha não oscilar a cada frame.
 * @param {{ rx: number, rz: number }} [area]
 * @param {number | null} [preferido] canto mirado no frame anterior
 * @param {number} [offset] deslocamento do canto ao longo do lado do bloco, por boneco
 */
export function rotaAte(pos, alvo, area, preferido = null, offset = 0) {
  const reto = { ponto: alvo, comprimento: distancia(pos, alvo) };
  let bloco = null;
  let maisPerto = Infinity;
  for (const candidato of BLOCOS) {
    if (dentroDoBloco(candidato, alvo)) continue;
    const entrada = entradaNoBloco(candidato, pos, alvo);
    if (entrada !== null && entrada < maisPerto) {
      maisPerto = entrada;
      bloco = candidato;
    }
  }
  if (!bloco) return reto;

  const ateAlvo = distanciasAteAlvo(bloco, alvo);
  let melhor = reto;
  let menorCusto = Infinity;
  let mantido = null;
  let custoMantido = Infinity;
  bloco.cantos.forEach((_, i) => {
    const canto = cantoDeRota(bloco, i, area, offset);
    if (!canto) return;
    const ateCanto = distancia(pos, canto);
    if (ateCanto < CANTO_ALCANCADO) return;
    // Cantos escondidos atrás do bloco só servem se não houver outro.
    const custo = ateCanto + ateAlvo[i] + (cruzaBloco(bloco, pos, canto) ? 100 : 0);
    const rota = { ponto: canto, comprimento: ateCanto + ateAlvo[i], canto: bloco.indice * 4 + i };
    if (custo < menorCusto) {
      menorCusto = custo;
      melhor = rota;
    }
    if (rota.canto === preferido) {
      mantido = rota;
      custoMantido = custo;
    }
  });
  return mantido && custoMantido <= menorCusto + HISTERESE_CANTO ? mantido : melhor;
}

/*
 * Reserva exclusiva: 1 técnico por computador. Acontece na decisão de ir
 * trabalhar, antes de andar até lá, então dois técnicos nunca disputam o mesmo PC.
 */
export function reservarEstacao(idTecnico, area) {
  if (ESTACOES.some((e) => e.ocupante === idTecnico)) return null;
  const ocupadas = ESTACOES.filter((e) => e.ocupante !== null).length;
  if (ocupadas >= maxSentados()) return null;
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

// O técnico ainda é o dono da estação em que está sentado? A estação também tem de ser
// uma das atuais: se a lista foi refeita (outras estações, ou o módulo recarregado pelo
// Vite com a página aberta), a antiga ainda diz que ele é o dono, mas a nova, no mesmo
// lugar, está livre para outro, e os dois acabariam sentados na mesma cadeira.
export const aindaEDono = (estadoTecnico) =>
  !!estadoTecnico.estacao &&
  estadoTecnico.estacao.ocupante === estadoTecnico.id &&
  ESTACOES.includes(estadoTecnico.estacao);

/*
 * Cenário sem estações: tira as mesas e os obstáculos delas. Os que outros
 * módulos acrescentaram (o quadro da equipe) continuam, e os bonecos passam a
 * só andar, fazer ações e contornar o quadro.
 */
export const tirarEstacoes = () => definirEstacoes([]);

// Zera todas as reservas (hot reload e testes).
export function resetarEstacoes() {
  ESTACOES.forEach((estacao) => {
    estacao.ocupante = null;
  });
}

// Já no carregamento, o bloco de /suporte: a página de desenvolvimento troca pelas mesas dela.
definirEstacoes(BASES_SUPORTE);
