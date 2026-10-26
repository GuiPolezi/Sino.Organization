import { buscarApi } from '../../../api/buscarApi.js';

/** @import { Tecnico } from '../tipos.js' */
/** @import { AtendimentosTecnico } from '../mappers/atendimentos.js' */

/**
 * Atendimentos de cada técnico, para o card. Vêm da API do site
 * (/api/atendimentos), que conta os tickets do Milldesk no servidor, com no
 * máximo 15 minutos de atraso (a chave da API nunca vem ao navegador):
 * atendimentos por dia e tickets em aberto.
 * Técnico que não está no arquivo fica sem essas seções.
 *
 * Sempre faz um pedido novo: é chamada de novo enquanto a página está aberta
 * (api/acompanharFonte.js).
 *
 * @param {Tecnico[]} tecnicos
 * @returns {Promise<{ porTecnico: Record<string, AtendimentosTecnico>, geradoEm: string, situacao: string }>}
 *   porTecnico: por id do técnico; geradoEm: quando o servidor contou os tickets;
 *   situacao: a do cache do servidor (server/cache.mjs)
 */
export async function buscarAtendimentos(tecnicos) {
  const { dados, geradoEm, situacao } = await buscarApi('/api/atendimentos', { novo: true });
  const porTecnico = Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const atendimentos = dados.tecnicos[id];
      return atendimentos ? [[id, atendimentos]] : [];
    }),
  );
  return { porTecnico, geradoEm, situacao };
}
