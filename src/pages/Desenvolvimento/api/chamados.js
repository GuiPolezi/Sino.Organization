import dados from '../../../data/chamados.json';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { ChamadosDesenvolvedor } from '../mappers/chamados.js' */

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
