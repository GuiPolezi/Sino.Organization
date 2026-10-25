import { buscarDados } from '../../../api/buscarApi.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { ChamadosDesenvolvedor } from '../mappers/chamados.js' */

/**
 * Chamados atribuídos a cada desenvolvedor, para o card e o quadro. Vêm da API
 * do site (/api/chamados), que guarda o histórico do Milldesk desde 2017 em
 * janelas de 90 dias: as mais recentes com no máximo 15 minutos de atraso, as
 * antigas renovadas por um agendamento diário (a chave da API nunca vem ao
 * navegador). Quem não está na resposta fica sem os chamados no card.
 *
 * @param {Pick<Tecnico, 'id'>[]} tecnicos
 * @returns {Promise<Record<string, ChamadosDesenvolvedor>>} por id
 */
export async function buscarChamados(tecnicos) {
  const dados = await buscarDados('/api/chamados');
  return Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const lista = dados.desenvolvedores[id];
      return Array.isArray(lista) ? [[id, { lista }]] : [];
    }),
  );
}
