import dados from '../../../data/team.json';
import { mapearTecnico } from '../mappers/equipe.js';

/** @import { Tecnico } from '../tipos.js' */

/**
 * A equipe vem de src/data/team.json, gerado a partir do Milldesk por
 * `npm run sync:team` (a chave da API nunca vem ao navegador). Se um dia os
 * dados vierem de um backend, só o corpo desta função muda.
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return dados.team.map(mapearTecnico);
}
