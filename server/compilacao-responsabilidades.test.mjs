import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EQUIPE_CONFIG } from '../scripts/lib/compilacao/compilacao-sintetica.mjs';
import { lerEquipe } from '../scripts/lib/compilacao/configuracao.mjs';
import { tratarApi } from './api.mjs';
import {
  HISTORICO_DIAS,
  HISTORICO_MAX,
  INTERVALO_MINIMO_MS,
  RESPONSABILIDADES,
  TETO_POR_MINUTO,
  criarServicoResponsabilidades,
  repositorioResponsabilidades,
  responsabilidadesMemoria,
} from './compilacao-responsabilidades.mjs';
import { SupabaseError, criarClienteSupabase } from './supabase.mjs';

// Equipe inventada (900001-900007), sem a nathalia: assim há um id do elenco fora da equipe.
const { 900007: _fora, ...SEM_NATHALIA } = EQUIPE_CONFIG;
const equipeSintetica = () => lerEquipe(SEM_NATHALIA);
const INICIO = Date.parse('2026-11-04T15:00:00Z');
const DIA = 86_400_000;

// Relógio que só anda quando o teste manda.
function relogio() {
  let ms = INICIO;
  const agora = () => new Date(ms);
  agora.andar = (passo) => {
    ms += passo;
  };
  return agora;
}

function novoServico(repo = responsabilidadesMemoria(), equipe = equipeSintetica) {
  const agora = relogio();
  return { repo, agora, servico: criarServicoResponsabilidades(repo, { equipe, agora }) };
}

const erroSupabase = (status, codigo = null) =>
  Object.assign(new SupabaseError(`O Supabase respondeu HTTP ${status}.`), { status, codigo });

// ---------- validação ----------

test('aceita as 4 responsabilidades e devolve { personagem, chave, alteradaEm }', async () => {
  const { servico, agora } = novoServico();
  for (const chave of RESPONSABILIDADES) {
    agora.andar(INTERVALO_MINIMO_MS);
    const { status, corpo } = await servico.alterar('leonardo', { responsabilidade: chave });
    assert.equal(status, 200);
    assert.deepEqual(corpo, { personagem: 'leonardo', chave, alteradaEm: agora().toISOString() });
  }
  assert.deepEqual(RESPONSABILIDADES, ['atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas']);
});

for (const [nome, dados] of [
  ['chave desconhecida', { responsabilidade: 'gerente' }],
  ['chave em outra caixa', { responsabilidade: 'Projetos' }],
  ['número', { responsabilidade: 1 }],
  ['lista', { responsabilidade: ['projetos'] }],
  ['sem o campo', {}],
  ['corpo nulo', null],
  ['corpo texto', 'projetos'],
  ['corpo lista', ['projetos']],
  ['herdada do protótipo', { responsabilidade: 'toString' }],
]) {
  test(`400 com erros.responsabilidade: ${nome}`, async () => {
    const { servico, repo } = novoServico();
    const { status, corpo } = await servico.alterar('ramon', dados);
    assert.equal(status, 400);
    assert.equal(typeof corpo.erros.responsabilidade, 'string');
    assert.equal(repo.historico.length, 0);
  });
}

test('404 para quem não está na equipe configurada (mesmo sendo do elenco)', async () => {
  const { servico, repo } = novoServico();
  for (const personagem of ['nathalia', 'fulano', '__proto__']) {
    const { status, corpo } = await servico.alterar(personagem, { responsabilidade: 'projetos' });
    assert.equal(status, 404, personagem);
    assert.equal(typeof corpo.erro, 'string');
  }
  assert.equal(repo.historico.length, 0);
});

// ---------- troca, histórico e enxurrada (versão em memória, com as regras da 0006) ----------

test('cada troca entra no histórico com de e para (a primeira com de vazio)', async () => {
  const { servico, repo, agora } = novoServico();
  await servico.alterar('glopes', { responsabilidade: 'projetos_finalizando' });
  agora.andar(INTERVALO_MINIMO_MS);
  await servico.alterar('glopes', { responsabilidade: 'projetos_sem_normas' });
  assert.deepEqual(
    repo.historico.map(({ personagem, de, para }) => ({ personagem, de, para })),
    [
      { personagem: 'glopes', de: null, para: 'projetos_finalizando' },
      { personagem: 'glopes', de: 'projetos_finalizando', para: 'projetos_sem_normas' },
    ],
  );
});

