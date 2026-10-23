import dados from '../../../data/chamados.json';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { ChamadosDesenvolvedor } from '../mappers/chamados.js' */
/** @import { Solicitacoes } from '../mappers/categoria.js' */

/**
 * Chamados atribuídos a cada desenvolvedor, para o card e o quadro. Vêm de
 * src/data/chamados.json, gerado a partir dos tickets do Milldesk por
 * `npm run sync:chamados` (a chave da API nunca vem ao navegador). Quem não
 * está no arquivo fica sem os chamados no card.
 *
 * @param {Pick<Tecnico, 'id'>[]} tecnicos
 * @returns {Promise<Record<string, ChamadosDesenvolvedor>>} por id
 */
export async function buscarChamados(tecnicos) {
  return Object.fromEntries(
    tecnicos.flatMap(({ id }) => {
      const lista = dados.desenvolvedores[id];
      return Array.isArray(lista) ? [[id, { lista }]] : [];
    }),
  );
}

/**
 * Tickets abertos por dia, de qualquer técnico (suporte e desenvolvimento): no
 * Milldesk todo e em cada categoria do site. São os "Tickets criados" do card
 * de uma categoria. Vêm do mesmo src/data/chamados.json.
 *
 * @returns {Solicitacoes | undefined} undefined num arquivo gerado antes dessa contagem
 */
export const solicitacoes = () => dados.solicitacoes;
