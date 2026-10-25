// Função da Vercel: GET /api/equipes/suporte e /api/equipes/desenvolvimento.
// A lógica está em server/api.mjs.
import { tratarApi } from '../../server/api.mjs';

export const GET = tratarApi;
