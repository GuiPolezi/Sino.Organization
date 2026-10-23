// Busca no Milldesk todos os tickets desde o início do uso do sistema e gera
// src/data/chamados.json com a lista de chamados de cada desenvolvedor de
// scripts/data/dev-team.json (o técnico do ticket é o campo Técnico) e a
// contagem de tickets abertos por dia, no Milldesk todo e por categoria.
// As regras de classificação estão em scripts/lib/build-chamados.mjs; título,
// descrição e solicitante dos tickets nunca saem deste script.
//
// A API só aceita períodos curtos, então a busca vai em janelas de 90 dias, com
// uma pausa entre elas. Quando a API pede para esperar (HTTP 429), o script
// espera e tenta de novo. A busca completa leva alguns minutos.
//
// Uso:
//   npm run sync:chamados                       (lê MILLDESK_API_KEY do .env)
//   npm run sync:chamados -- --from arq.json    (usa uma lista de tickets já baixada)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { montarChamados } from './lib/build-chamados.mjs';
import { MilldeskError, fetchMilldesk, toRecords } from './lib/milldesk.mjs';

const OUTPUT = 'src/data/chamados.json';
// Primeiro ticket do Milldesk: outubro de 2017.
const INICIO = '2017-10-01';
const DIAS_POR_JANELA = 90;
const PAUSA_MS = 2500;
const TENTATIVAS = 8;
const UM_DIA_MS = 864e5;

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

const somarDias = (data, dias) => new Date(Date.parse(`${data}T00:00:00Z`) + dias * UM_DIA_MS).toISOString().slice(0, 10);

function janelas(inicio, fim) {
  const lista = [];
  for (let de = inicio; de <= fim; de = somarDias(de, DIAS_POR_JANELA)) {
    const ate = somarDias(de, DIAS_POR_JANELA - 1);
    lista.push([de, ate < fim ? ate : fim]);
  }
  return lista;
}

// Com HTTP 429, espera cada vez mais antes de tentar de novo.
async function buscar(endpoint) {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return toRecords(await fetchMilldesk(endpoint));
    } catch (error) {
      const limitado = error instanceof MilldeskError && error.message.includes('HTTP 429');
      if (!limitado || tentativa >= TENTATIVAS) throw error;
      await esperar(15000 * tentativa);
    }
  }
}

const run = async () => {
  const equipe = JSON.parse(await readFile(new URL('./data/dev-team.json', import.meta.url), 'utf8')).team;

  const origem = process.argv.indexOf('--from');
  if (origem !== -1) {
    const tickets = toRecords(JSON.parse(await readFile(process.argv[origem + 1], 'utf8')));
    return { total: tickets.length, ...montarChamados(tickets, equipe) };
  }

  const tickets = [];
  const todas = janelas(INICIO, hoje);
  for (const [i, [de, ate]] of todas.entries()) {
    if (i > 0) await esperar(PAUSA_MS);
    process.stdout.write(`\rBuscando ${de} a ${ate} (${i + 1}/${todas.length})`);
    tickets.push(...(await buscar(`showTicketsPerPeriod?start=${de}&end=${ate}`)));
  }
  process.stdout.write('\n');
  return { total: tickets.length, ...montarChamados(tickets, equipe) };
};

// Em qualquer falha o arquivo atual fica como está.
const resultado = await run().catch((error) => {
  if (error instanceof MilldeskError) fail(`\n${error.message} ${OUTPUT} não foi alterado.`);
  throw error;
});
const { total, desenvolvedores, solicitacoes, categoriasIgnoradas, semData } = resultado;

await mkdir('src/data', { recursive: true });
await writeFile(
  OUTPUT,
  `${JSON.stringify({ source: 'milldesk', geradoEm: new Date().toISOString(), periodo: { inicio: INICIO, fim: hoje }, desenvolvedores, solicitacoes })}\n`,
);

const ignorados = Object.entries(categoriasIgnoradas)
  .sort(([, a], [, b]) => b - a)
  .map(([nome, quantos]) => `${nome} (${quantos})`);
process.stdout.write(
  [
    `${total} tickets de ${INICIO} a ${hoje} -> ${OUTPUT}`,
    ...Object.entries(desenvolvedores).map(([id, lista]) => `  - ${id}: ${lista.length} chamados`),
    ...(ignorados.length ? [`Fora das categorias do site, ignorados: ${ignorados.join(', ')}`] : []),
    ...(semData ? [`Sem data de criação ou status, ignorados: ${semData}`] : []),
  ].join('\n') + '\n',
);
