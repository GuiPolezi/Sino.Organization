import { buscarApi } from '../../../api/buscarApi.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { ChamadosDesenvolvedor } from '../mappers/chamados.js' */

/**
 * Chamados atribuídos a cada desenvolvedor, para o card e o quadro. Vêm da API
 * do site (/api/chamados), que guarda o histórico do Milldesk desde 2017 em
 * janelas de 90 dias: as mais recentes com no máximo 15 minutos de atraso, as
 * antigas renovadas por um agendamento diário (a chave da API nunca vem ao
 * navegador). Quem não está na resposta fica sem os chamados no card.
 *
 * Sempre faz um pedido novo: é chamada de novo enquanto a página está aberta
 * (Suporte/api/acompanharComplementos.js).
 *
 * @param {Pick<Tecnico, 'id'>[]} tecnicos
 * @returns {Promise<{ porId: Record<string, ChamadosDesenvolvedor>, geradoEm: string, situacao: string }>}
 *   porId: por id; geradoEm: quando o servidor renovou as janelas recentes;
 *   situacao: a do cache do servidor (server/cache.mjs)
 */
export async function buscarChamados(tecnicos) {
  const { dados, geradoEm, situacao } = await buscarApi('/api/chamados', { novo: true });
  const porId = Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const lista = dados.desenvolvedores[id];
      return Array.isArray(lista) ? [[id, { lista }]] : [];
    }),
  );
  return { porId, geradoEm, situacao };
}
