import { buscarApi } from '../../../api/buscarApi.js';

/**
 * A compilação do servidor (/api/compilacao): { dados, geradoEm, situacao, aviso? }.
 * Sempre um pedido novo: quem chama é a busca que se repete a cada 15 minutos.
 */
export const buscarCompilacao = () => buscarApi('/api/compilacao', { novo: true });
