/*
 * Lugares da sala de reunião: as cadeiras da mesa e os pufes, como estações de
 * Suporte/boneco/estacoes.js (reserva exclusiva, 1 por lugar, e quem senta olha
 * para a mesa). Os lugares ATIVOS seguem a quantidade de membros
 * (configurarLugares → montarLugares em planta.js); quem estava num lugar que
 * sumiu levanta sozinho, e quem está num que continua fica sentado.
 */
import { OBSTACULOS, definirEstacoes, pontoLocal } from '../../Suporte/boneco/estacoes.js';
import { LUGARES_MESA, MESA, OBSTACULOS_FIXOS, POLTRONAS, montarLugares } from './planta.js';

/** @import { BaseEstacao } from '../../Suporte/boneco/estacoes.js' */

// Altura do corpo sentado: na cadeira sobe; no pufe afunda um pouco.
const ELEVACAO = { cadeira: 0.17, poltrona: 0.1 };
// Do centro do pufe até onde o boneco chega andando, do lado da mesa.
const CHEGADA_PUFE = 1.15;

const cadeira = (lugar) => ({
  ...lugar,
  tipo: 'cadeira',
  elevacao: ELEVACAO.cadeira,
  // Borda da mesa (as duas metades) e a cadeira.
  obstaculos: [
    { ...pontoLocal(lugar, -0.3, 0), r: 0.7 },
    { ...pontoLocal(lugar, 0.3, 0), r: 0.7 },
    { ...pontoLocal(lugar, 0, 0.78), r: 0.6 },
  ],
});

// Chega pelo lado da mesa e se joga de costas no pufe, já olhando para a mesa.
const pufe = (p) => {
  const dx = MESA.x - p.x;
  const dz = MESA.z - p.z;
  const d = Math.hypot(dx, dz);
  const ux = dx / d;
  const uz = dz / d;
  return {
    id: p.id,
    x: p.x,
    z: p.z,
    rot: p.rot,
    tipo: 'poltrona',
    elevacao: ELEVACAO.poltrona,
    trajetoDireto: true,
    assento: { x: p.x, z: p.z },
    aprox: { x: p.x + ux * CHEGADA_PUFE, z: p.z + uz * CHEGADA_PUFE },
    yaw: Math.atan2(ux, uz),
    // Raio do pufe (0,58 m) mais o corpo. Com 0,95 a chegada do p3 caía dentro do p2.
    obstaculos: [{ x: p.x, z: p.z, r: 0.85 }],
  };
};

/** Todas as bases possíveis, por id (os ativos são um subconjunto). @type {Map<string, BaseEstacao>} */
export const BASES = new Map([
  ...Object.values(LUGARES_MESA).map((lugar) => [lugar.id, cadeira(lugar)]),
  ...POLTRONAS.map((p) => [p.id, pufe(p)]),
]);

/**
 * Ativa os lugares para N membros. Devolve o plano ({ cadeiras, poltronas, emPe }) para o desenho.
 * @param {number} membros
 */
export function configurarLugares(membros) {
  const plano = montarLugares(membros);
  const ativos = [...plano.cadeiras, ...plano.poltronas].map((id) => BASES.get(id));
  definirEstacoes(ativos, { manterOcupantes: true });
  return plano;
}

/*
 * Ao carregar: a mesa, o cavalete, a luminária e a parede entram na lista de
 * obstáculos (marcados como do cenário, ficam quando os lugares mudam), e as
 * estações do suporte, que estacoes.js cria no carregamento, saem.
 */
OBSTACULOS.push(...OBSTACULOS_FIXOS.map((o) => ({ ...o, estacao: 'cenario-reuniao' })));
definirEstacoes([]);
