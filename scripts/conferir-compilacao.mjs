// Conferência da /api/compilacao contra o sistema (fase F7). Roda na máquina do
// líder, só lendo: nenhum pedido ao sistema grava nada, e o Supabase é aberto
// em modo só leitura (POST/PATCH viram nada).
//
// Uso: node --env-file=.env scripts/conferir-compilacao.mjs [dia AAAA-MM-DD] [mês AAAA-MM]
// Padrão: 2026-10-29 e 2026-10. O relatório vai para docs/compilacao-conferencia.md
// (fora do git: tem números reais). Na tela e no relatório só aparecem os ids
// públicos de personagem, nunca login ou id de usuário.
import { writeFileSync } from 'node:fs';
import { buscarCompilacao } from '../server/compilacao.mjs';
import { criarClienteLegislacaoDoAmbiente } from '../server/legislacao.mjs';
import { criarClienteSupabase } from '../server/supabase.mjs';
import { lerEquipe } from './lib/compilacao/configuracao.mjs';

const DIA = process.argv[2] ?? '2026-10-29';
const MES = process.argv[3] ?? '2026-10';
const [ANO_MES, NUM_MES] = MES.split('-').map(Number);
const ULTIMO_DIA = new Date(Date.UTC(ANO_MES, NUM_MES, 0)).getUTCDate();
const FIM_DO_MES = `${MES}-${String(ULTIMO_DIA).padStart(2, '0')}`;
const RELATORIO = 'docs/compilacao-conferencia.md';
const FAIXA = [0.5, 1.5]; // planilha ÷ Auditoria aceitável em Atualizações (D10)

const linhas = [];
const anotar = (texto = '') => {
  linhas.push(texto);
  console.log(texto);
};

// --- clientes só leitura ---
const base = criarClienteLegislacaoDoAmbiente();
let pedidos = 0;
const cliente = Object.fromEntries(
  Object.entries(base).map(([nome, fn]) => [nome, (...args) => ((pedidos += 1), fn(...args))]),
);
const supabase = process.env.SUPABASE_URL
  ? criarClienteSupabase({ url: process.env.SUPABASE_URL, chave: process.env.SUPABASE_SECRET_KEY })
  : null;
const pedirSoLeitura = supabase
  ? (caminho, opcoes = {}) => ((opcoes.method ?? 'GET') === 'GET' ? supabase(caminho, opcoes) : Promise.resolve(null))
  : null;

// --- contagem independente (não usa normas-distintas.mjs) ---
const PREFIXO = /^\s*(?:(?:altera|revoga|prorroga|relacionada|regulamenta)\s*:\s*)+/i;
function chaveSimples(item) {
  const texto = String(item?.descricao ?? '').slice(0, 300).replace(PREFIXO, '').toLowerCase();
  const corte = texto.search(/\sn[º°o]\.?\s*\d/);
  if (corte < 0) return `?|${item?.cidadeUf}|${texto.trim()}`;
  const tipo = texto.slice(0, corte).trim();
  const resto = texto.slice(corte).replace(/^\s*n[º°o]\.?\s*/, '');
  const numero = resto.match(/^[\d.]+(?:-?[a-z])?/)?.[0].replace(/\./g, '') ?? '';
  const ano = resto.match(/\/\s*(?:\d{1,2}\/\d{1,2}\/)?(\d{4})/)?.[1] ?? '';
  return `${item?.cidadeUf}|${tipo}|${numero}/${ano}`;
}
const distintas = (itens) => new Set(itens.map(chaveSimples)).size;

const versoesDe = (membro, dataInicial, dataFinal) =>
  cliente.listarTudo('Auditoria', { usuarioId: membro.usuarioId, modulo: 'Versões', acao: 1, dataInicial, dataFinal });

// "AAAA-MM-DD" no fim do dia em Brasília: a rota calcula Hoje e Mês a partir daí.
const fimDoDia = (data) => new Date(`${data}T23:30:00-03:00`);

// --- comparação ---
const equipe = lerEquipe(process.env.COMPILACAO_EQUIPE);
const marca = (ok) => (ok ? 'ok' : 'DIFERENTE');
let diferencas = 0;

anotar(`# Conferência da /api/compilacao`);
anotar();
anotar(`Gerada em ${new Date().toISOString()} · dia ${DIA} · mês ${MES}`);
anotar();

const avisosDia = [];
const avisosMes = [];
const doDia = await buscarCompilacao({ cliente, pedirSupabase: pedirSoLeitura, agora: fimDoDia(DIA), avisar: (m) => avisosDia.push(m) });
const doMes = await buscarCompilacao({ cliente, pedirSupabase: pedirSoLeitura, agora: fimDoDia(FIM_DO_MES), avisar: (m) => avisosMes.push(m) });

