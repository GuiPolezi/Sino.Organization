import dados from '../../../data/dev-team.json';
import { mapearTecnico } from '../../Suporte/mappers/equipe.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */

/**
 * A equipe de desenvolvimento vem de src/data/dev-team.json, no mesmo formato de
 * team.json. Hoje são dez nomes provisórios ("Dev 1" a "Dev 10"): para pôr as
 * pessoas reais, basta trocar nome e cargo no arquivo (o id liga cada uma à
 * aparência dela em ../aparencias.js). Se um dia os dados vierem de um backend,
 * só o corpo desta função muda.
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return dados.team.map(mapearTecnico);
}
