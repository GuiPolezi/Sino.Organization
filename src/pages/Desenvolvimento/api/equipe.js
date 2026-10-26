import { buscarDados } from '../../../api/buscarApi.js';
import { mapearExMembro, mapearTecnico } from '../../Suporte/mappers/equipe.js';

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

/**
 * Quem saiu da equipe (desabilitado no Milldesk), para o histórico de tickets
 * continuar no quadro. Usa o mesmo pedido de buscarEquipe. Uma resposta antiga,
 * de antes de a API mandar `former`, vem sem ninguém.
 */
export async function buscarExMembros() {
  return ((await buscarDados('/api/equipes/desenvolvimento')).former ?? []).map(mapearExMembro);
}
