import dados from '../../../data/atendimentos.json';

/** @import { Tecnico } from '../tipos.js' */
/** @import { AtendimentosTecnico } from '../mappers/atendimentos.js' */

/**
 * Atendimentos de cada técnico, para o card. Vêm de src/data/atendimentos.json,
 * gerado a partir dos tickets do Milldesk por `npm run sync:atendimentos` (a
 * chave da API nunca vem ao navegador): atendimentos por dia e tickets em aberto.
 * O tempo médio ainda não é calculado, então essa seção não aparece no card.
 * Técnico que não está no arquivo fica sem essas seções.
 *
 * @param {Tecnico[]} tecnicos
 * @returns {Promise<Record<string, AtendimentosTecnico>>} por id do técnico
 */
export async function buscarAtendimentos(tecnicos) {
  return Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const atendimentos = dados.tecnicos[id];
      return atendimentos ? [[id, atendimentos]] : [];
    }),
  );
}