test('a mesma escolha de novo não grava nada nem muda a hora', async () => {
  const { servico, repo, agora } = novoServico();
  const primeira = await servico.alterar('laura', { responsabilidade: 'atualizacoes' });
  agora.andar(500); // dentro da janela: a repetição não é enxurrada, é a mesma coisa
  const repetida = await servico.alterar('laura', { responsabilidade: 'atualizacoes' });
  assert.equal(repetida.status, 200);
  assert.deepEqual(repetida.corpo, primeira.corpo);
  assert.equal(repo.historico.length, 1);
});

test('429 (esperar 3 s) se a mesma pessoa mudou há menos de 3 segundos; depois disso, pode', async () => {
  const { servico, repo, agora } = novoServico();
  await servico.alterar('damaris', { responsabilidade: 'projetos' });
  agora.andar(INTERVALO_MINIMO_MS - 1);
  const cedo = await servico.alterar('damaris', { responsabilidade: 'atualizacoes' });
  assert.equal(cedo.status, 429);
  assert.equal(cedo.esperarSegundos, 3);
  assert.equal(typeof cedo.corpo.erro, 'string');
  // Outra pessoa não espera.
  assert.equal((await servico.alterar('gdressano', { responsabilidade: 'projetos' })).status, 200);
  agora.andar(1);
  assert.equal((await servico.alterar('damaris', { responsabilidade: 'atualizacoes' })).status, 200);
  assert.equal(repo.historico.filter((h) => h.personagem === 'damaris').length, 2);
});

test('20 trocas ao mesmo tempo para a mesma pessoa: no máximo 1 linha no histórico', async () => {
  const { servico, repo } = novoServico();
  const chaves = Array.from({ length: 20 }, (_, i) => RESPONSABILIDADES[i % 4]);
  const resultados = await Promise.all(chaves.map((chave) => servico.alterar('ramon', { responsabilidade: chave })));
  assert.equal(repo.historico.length, 1);
  assert.equal(resultados.filter((r) => r.status === 200 && r.corpo.chave !== 'atualizacoes').length, 0);
  assert.ok(resultados.every((r) => r.status === 200 || r.status === 429));
});

test(`teto da equipe: no máximo ${TETO_POR_MINUTO} trocas por minuto (429, esperar 60 s)`, async () => {
  // Uma equipe grande de mentira, para passar do teto sem esbarrar nos 3 s por pessoa.
  const nomes = Array.from({ length: TETO_POR_MINUTO + 1 }, (_, i) => `p${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + (i % 26))}`);
  const { servico, repo, agora } = novoServico(responsabilidadesMemoria(), () => nomes.map((personagem) => ({ personagem })));
  for (const personagem of nomes.slice(0, TETO_POR_MINUTO)) {
    assert.equal((await servico.alterar(personagem, { responsabilidade: 'projetos' })).status, 200);
  }
  const lotado = await servico.alterar(nomes.at(-1), { responsabilidade: 'projetos' });
  assert.deepEqual([lotado.status, lotado.esperarSegundos], [429, 60]);
  assert.equal(repo.historico.length, TETO_POR_MINUTO);
  agora.andar(60_000);
  assert.equal((await servico.alterar(nomes.at(-1), { responsabilidade: 'projetos' })).status, 200);
});

test(`poda do histórico: só os últimos ${HISTORICO_DIAS} dias`, async () => {
  const { servico, repo, agora } = novoServico();
  await servico.alterar('leonardo', { responsabilidade: 'projetos' });
  agora.andar(HISTORICO_DIAS * DIA + 1);
  await servico.alterar('leonardo', { responsabilidade: 'atualizacoes' });
  assert.deepEqual(repo.historico.map((h) => h.para), ['atualizacoes']);
});

