// Função da Vercel: GET /api/chamados. A lógica está em server/api.mjs e server/chamados.mjs.
import { tratarApi } from '../server/api.mjs';

export const GET = tratarApi;
