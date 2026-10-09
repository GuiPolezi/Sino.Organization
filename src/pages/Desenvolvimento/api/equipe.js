import dados from '../../../data/dev-team.json';
import { mapearTecnico } from '../../Suporte/mappers/equipe.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */

/**
 * A equipe de desenvolvimento vem de src/data/dev-team.json, gerado a partir do
 * Milldesk por `npm run sync:dev-team` (a chave da API nunca vem ao navegador).
 * O id liga cada pessoa à aparência dela em ../aparencias.js. Se um dia os dados
 * vierem de um backend, só o corpo desta função muda.
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return dados.team.map(mapearTecnico);
}
