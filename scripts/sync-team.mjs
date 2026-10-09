// Busca os técnicos no Milldesk e gera a equipe de uma página, só com o que ela
// mostra: nome, cargo e se a pessoa está ausente.
// E-mail, telefone, login e custo da API nunca saem deste script.
//
// Quem aparece em cada página é decidido na lista dela, em scripts/data:
//   { "id": "fabio", "agent": "Fábio" }
//   agent: nome exato do técnico no Milldesk
//   id:    identificador fixo do site; é por ele que a aparência do boneco é
//          configurada (src/pages/Suporte/boneco/aparencia.js e
//          src/pages/Desenvolvimento/aparencias.js)
// Para incluir ou tirar alguém, edite a lista e rode o script de novo.
//
// Uso (lê MILLDESK_API_KEY do .env):
//   npm run sync:team        support-team.json -> src/data/team.json
//   npm run sync:dev-team    dev-team.json     -> src/data/dev-team.json
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { TeamError, buildTeam } from './lib/build-team.mjs';
import { MilldeskError, fetchMilldesk, toRecords } from './lib/milldesk.mjs';

// Em /desenvolvimento os nomes saem abreviados: o Milldesk guarda o nome
// completo dos desenvolvedores, comprido demais para o rótulo do boneco.
const TEAMS = {
  suporte: { file: 'support-team.json', output: 'src/data/team.json', label: 'técnicos de suporte' },
  desenvolvimento: {
    file: 'dev-team.json',
    output: 'src/data/dev-team.json',
    label: 'desenvolvedores',
    shortNames: true,
  },
};

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

const target = process.argv[2] ?? 'suporte';
if (!Object.hasOwn(TEAMS, target)) {
  fail(`Equipe desconhecida: "${target}" (use ${Object.keys(TEAMS).join(' ou ')}).`);
}
const { file, output, label, shortNames } = TEAMS[target];

const run = async () => {
  const roster = JSON.parse(await readFile(new URL(`./data/${file}`, import.meta.url), 'utf8')).team;
  const records = toRecords(await fetchMilldesk('listAgents'));
  return buildTeam(records, roster, { file, shortNames });
};

// Em qualquer falha o arquivo atual fica como está.
const team = await run().catch((error) => {
  if (error instanceof MilldeskError || error instanceof TeamError) {
    fail(`${error.message} ${output} não foi alterado.`);
  }
  throw error;
});

await mkdir('src/data', { recursive: true });
await writeFile(output, `${JSON.stringify({ source: 'milldesk', team }, null, 2)}\n`);

const lines = team.map(
  ({ name, role, absent }) => `  - ${name} (${role ?? 'sem cargo'})${absent ? ' [ausente]' : ''}`,
);
process.stdout.write(`${team.length} ${label} -> ${output}\n${lines.join('\n')}\n`);
