import { buscarDados } from '../../../api/buscarApi.js';

/** @import { Tecnico } from '../tipos.js' */
/** @import { AtendimentosTecnico } from '../mappers/atendimentos.js' */

/**
 * Atendimentos de cada técnico, para o card. Vêm da API do site
 * (/api/atendimentos), que conta os tickets do Milldesk no servidor, com no
 * máximo 15 minutos de atraso (a chave da API nunca vem ao navegador):
 * atendimentos por dia e tickets em aberto.
 * Técnico que não está no arquivo fica sem essas seções.
 *
 * @param {Tecnico[]} tecnicos
 * @returns {Promise<Record<string, AtendimentosTecnico>>} por id do técnico
 */
export async function buscarAtendimentos(tecnicos) {
  const dados = await buscarDados('/api/atendimentos');
  return Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const atendimentos = dados.tecnicos[id];
      return atendimentos ? [[id, atendimentos]] : [];
    }),
  );
}
