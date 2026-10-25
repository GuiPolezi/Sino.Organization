// Agendamento diário da Vercel (vercel.json > crons): renova em rodízio as janelas
// antigas do histórico de chamados. Só roda com o CRON_SECRET certo.
import { tratarApi } from '../../server/api.mjs';

export const GET = tratarApi;
