// Busca os técnicos no Milldesk e gera src/data/team.json, só com o que a
// página /suporte mostra: nome, cargo e se o técnico está ausente.
// E-mail, telefone, login e custo da API nunca saem deste script.
//
// Quem aparece na página é decidido em scripts/data/support-team.json:
//   { "id": "fabio", "agent": "Fábio" }
//   agent: nome exato do técnico no Milldesk
//   id:    identificador fixo do site; é por ele que a aparência do boneco é
//          configurada (src/pages/Suporte/boneco/aparencia.js)
// Para incluir ou tirar alguém, edite esse arquivo e rode o script de novo.
//
// Uso:
//   npm run sync:team        (lê MILLDESK_API_KEY do .env)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { TeamError, buildTeam } from './lib/build-team.mjs';
import { MilldeskError, fetchMilldesk, toRecords } from './lib/milldesk.mjs';

const ROSTER_FILE = new URL('./data/support-team.json', import.meta.url);
const OUTPUT = 'src/data/team.json';

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const run = async () => {
  const roster = JSON.parse(await readFile(ROSTER_FILE, 'utf8')).team;
  const records = toRecords(await fetchMilldesk('listAgents'));
  return buildTeam(records, roster);
};

// Em qualquer falha o arquivo atual fica como está.
const team = await run().catch((error) => {
  if (error instanceof MilldeskError || error instanceof TeamError) {
    fail(`${error.message} ${OUTPUT} não foi alterado.`);
  }
  throw error;
});

await mkdir('src/data', { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify({ source: 'milldesk', team }, null, 2)}\n`);

const lines = team.map(
  ({ name, role, absent }) => `  - ${name} (${role ?? 'sem cargo'})${absent ? ' [ausente]' : ''}`,
);
process.stdout.write(`${team.length} técnicos de suporte -> ${OUTPUT}\n${lines.join('\n')}\n`);