test(`poda do histórico: no máximo ${HISTORICO_MAX} trocas`, async () => {
  const repo = responsabilidadesMemoria();
  for (let i = 0; i <= HISTORICO_MAX; i += 1) {
    // Uma troca a cada 3 s (abaixo do teto da equipe), alternando a chave.
    await repo.alterar({ personagem: 'ramon', para: RESPONSABILIDADES[i % 2], agora: new Date(INICIO + i * INTERVALO_MINIMO_MS) });
  }
  assert.equal(repo.historico.length, HISTORICO_MAX);
  assert.equal(repo.historico.at(-1).alteradaEm, new Date(INICIO + HISTORICO_MAX * INTERVALO_MINIMO_MS).toISOString());
});

test('hora gravada no futuro (relógio adiantado) não trava a troca', async () => {
  const repo = responsabilidadesMemoria();
  await repo.alterar({ personagem: 'ramon', para: 'projetos', agora: new Date(INICIO + DIA) });
  const { servico } = novoServico(repo);
  assert.equal((await servico.alterar('ramon', { responsabilidade: 'atualizacoes' })).status, 200);
});

// ---------- lista ----------

test('a lista traz só quem tem escolha gravada e é da equipe', async () => {
  const repo = responsabilidadesMemoria();
  const em = new Date('2026-11-04T12:00:00.000Z');
  await repo.alterar({ personagem: 'leonardo', para: 'projetos_finalizando', agora: em });
  await repo.alterar({ personagem: 'nathalia', para: 'projetos', agora: em }); // fora da equipe
  const { servico } = novoServico(repo);
  assert.deepEqual(await servico.listar(), {
    responsabilidades: { leonardo: { chave: 'projetos_finalizando', alteradaEm: em.toISOString() } },
  });
});

// ---------- Supabase ----------

// Supabase falso: a tabela é uma lista, e a RPC imita alterar_responsabilidade (a
// trava do banco vira "roda inteira de uma vez", como no Postgres). A hora vem do
// relógio do teste, como o clock_timestamp() do banco.
function supabaseFalso({ linhas = [], falhar = null, rpc = null, agora = () => new Date(INICIO) } = {}) {
  const pedidos = [];
  const historico = [];
  const tabela = new Map(linhas.map((l) => [l.personagem, l]));
  const pedir = async (caminho, opcoes = {}) => {
    pedidos.push({ caminho, ...opcoes, corpo: opcoes.body ? JSON.parse(opcoes.body) : undefined });
    if (falhar) throw falhar();
    if (caminho.startsWith('/compilacao_responsabilidades?')) return [...tabela.values()];
    if (caminho !== '/rpc/alterar_responsabilidade') throw erroSupabase(404, 'PGRST205');
    if (rpc) return rpc(JSON.parse(opcoes.body));
    const { p_personagem: personagem, p_para: para } = JSON.parse(opcoes.body);
    const ms = agora().getTime();
    const atual = tabela.get(personagem);
    if (atual?.responsabilidade === para) return { resultado: 'igual', ...atual };
    const passou = atual ? ms - Date.parse(atual.alterada_em) : Infinity;
    if (passou >= 0 && passou < 3000) return { resultado: 'cedo' };
    if (historico.filter((h) => Date.parse(h.alterada_em) > ms - 60_000).length >= 60) return { resultado: 'lotado' };
    const linha = { personagem, responsabilidade: para, alterada_em: new Date(ms).toISOString().replace('Z', '123+00:00') };
    tabela.set(personagem, linha);
    historico.push({ personagem, de: atual?.responsabilidade ?? null, para, alterada_em: linha.alterada_em });
    return { resultado: 'gravada', ...linha };
  };
  return { pedir, pedidos, historico };
}

test('Supabase: a troca é 1 pedido só, à função alterar_responsabilidade', async () => {
  const falso = supabaseFalso();
  const { servico } = novoServico(repositorioResponsabilidades(falso.pedir));
  const { status, corpo } = await servico.alterar('leonardo', { responsabilidade: 'projetos_sem_normas' });
  assert.equal(status, 200);
  // A hora do banco vem com microssegundos ("...00.000123+00:00") e sai em ISO.
  assert.deepEqual(corpo, { personagem: 'leonardo', chave: 'projetos_sem_normas', alteradaEm: '2026-11-04T15:00:00.000Z' });
  assert.equal(falso.pedidos.length, 1);
  assert.equal(falso.pedidos[0].caminho, '/rpc/alterar_responsabilidade');
  assert.equal(falso.pedidos[0].method, 'POST');
  assert.deepEqual(falso.pedidos[0].corpo, { p_personagem: 'leonardo', p_para: 'projetos_sem_normas' });
});

