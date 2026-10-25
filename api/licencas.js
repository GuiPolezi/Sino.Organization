// Função da Vercel: GET /api/licencas. A lógica está em server/api.mjs.
import { responderLicencas } from '../server/api.mjs';

export const GET = () => responderLicencas();
