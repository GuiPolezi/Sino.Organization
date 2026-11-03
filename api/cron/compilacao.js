// Agendamento diário da Vercel (vercel.json > crons), 23:50 de Brasília: busca a
// compilação de novo e grava o retrato de fechamento do estoque do dia.
// Só roda com o CRON_SECRET certo.
import { tratarApi } from '../../server/api.mjs';

export const GET = tratarApi;