test('Supabase: 20 trocas ao mesmo tempo para a mesma pessoa, no máximo 1 linha no histórico', async () => {
  const falso = supabaseFalso();
  const { servico } = novoServico(repositorioResponsabilidades(falso.pedir));
  const chaves = Array.from({ length: 20 }, (_, i) => RESPONSABILIDADES[(i % 3) + 1]);
  const resultados = await Promise.all(chaves.map((chave) => servico.alterar('ramon', { responsabilidade: chave })));
  assert.equal(falso.historico.length, 1);
  assert.ok(falso.pedidos.every((p) => p.caminho === '/rpc/alterar_responsabilidade'), 'nenhuma leitura fora da função');
  assert.equal(resultados.filter((r) => r.status === 429).length, 20 - resultados.filter((r) => r.status === 200).length);
});

for (const [resultado, status, espera] of [
  ['cedo', 429, 3],
  ['lotado', 429, 60],
  ['invalida', 400, undefined],
]) {
  test(`Supabase: resposta "${resultado}" da função vira ${status}`, async () => {
    const { pedir } = supabaseFalso({ rpc: () => ({ resultado }) });
    const { servico } = novoServico(repositorioResponsabilidades(pedir));
    const r = await servico.alterar('ramon', { responsabilidade: 'projetos' });
    assert.deepEqual([r.status, r.esperarSegundos], [status, espera]);
  });
}

for (const [nome, resposta] of [
  ['resultado desconhecido', { resultado: 'talvez' }],
  ['sem resultado', {}],
  ['nulo', null],
  ['gravada sem hora', { resultado: 'gravada', personagem: 'ramon', responsabilidade: 'projetos' }],
  ['gravada com chave fora da lista', { resultado: 'gravada', personagem: 'ramon', responsabilidade: 'chefe', alterada_em: '2026-11-04T15:00:00+00:00' }],
  ['igual sem chave', { resultado: 'igual', personagem: 'ramon', alterada_em: '2026-11-04T15:00:00+00:00' }],
]) {
  test(`Supabase: resposta da função fora do formato (${nome}) é falha (502)`, async () => {
    const { pedir } = supabaseFalso({ rpc: () => resposta });
    const { servico } = novoServico(repositorioResponsabilidades(pedir));
    await assert.rejects(() => servico.alterar('ramon', { responsabilidade: 'projetos' }), SupabaseError);
  });
}

test('Supabase: a lista é um select só, convertido para o formato da API, sem chave inválida', async () => {
  const linhas = [
    { personagem: 'laura', responsabilidade: 'projetos_finalizando', alterada_em: '2026-11-04T10:00:00+00:00' },
    { personagem: 'ramon', responsabilidade: 'chefe', alterada_em: '2026-11-04T10:00:00+00:00' },
  ];
  const { pedir, pedidos } = supabaseFalso({ linhas });
  const { servico } = novoServico(repositorioResponsabilidades(pedir));
  assert.deepEqual(await servico.listar(), {
    responsabilidades: { laura: { chave: 'projetos_finalizando', alteradaEm: '2026-11-04T10:00:00.000Z' } },
  });
  assert.equal(pedidos.length, 1);
});

for (const codigo of ['PGRST205', '42P01', 'PGRST202', '42883']) {
  test(`migração não rodada (${codigo}): a lista vem vazia com aviso e a troca responde 503`, async () => {
    const { pedir } = supabaseFalso({ falhar: () => erroSupabase(404, codigo) });
    const { servico } = novoServico(repositorioResponsabilidades(pedir));
    const lista = await servico.listar();
    assert.deepEqual(lista.responsabilidades, {});
    assert.match(lista.aviso, /0006/);
    const troca = await servico.alterar('ramon', { responsabilidade: 'projetos' });
    assert.equal(troca.status, 503);
    assert.match(troca.corpo.erro, /0006/);
  });
}