anotar(`## Projetos Novos: normas distintas (rota × lista direta da Auditoria)`);
anotar();
anotar(`| Pessoa | Dia rota | Dia direta | Mês rota | Mês direta | Versões no mês | Σ tipos no mês | Situação |`);
anotar(`|---|---|---|---|---|---|---|---|`);
for (const membro of equipe.filter((m) => m.funcao === 'projetos')) {
  const listaDia = await versoesDe(membro, DIA, DIA);
  const listaMes = await versoesDe(membro, `${MES}-01`, FIM_DO_MES);
  const rotaDia = doDia.pessoas[membro.personagem]?.producao.hoje ?? null;
  const rotaMes = doMes.pessoas[membro.personagem]?.producao.mes ?? null;
  const tipos = doMes.pessoas[membro.personagem]?.porTipo.mes;
  const somaTipos = tipos ? Object.values(tipos).reduce((a, b) => a + b, 0) : null;
  const diretaDia = distintas(listaDia);
  const diretaMes = distintas(listaMes);
  const ok = rotaDia === diretaDia && rotaMes === diretaMes && somaTipos === rotaMes && diretaMes <= listaMes.length;
  if (!ok) diferencas += 1;
  anotar(`| ${membro.personagem} | ${rotaDia ?? '—'} | ${diretaDia} | ${rotaMes ?? '—'} | ${diretaMes} | ${listaMes.length} | ${somaTipos ?? '—'} | ${marca(ok)} |`);
}
anotar();

anotar(`## Atualizações: compiladas do mês (planilha) × Auditoria`);
anotar();
const planilhas = pedirSoLeitura
  ? await pedirSoLeitura(
      `/compilacao_planilhas?select=personagem,compiladas&ano=eq.${ANO_MES}&mes=eq.${NUM_MES}&limit=1000`,
    )
  : null;
anotar(`| Pessoa | Mês rota | Σ linhas da aba | Auditoria (distintas) | Razão | Situação |`);
anotar(`|---|---|---|---|---|---|`);
for (const membro of equipe.filter((m) => m.funcao === 'atualizacoes')) {
  const rota = doMes.pessoas[membro.personagem]?.producao.mes ?? null;
  const soma = Array.isArray(planilhas)
    ? planilhas.filter((l) => l.personagem === membro.personagem).reduce((a, l) => a + (l.compiladas ?? 0), 0)
    : null;
  const auditoria = distintas(await versoesDe(membro, `${MES}-01`, FIM_DO_MES));
  const razao = rota !== null && auditoria > 0 ? rota / auditoria : null;
  const naFaixa = razao === null || (razao >= FAIXA[0] && razao <= FAIXA[1]);
  const ok = rota === soma && naFaixa;
  if (!ok) diferencas += 1;
  anotar(`| ${membro.personagem} | ${rota ?? '—'} | ${soma ?? '—'} | ${auditoria} | ${razao === null ? '—' : razao.toFixed(2)} | ${ok ? 'ok' : rota === soma ? 'fora da faixa' : 'DIFERENTE'} |`);
}
anotar();

anotar(`## Fuso dos filtros de data`);
anotar();
// A lista de um dia só pode trazer itens com aquela data, inclusive os de perto da meia-noite.
let foraDoDia = 0;
let pertoDaMeiaNoite = 0;
for (const membro of equipe) {
  for (const item of await versoesDe(membro, DIA, DIA)) {
    if (String(item.data ?? '').slice(0, 10) !== DIA) foraDoDia += 1;
    const hora = Number(String(item.hora ?? '').slice(0, 2));
    if (hora >= 21 || hora < 3) pertoDaMeiaNoite += 1;
  }
}
if (foraDoDia > 0) diferencas += 1;
anotar(`- Itens de outro dia na lista de ${DIA}: ${foraDoDia} (${marca(foraDoDia === 0)})`);
anotar(`- Itens entre 21h e 3h nesse dia (onde um erro de fuso apareceria): ${pertoDaMeiaNoite}`);
anotar();

anotar(`## Avisos da rota`);
anotar();
for (const m of [...new Set([...avisosDia, ...avisosMes])]) anotar(`- ${m}`);
if (avisosDia.length + avisosMes.length === 0) anotar('- nenhum');
anotar();
anotar(`Pedidos ao sistema nesta conferência: ${pedidos}.`);
anotar(`Resultado: ${diferencas === 0 ? 'sem diferenças' : `${diferencas} linha(s) para explicar`}.`);

const texto = linhas.join('\n');
if (/usuarioLogin|usuarioNome|usuarioId/.test(texto)) throw new Error('o relatório citaria login ou id de usuário');
writeFileSync(RELATORIO, `${texto}\n`);
console.log(`\nRelatório: ${RELATORIO}`);
