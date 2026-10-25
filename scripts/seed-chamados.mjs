// Primeira carga do histórico de chamados no Supabase: busca todas as janelas
// antigas de 90 dias que ainda não existem no cache (e depois as mais velhas),
// uma por vez. Leva alguns minutos; o site não precisa disso para funcionar,
// mas sem a carga os chamados antigos só aparecem aos poucos, pelo agendamento
// diário (api/cron/chamados.js).
//
// Uso (lê MILLDESK_API_KEY, SUPABASE_URL e SUPABASE_SECRET_KEY do .env):
//   npm run seed:chamados
import { mensagemDe, obterServicos } from '../server/api.mjs';
import { janelas, renovarJanelasAntigas } from '../server/chamados.mjs';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  process.stderr.write('Defina SUPABASE_URL e SUPABASE_SECRET_KEY no .env: sem eles nada seria guardado.\n');
  process.exit(1);
}

const total = janelas().length;
const resultado = await renovarJanelasAntigas(obterServicos(), {
  limite: total,
  prazoMs: Infinity,
  mensagemDe,
  aoRenovar: ({ inicio, fim }, feitas, fila) => process.stdout.write(`\r${feitas}/${fila} janelas (${inicio} a ${fim})   `),
});

process.stdout.write(
  [
    '',
    `${resultado.renovadas.length} janelas guardadas no Supabase.`,
    ...resultado.falhas.map(({ chave, erro }) => `  - ${chave}: ${erro}`),
    resultado.faltando ? `Ainda faltam ${resultado.faltando}: rode de novo.` : 'Histórico completo.',
  ].join('\n') + '\n',
);