for (const [nome, falha] of [
  ['HTTP 500', () => erroSupabase(500)],
  ['404 sem código (ex.: URL errada)', () => erroSupabase(404)],
  ['404 com outro código', () => erroSupabase(404, 'PGRST100')],
  ['código de migração em outro tipo de erro', () => Object.assign(new Error('fora'), { codigo: 'PGRST205' })],
]) {
  test(`outra falha do Supabase sobe e a rota responde 502: ${nome}`, async () => {
    const { pedir } = supabaseFalso({ falhar: falha });
    const { servico } = novoServico(repositorioResponsabilidades(pedir));
    await assert.rejects(() => servico.listar());
    await assert.rejects(() => servico.alterar('ramon', { responsabilidade: 'projetos' }));
  });
}

test('fila da trava passou de 2 s (55P03): 429 com esperar 3 s', async () => {
  const { pedir } = supabaseFalso({ rpc: () => { throw erroSupabase(500, '55P03'); } });
  const { servico } = novoServico(repositorioResponsabilidades(pedir));
  const r = await servico.alterar('ramon', { responsabilidade: 'projetos' });
  assert.deepEqual([r.status, r.esperarSegundos, r.corpo.erro], [429, 3, 'Muitas trocas agora. Tente de novo em instantes.']);
});

// fetch falso: cada pedido ao Supabase responde com `status` e `corpo`.
async function comFetch(status, corpo, acao) {
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async () => new Response(corpo, { status });
  try {
    const pedir = criarClienteSupabase({ url: 'https://exemplo.invalid', chave: 'sb_secret_teste' });
    return await acao(novoServico(repositorioResponsabilidades(pedir)).servico);
  } finally {
    globalThis.fetch = fetchAntes;
  }
}

test('o cliente do Supabase leva status e código do PostgREST no erro (tabela ausente = 503)', () =>
  comFetch(404, '{"code":"PGRST205","message":"Could not find the table"}', async (servico) => {
    assert.match((await servico.listar()).aviso, /0006/);
    assert.equal((await servico.alterar('ramon', { responsabilidade: 'projetos' })).status, 503);
  }));

test('o cliente do Supabase: 55P03 vindo do PostgREST vira 429', () =>
  comFetch(500, '{"code":"55P03","message":"canceling statement due to lock timeout"}', async (servico) => {
    assert.equal((await servico.alterar('ramon', { responsabilidade: 'projetos' })).status, 429);
  }));

test('o cliente do Supabase: função ausente (PGRST202) na troca = 503', () =>
  comFetch(404, '{"code":"PGRST202","message":"Could not find the function"}', async (servico) => {
    assert.equal((await servico.alterar('ramon', { responsabilidade: 'projetos' })).status, 503);
  }));

test('404 do Supabase sem o código de migração (ou sem JSON) é falha, não "rode a migração"', async () => {
  for (const corpo of ['{"code":"PGRST100"}', '<html>not found</html>', '']) {
    await comFetch(404, corpo, async (servico) => {
      await assert.rejects(() => servico.listar(), (erro) => erro instanceof SupabaseError && erro.status === 404, corpo);
    });
  }
});

// ---------- migração 0006 (o SQL não roda aqui; confere o que não pode faltar) ----------

