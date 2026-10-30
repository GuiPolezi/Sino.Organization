import { OBSTACULOS, definirEstacoes } from '../../Suporte/boneco/estacoes.js';
import { MARCA_MOBILIA, basesDaPlanta, obstaculosDaMobilia } from './planta.js';

/**
 * Põe a planta da forma do tapete em cena: as estações (mesas, pufes e café) e
 * a mesa do café na lista de obstáculos. Os do quadro (a estátua) ficam. Chamada
 * ao carregar a página e de novo quando o tapete vira retrato ou paisagem; quem
 * estava sentado levanta (a estação dele saiu da lista).
 * @param {boolean} retrato
 */
export function aplicarPlanta(retrato) {
  const estacoes = definirEstacoes(basesDaPlanta(retrato));
  const outros = OBSTACULOS.filter(({ estacao }) => estacao !== MARCA_MOBILIA);
  OBSTACULOS.splice(0, OBSTACULOS.length, ...outros, ...obstaculosDaMobilia(retrato));
  return estacoes;
}
