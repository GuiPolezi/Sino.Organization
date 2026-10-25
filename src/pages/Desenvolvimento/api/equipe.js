import { buscarDados } from '../../../api/buscarApi.js';
import { mapearTecnico } from '../../Suporte/mappers/equipe.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */

/**
 * A equipe de desenvolvimento vem da API do site (/api/equipes/desenvolvimento),
 * que lê o Milldesk no servidor (a chave da API nunca vem ao navegador). O id
 * liga cada pessoa à aparência dela em ../aparencias.js.
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return (await buscarDados('/api/equipes/desenvolvimento')).team.map(mapearTecnico);
}
