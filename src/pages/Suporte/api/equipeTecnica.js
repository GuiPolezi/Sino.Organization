import { mapearTecnico } from '../mappers/mildesk.js';
import { respostaMildeskMock } from '../mocks/tecnicos.mock.js';

/** @import { Tecnico } from '../tipos.js' */

/**
 * Hoje devolve o mock. Na integração, só o corpo desta função muda: ela passa
 * a chamar o backend, que é quem fala com o Mildesk (o token nunca vem ao navegador).
 * @returns {Promise<Tecnico[]>}
 */
export async function buscarEquipe() {
  return respostaMildeskMock.map(mapearTecnico);
}