test('migração 0006: troca atômica, só o servidor executa, histórico com checks, índice e poda', async () => {
  const sql = await readFile(new URL('../supabase/migrations/0006_compilacao_responsabilidades.sql', import.meta.url), 'utf8');
  for (const trecho of [
    /security definer/,
    /set search_path = public, pg_temp/,
    /set_config\('lock_timeout', '2s', true\);\s+perform pg_advisory_xact_lock/,
    /grant select on public\.compilacao_responsabilidades to service_role/,
    /clock_timestamp\(\)/,
    /interval '3 seconds'/,
    /interval '1 minute'\) >= 60/,
    /interval '90 days'/,
    /- 5000/,
    /de\s+text check \(de is null or de in/,
    /para\s+text\s+not null check \(para in/,
    /on public\.compilacao_responsabilidades_historico \(alterada_em\)/,
    /revoke execute on function public\.alterar_responsabilidade\(text, text\) from public, anon, authenticated/,
    /grant execute on function public\.alterar_responsabilidade\(text, text\) to service_role/,
    /enable row level security/,
  ]) {
    assert.match(sql, trecho);
  }
  // As 4 chaves do servidor são as mesmas dos checks do banco.
  for (const chave of RESPONSABILIDADES) assert.equal(sql.split(`'${chave}'`).length - 1 >= 4, true, chave);
});

// ---------- rotas HTTP (memória: sem SUPABASE_* no ambiente do teste) ----------

delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
const URL_BASE = 'http://x/api/compilacao/responsabilidades';
const put = (personagem, corpo) =>
  tratarApi(new Request(`${URL_BASE}/${personagem}`, { method: 'PUT', body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }));

async function comEquipe(config, corpo) {
  const antes = process.env.COMPILACAO_EQUIPE;
  process.env.COMPILACAO_EQUIPE = config;
  try {
    return await corpo();
  } finally {
    if (antes === undefined) delete process.env.COMPILACAO_EQUIPE;
    else process.env.COMPILACAO_EQUIPE = antes;
  }
}
const comEquipeSintetica = (corpo) => comEquipe(JSON.stringify(EQUIPE_CONFIG), corpo);

test('HTTP: PUT grava, GET lista para todos, sem cache; troca cedo demais dá 429 com Retry-After', () =>
  comEquipeSintetica(async () => {
    const resposta = await put('leonardo', { responsabilidade: 'projetos_finalizando' });
    assert.equal(resposta.status, 200);
    assert.equal(resposta.headers.get('retry-after'), null);
    const gravada = await resposta.json();
    assert.equal(gravada.chave, 'projetos_finalizando');

    const lista = await tratarApi(new Request(URL_BASE));
    assert.equal(lista.status, 200);
    assert.equal(lista.headers.get('cache-control'), 'no-store');
    assert.deepEqual((await lista.json()).responsabilidades.leonardo, { chave: 'projetos_finalizando', alteradaEm: gravada.alteradaEm });

    const cedo = await put('leonardo', { responsabilidade: 'projetos' });
    assert.equal(cedo.status, 429);
    assert.equal(cedo.headers.get('retry-after'), '3');
    assert.equal(typeof (await cedo.json()).erro, 'string');
  }));

test('HTTP: corpo que não é JSON dá 400 no mesmo formato da validação', () =>
  comEquipeSintetica(async () => {
    const resposta = await put('ramon', '{nao e json');
    assert.equal(resposta.status, 400);
    assert.equal(typeof (await resposta.json()).erros.responsabilidade, 'string');
    assert.equal((await put('ramon', { responsabilidade: 'chefe' })).status, 400);
  }));

test('HTTP: corpo grande demais dá 413, medido em bytes', () =>
  comEquipeSintetica(async () => {
    assert.equal((await put('ramon', { responsabilidade: 'projetos', sobra: 'x'.repeat(2000) })).status, 413);
    // 600 "ç" são 600 caracteres, mas 1.200 bytes: passa de 1 KB.
    assert.equal((await put('ramon', { responsabilidade: 'projetos', sobra: 'ç'.repeat(600) })).status, 413);
    assert.equal((await put('ramon', { responsabilidade: 'projetos', sobra: 'x'.repeat(600) })).status, 200);
  }));

test('HTTP: personagem fora da equipe ou fora do formato dá 404', () =>
  comEquipeSintetica(async () => {
    assert.equal((await put('fulano', { responsabilidade: 'projetos' })).status, 404);
    assert.equal((await put('Leonardo', { responsabilidade: 'projetos' })).status, 404);
    assert.equal((await put('%E0%A4%A', { responsabilidade: 'projetos' })).status, 404);
  }));

test('HTTP: métodos que não existem dão 405', () =>
  comEquipeSintetica(async () => {
    assert.equal((await tratarApi(new Request(`${URL_BASE}/ramon`))).status, 405);
    assert.equal((await tratarApi(new Request(URL_BASE, { method: 'PUT', body: '{}' }))).status, 405);
  }));

test('HTTP: configuração da equipe inválida dá 502 com mensagem segura', () =>
  comEquipe('{nao e json', async () => {
    const resposta = await put('ramon', { responsabilidade: 'projetos' });
    assert.equal(resposta.status, 502);
    assert.match((await resposta.json()).erro, /COMPILACAO_EQUIPE/);
  }));
