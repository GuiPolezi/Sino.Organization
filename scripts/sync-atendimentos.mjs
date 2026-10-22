// Busca os tickets no Milldesk e gera src/data/atendimentos.json com, para cada
// técnico de scripts/data/support-team.json:
//   porDia              atendimentos por dia de criação ("AAAA-MM-DD" -> total)
//   chamadosAtribuidos  tickets dele com status diferente de "Fechado"
// Assunto, descrição e cliente dos tickets nunca saem deste script: só as contagens.
// As regras de contagem estão em scripts/lib/build-atendimentos.mjs.
//
// O histórico começa no dia 1 do mês anterior, para o mês corrente e as semanas
// do gráfico terem dados. Os números só mudam quando o script roda de novo.
//
// Uso (lê MILLDESK_API_KEY do .env):
//   npm run sync:atendimentos
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { STATUS_FECHADO, contarAtendimentos } from './lib/build-atendimentos.mjs';
import { MilldeskError, fetchMilldesk, toRecords } from './lib/milldesk.mjs';

const OUTPUT = 'src/data/atendimentos.json';

const fail = (message) => {
  process.stderr.write(`${message}\n`);
  process.exit(1);
};

// Hoje em Brasília, "AAAA-MM-DD".
const hoje = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(Date.now());

function inicioDoMesAnterior(data) {
  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  return mes === 1 ? `${ano - 1}-12-01` : `${ano}-${String(mes - 1).padStart(2, '0')}-01`;
}

const buscar = async (endpoint) => toRecords(await fetchMilldesk(endpoint));

const run = async () => {
  const equipe = JSON.parse(await readFile(new URL('./data/support-team.json', import.meta.url), 'utf8')).team;
  const inicio = inicioDoMesAnterior(hoje);
  const periodo = await buscar(`showTicketsPerPeriod?start=${inicio}&end=${hoje}`);

  const statusAbertos = (await buscar('listTicketStatus'))
    .map(({ status }) => status)
    .filter((status) => status && status !== STATUS_FECHADO);
  const emAberto = [];
  // Um status por vez, para não sobrecarregar a API.
  for (const status of statusAbertos) {
    emAberto.push(...(await buscar(`showTicketsByStatus?status=${encodeURIComponent(status)}`)));
  }

  return { inicio, statusAbertos, ...contarAtendimentos(periodo, emAberto, equipe) };
};

// Em qualquer falha o arquivo atual fica como está.
const resultado = await run().catch((error) => {
  if (error instanceof MilldeskError) fail(`${error.message} ${OUTPUT} não foi alterado.`);
  throw error;
});
const { inicio, statusAbertos, tecnicos, foraDaEquipe, semData } = resultado;

await mkdir('src/data', { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify({ source: 'milldesk', geradoEm: new Date().toISOString(), periodo: { inicio, fim: hoje }, tecnicos }, null, 2)}\n`,
);

const soma = (porDia) => Object.values(porDia).reduce((total, valor) => total + valor, 0);
const linhas = Object.entries(tecnicos).map(
  ([id, { porDia, chamadosAtribuidos }]) =>
    `  - ${id}: ${soma(porDia)} atendimentos, hoje ${porDia[hoje] ?? 0}, ${chamadosAtribuidos} tickets em aberto`,
);
const fora = Object.entries(foraDaEquipe).map(([nome, total]) => `${nome} (${total})`);
process.stdout.write(
  [
    `Atendimentos de ${inicio} a ${hoje} -> ${OUTPUT}`,
    ...linhas,
    `Tickets em aberto: ${statusAbertos.length} status consultados (todos menos "${STATUS_FECHADO}").`,
    ...(fora.length ? [`Atendimentos de técnicos fora da equipe, ignorados: ${fora.join(', ')}`] : []),
    ...(semData ? [`Atendimentos sem data de criação, ignorados: ${semData}`] : []),
  ].join('\n') + '\n',
);
