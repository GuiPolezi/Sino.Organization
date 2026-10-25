import { buscarDados } from '../../../api/buscarApi.js';
import { mapearTecnico } from '../mappers/equipe.js';

/** @import { Tecnico } from '../tipos.js' */

/**
 * A equipe de suporte vem da API do site (/api/equipes/suporte), que lê o
 * Milldesk no servidor (a chave da API nunca vem ao navegador).
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return (await buscarDados('/api/equipes/suporte')).team.map(mapearTecnico);
}
