import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AGORA,
  EQUIPE_CONFIG,
  auditoriaSintetica,
  estoqueSintetico,
  planilhasSinteticas,
  registro,
} from '../scripts/lib/compilacao/compilacao-sintetica.mjs';
import { CompilacaoError } from '../scripts/lib/compilacao/configuracao.mjs';
import { MAX_PAGINAS_NORMAS, MAX_PAGINAS_SEM_VERSAO, MAX_PARES, buscarCompilacao, lerPlanilhas } from './compilacao.mjs';
import { LegislacaoError } from './legislacao.mjs';

// Cadastro de cidades inventado: ids 1001-1009, "Cidade A-XX" etc.
const CIDADES = ['A', 'B', 'C', 'D', 'E'].map((letra, i) => ({
  id: 1001 + i,
  nome: `Cidade ${letra}`,
  uf: 'XX',
  nomeUf: `Cidade ${letra}-XX`,
}));
const cidadeUfDoId = new Map(CIDADES.map((c) => [c.id, c.nomeUf]));

// Normas vinculadas (vinculada = 1) por cidade, inventadas.
const VINCULADAS = { 1001: 7, 1002: 0, 1003: 12 };

// Norma sem versão inventada, no formato da listagem de Normas/Get (só os campos da regra).
const normaSemVersao = (id, extra = {}) => ({
  id,
  situacaoSingular: 'Não consta revogação expressa',
  eficaciaPrejudicada: false,
  classificacao: 'Assunto inventado',
  observacoes: null,
  ementaAssunto: 'Ementa inventada.',
  ...extra,
});
// Lista sem versão de cada par: as primeiras `ignoradas` com "Eficácia prejudicada".
const listaDoEstoque = (e, base) =>
  Array.from({ length: e.naoVersionadas }, (_, i) =>
    normaSemVersao(base + i, i < (e.ignoradas ?? 0) ? { situacaoSingular: 'Eficácia prejudicada' } : {}),
  );

// Cliente falso do Legislação Digital: responde com as fixtures e grava cada pedido.
// `semVersao` troca a lista sem versão de um par ("Cidade A-XX|28") por { items, total? }.
function clienteFalso({ auditoria = auditoriaSintetica(), estoque = estoqueSintetico, semVersao = {}, falhar = () => false } = {}) {
  const pedidos = [];
  const anotar = (metodo, controller, filtros, opcoes) => {
    pedidos.push({ metodo, controller, filtros, opcoes });
    if (falhar(controller, filtros)) throw new LegislacaoError('O Legislação Digital respondeu HTTP 500 em teste.');
  };
  return {
    pedidos,
    async listarTudo(controller, filtros = {}) {
      anotar('listarTudo', controller, filtros);
      if (controller === 'ModulosNorma') return [];
      if (controller === 'Cidades') return CIDADES;
      const entrada = auditoria[filtros.usuarioId] ?? {};
      if (filtros.modulo === 'Normas') return (filtros.acao === 1 ? entrada.normasIncluidas : entrada.normas) ?? [];
      return entrada.versoes ?? [];
    },
    // Normas: uma página da lista sem versão de um par. Auditoria: uma página da lista
    // de inclusões em Normas (Atualizações), da mais nova para a mais antiga.
    async pagina(controller, filtros = {}, { page = 0, limit = 2000 } = {}) {
      anotar('pagina', controller, filtros, { page, limit });
      if (controller === 'Normas') {
        const chave = `${cidadeUfDoId.get(filtros.cidadeId)}|${filtros.moduloId}`;
        const e = estoque[chave] ?? { naoVersionadas: 0 };
        const { items = listaDoEstoque(e, filtros.cidadeId * 100_000), total = items.length } = semVersao[chave] ?? {};
        return { items: items.slice(page * limit, (page + 1) * limit), total };
      }
      const entrada = auditoria[filtros.usuarioId] ?? {};
      const itens = entrada.normasIncluidas ?? [];
      return { items: itens.slice(page * limit, (page + 1) * limit), total: entrada.normasIncluidasTotal ?? itens.length };
    },
    async primeiraPagina(controller, filtros = {}) {
      anotar('primeiraPagina', controller, filtros);
      return auditoria[filtros.usuarioId]?.recentes ?? [];
    },
    async contar(controller, filtros = {}) {
      anotar('contar', controller, filtros);
      if (filtros.vinculada === 1) return VINCULADAS[filtros.cidadeId] ?? 0;
      const e = estoque[`${cidadeUfDoId.get(filtros.cidadeId)}|${filtros.moduloId}`];
      if (!e) return 0;
      if (filtros.versionada === 1) return e.versionadas;
      if (filtros.versionada === 2) return e.naoVersionadas;
      return e.total;
    },
  };
}

// Supabase falso: devolve as linhas das planilhas em páginas de no máximo `limit`.
function supabaseFalso(planilhas = planilhasSinteticas, { falhar = false } = {}) {
  const caminhos = [];
  const pedir = async (caminho) => {
    caminhos.push(caminho);
    if (falhar) throw new Error('Supabase fora (teste)');
    const url = new URL(`https://exemplo.invalid${caminho}`);
    const tabela = url.pathname.endsWith('_abas') ? planilhas.abas : planilhas.linhas;
    const limit = Number(url.searchParams.get('limit'));
    const offset = Number(url.searchParams.get('offset'));
    return tabela.slice(offset, offset + limit);
  };
  pedir.caminhos = caminhos;
  return pedir;
}

const ENV = { COMPILACAO_EQUIPE: JSON.stringify(EQUIPE_CONFIG) };
const buscar = (extra = {}) =>
  buscarCompilacao({ cliente: clienteFalso(), pedirSupabase: supabaseFalso(), env: ENV, agora: AGORA, avisar: () => {}, ...extra });

test('monta as 7 pessoas com os números do sistema e das planilhas', async () => {
  const dados = await buscar();
  assert.equal(Object.keys(dados.pessoas).length, 7);
  assert.deepEqual(
    [dados.pessoas.leonardo.projeto.total, dados.pessoas.leonardo.projeto.compiladas, dados.pessoas.leonardo.projeto.aguardando],
    [40, 30, 10],
  );
  assert.deepEqual([dados.pessoas.gdressano.producao.mes, dados.pessoas.gdressano.fontes.mes], [1, 'sistema']);
  assert.deepEqual([dados.pessoas.gdressano.producao.tudo, dados.pessoas.gdressano.fontes.tudo], [120, 'sistema']);
  assert.deepEqual(dados.pessoas.gdressano.aguardando, { valor: 4, fonte: 'planilha', mes: '2026-11' });
});

test('fica dentro do limite de pedidos por busca (≤ 40) e só lê as rotas permitidas', async () => {
  const cliente = clienteFalso();
  await buscar({ cliente });
  assert.ok(cliente.pedidos.length <= 40, `foram ${cliente.pedidos.length} pedidos`);
  for (const { controller } of cliente.pedidos) assert.ok(['Auditoria', 'Normas', 'Cidades', 'ModulosNorma'].includes(controller));
});

test('a Auditoria é sempre pedida por pessoa, com o período certo', async () => {
  const cliente = clienteFalso();
  await buscar({ cliente });
  const daAuditoria = cliente.pedidos.filter((p) => p.controller === 'Auditoria');
  assert.ok(daAuditoria.every((p) => /^\d+$/.test(String(p.filtros.usuarioId))));
  const versoes = daAuditoria.filter((p) => p.filtros.modulo === 'Versões');
  // Versões só para quem faz Projetos (4 pessoas).
  assert.deepEqual(versoes.map((p) => String(p.filtros.usuarioId)).sort(), ['900001', '900002', '900003', '900004']);
  // Do mais cedo entre o começo da semana, do mês e da janela de 16 dias, até hoje.
  assert.ok(versoes.every((p) => p.filtros.dataInicial === '2026-10-19' && p.filtros.dataFinal === '2026-11-04'));
  assert.ok(versoes.every((p) => p.filtros.acao === 1), 'só as inclusões');
  // Normas recentes (janela) de quem faz Projetos e as inclusões em Normas de Atualizações.
  const normas = daAuditoria.filter((p) => p.filtros.modulo === 'Normas');
  assert.equal(normas.filter((p) => p.metodo === 'listarTudo').length, 4);
  const inclusoes = normas.filter((p) => p.metodo === 'pagina');
  assert.deepEqual(inclusoes.map((p) => String(p.filtros.usuarioId)).sort(), ['900005', '900006', '900007']);
});

test('o estoque de cada par cidade×tipo: contagens do total e da versionada 1, e a lista da versionada 2', async () => {
  const cliente = clienteFalso();
  await buscar({ cliente });
  const doEstoque = cliente.pedidos.filter((p) => p.controller === 'Normas' && p.filtros.moduloId !== undefined);
  assert.equal(doEstoque.length, 5 * 3); // A|28, A|24, B|23, B|24, C|28
  const contagens = doEstoque.filter((p) => p.metodo === 'contar');
  assert.deepEqual(contagens.map((p) => p.filtros.versionada ?? 0).sort(), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  const listas = doEstoque.filter((p) => p.metodo === 'pagina');
  assert.equal(listas.length, 5);
  assert.ok(listas.every((p) => p.filtros.versionada === 2 && p.opcoes.page === 0 && p.opcoes.limit === 2000));
  assert.ok(listas.every((p) => Object.keys(p.filtros).sort().join() === 'cidadeId,moduloId,versionada'));
});

// ---------- normas ignoradas no aguardando de Projetos Novos ----------

const paginasDoPar = (cliente, cidadeId, moduloId) =>
  cliente.pedidos.filter((p) => p.metodo === 'pagina' && p.controller === 'Normas' && p.filtros.cidadeId === cidadeId && p.filtros.moduloId === moduloId);

test('as normas ignoradas saem do aguardando: situação, classificação e arquivo ilegível, cada uma uma vez', async () => {
  const items = [
    normaSemVersao(1),
    normaSemVersao(2, { situacaoSingular: 'Eficácia prejudicada' }),
    normaSemVersao(3, { classificacao: 'Finanças e orçamento público' }),
    normaSemVersao(4, { situacaoSingular: 'Eficácia prejudicada', classificacao: 'Finanças e orçamento público' }),
    normaSemVersao(5, { observacoes: 'PDF ilegível' }),
    normaSemVersao(6, { classificacao: 'Finanças e orçamento' }), // sem "público": continua
    ...Array.from({ length: 4 }, (_, i) => normaSemVersao(7 + i)),
  ];
  const dados = await buscar({ cliente: clienteFalso({ semVersao: { 'Cidade A-XX|28': { items } } }) });
  const { leonardo } = dados.pessoas;
  assert.deepEqual(
    [leonardo.projeto.total, leonardo.projeto.compiladas, leonardo.projeto.aguardando, leonardo.projeto.ignoradas],
    [40, 30, 6, 4],
  );
  assert.deepEqual(leonardo.aguardando, { valor: 6, fonte: 'normas' });
  assert.equal(dados.fila.projetos, 105 - 4);
});

test('lista sem versão com mais de 2.000 segue de página em página', async () => {
  const estoque = { ...estoqueSintetico, 'Cidade A-XX|28': { total: 4530, versionadas: 30, naoVersionadas: 4500, ignoradas: 2100 } };
  const cliente = clienteFalso({ estoque });
  const dados = await buscar({ cliente });
  assert.deepEqual(paginasDoPar(cliente, 1001, 28).map((p) => p.opcoes.page), [0, 1, 2]);
  assert.deepEqual([dados.pessoas.leonardo.projeto.aguardando, dados.pessoas.leonardo.projeto.ignoradas], [2400, 2100]);
});

test(`lista sem versão com mais de ${MAX_PAGINAS_SEM_VERSAO} páginas não é lida: o par fica "—", com aviso`, async () => {
  const naoVersionadas = MAX_PAGINAS_SEM_VERSAO * 2000 + 1;
  const estoque = { ...estoqueSintetico, 'Cidade A-XX|28': { total: naoVersionadas + 30, versionadas: 30, naoVersionadas, ignoradas: 0 } };
  const cliente = clienteFalso({ estoque });
  const avisos = [];
  const dados = await buscar({ cliente, avisar: (m) => avisos.push(m) });
  assert.equal(paginasDoPar(cliente, 1001, 28).length, 1, 'para na 1ª página, que já traz o total');
  assert.deepEqual([dados.pessoas.leonardo.projeto.total, dados.pessoas.leonardo.aguardando.valor], [null, null]);
  assert.ok(avisos.some((m) => m.includes('estoque')));
  assert.equal(dados.pessoas.glopes.projeto.aguardando, 40, 'os outros pares seguem');
});

test('lista sem versão incompleta, com norma repetida ou fora do formato deixa o par "—", nunca um número chutado', async () => {
  const dez = Array.from({ length: 10 }, (_, i) => normaSemVersao(i + 1));
  const { situacaoSingular: _, ...semSituacao } = normaSemVersao(10);
  const casos = {
    incompleta: { items: dez.slice(0, 9), total: 10 },
    repetida: { items: [...dez.slice(0, 9), normaSemVersao(1)] },
    foraDoFormato: { items: [...dez.slice(0, 9), semSituacao] },
    itemNulo: { items: [...dez.slice(0, 9), null] },
  };
  for (const [caso, lista] of Object.entries(casos)) {
    const dados = await buscar({ cliente: clienteFalso({ semVersao: { 'Cidade A-XX|28': lista } }) });
    assert.deepEqual([dados.pessoas.leonardo.projeto.total, dados.pessoas.leonardo.aguardando.valor], [null, null], caso);
    assert.equal(dados.pessoas.glopes.projeto.aguardando, 40, caso);
  }
});

test('falha na lista sem versão de um par deixa só aquele projeto "—" (nunca 0)', async () => {
  const falhar = (controller, f) => controller === 'Normas' && f.versionada === 2 && f.cidadeId === 1001 && f.moduloId === 28;
  const dados = await buscar({ cliente: clienteFalso({ falhar }) });
  assert.deepEqual([dados.pessoas.leonardo.projeto.total, dados.pessoas.leonardo.aguardando.valor], [null, null]);
  assert.equal(dados.pessoas.ramon.projeto.aguardando, 40);
  assert.equal(dados.fila.projetos, 105 - 10);
});

test('pessoa cuja Auditoria trouxe ações de outra pessoa (filtro ignorado) fica "—"', async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900001].versoes.push(registro({ usuario: 900002, data: '2026-11-04' }));
  const avisos = [];
  const dados = await buscar({ cliente: clienteFalso({ auditoria }), avisar: (m) => avisos.push(m) });
  assert.deepEqual(dados.pessoas.leonardo.producao, { hoje: null, semana: null, mes: null, tudo: null });
  assert.equal(dados.pessoas.ramon.producao.hoje, 2);
  assert.ok(avisos.some((m) => m.includes('leonardo')));
});

test('se ninguém responder, a busca falha (o cache antigo continua)', async () => {
  const cliente = clienteFalso({ falhar: (controller) => controller === 'Auditoria' });
  await assert.rejects(() => buscar({ cliente }), LegislacaoError);
});

test('sem a configuração da equipe, erro seguro de configuração', async () => {
  await assert.rejects(() => buscar({ env: {} }), CompilacaoError);
});

test('sem Supabase, Atualizações tem as normas do sistema e fica sem carteira e aguardando', async () => {
  const dados = await buscar({ pedirSupabase: null });
  assert.deepEqual([dados.pessoas.gdressano.producao.mes, dados.pessoas.gdressano.producao.tudo], [1, 120]);
  assert.deepEqual(dados.pessoas.gdressano.aguardando, { valor: null, fonte: null });
  assert.deepEqual(dados.pessoas.gdressano.cidades, []);
  assert.equal(dados.pessoas.leonardo.producao.mes, 6);
});

test('Supabase fora do ar não derruba a busca', async () => {
  const dados = await buscar({ pedirSupabase: supabaseFalso(planilhasSinteticas, { falhar: true }) });
  assert.equal(dados.pessoas.damaris.producao.tudo, 250);
  assert.equal(dados.pessoas.damaris.aguardando.valor, null);
  assert.equal(dados.pessoas.leonardo.producao.hoje, 3);
});

test('estoque que não respondeu deixa só aquele projeto em "—"', async () => {
  const cliente = clienteFalso({ falhar: (controller, f) => controller === 'Normas' && f.cidadeId === 1001 });
  const dados = await buscar({ cliente });
  assert.equal(dados.pessoas.leonardo.projeto.total, null);
  assert.equal(dados.pessoas.glopes.projeto.total, 80);
});

test('D12 opção B pelo ambiente: Hoje e Semana de Atualizações ficam "—"', async () => {
  const dados = await buscar({ env: { ...ENV, COMPILACAO_ATUALIZACOES_DIA_SEMANA: 'vazio' } });
  assert.equal(dados.pessoas.damaris.producao.hoje, null);
  assert.equal(dados.pessoas.leonardo.producao.hoje, 3);
});

test('a resposta não leva id de cidade, id de usuário nem login', async () => {
  const texto = JSON.stringify(await buscar());
  for (const proibido of ['1001', '1002', '9000', 'login.sintetico', 'Pessoa Sintetica', 'cidadeId', 'usuarioId']) {
    assert.ok(!texto.includes(proibido), `vazou: ${proibido}`);
  }
});

test('lerPlanilhas pagina de 1.000 em 1.000 (limite do Supabase) e pede só as colunas usadas', async () => {
  const linhas = Array.from({ length: 1003 }, (_, i) => ({ personagem: 'damaris', ano: 2026, mes: 10, i }));
  const pedir = supabaseFalso({ abas: [], linhas });
  const { linhas: lidas } = await lerPlanilhas(pedir, ['damaris']);
  assert.equal(lidas.length, 1003);
  const daTabela = pedir.caminhos.filter((c) => c.startsWith('/compilacao_planilhas?'));
  assert.equal(daTabela.length, 2);
  for (const caminho of pedir.caminhos) {
    assert.ok(!/faltantes|avisos|sha256|sigla_planilha,/.test(new URL(`https://x.invalid${caminho}`).searchParams.get('select')));
    assert.match(caminho, /personagem=in\.\(damaris\)/);
    assert.match(caminho, /order=/);
  }
});

test('lerPlanilhas sem Supabase devolve null; sem ninguém de Atualizações, listas vazias sem pedir nada', async () => {
  assert.equal(await lerPlanilhas(null, ['damaris']), null);
  const pedir = supabaseFalso();
  assert.deepEqual(await lerPlanilhas(pedir, []), { abas: [], linhas: [] });
  assert.equal(pedir.caminhos.length, 0);
});

test('no fim do mês, todos pedem o mês inteiro (o Mês vem do sistema para todos)', async () => {
  const cliente = clienteFalso();
  await buscar({ cliente, agora: new Date('2026-11-25T15:00:00Z') });
  const versoes = cliente.pedidos.filter((p) => p.controller === 'Auditoria' && p.filtros.modulo === 'Versões');
  const inicio = (id) => versoes.find((p) => String(p.filtros.usuarioId) === id).filtros.dataInicial;
  assert.equal(inicio('900001'), '2026-11-01'); // Projetos: o mês
});

// ---------- Atualizações: inclusões em Normas da Auditoria ----------

const inclusoesPedidas = (cliente, id) =>
  cliente.pedidos.filter((p) => p.metodo === 'pagina' && String(p.filtros.usuarioId) === id);
const inclusao = (extra) => registro({ modulo: 'Normas', tipo: 'Lei Ordinária', usuario: 900005, cidade: 'Cidade D-XX', ...extra });

test('Atualizações: 1 pedido por pessoa (página 0 de 2.000, desde 2000 até hoje) traz o período e o total de todo o tempo', async () => {
  const cliente = clienteFalso();
  const dados = await buscar({ cliente });
  for (const id of ['900005', '900006', '900007']) {
    const pedidos = inclusoesPedidas(cliente, id);
    assert.equal(pedidos.length, 1, id);
    // Só dataFinal, sem dataInicial, o painel devolve 0: as duas datas vão sempre.
    assert.deepEqual(pedidos[0].filtros, { usuarioId: id, modulo: 'Normas', acao: 1, dataInicial: '2000-01-01', dataFinal: '2026-11-04' });
    assert.deepEqual(pedidos[0].opcoes, { page: 0, limit: 2000 });
  }
  assert.deepEqual(dados.pessoas.damaris.producao, { hoje: 2, semana: 3, mes: 3, tudo: 250 });
  assert.deepEqual(dados.pessoas.damaris.fontes, { hoje: 'sistema', semana: 'sistema', mes: 'sistema', tudo: 'sistema' });
});

test('Atualizações: segue para a próxima página enquanto a mais antiga ainda é do período', async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidas = [
    ...Array.from({ length: 2001 }, (_, i) => inclusao({ numero: i + 1, data: '2026-11-03' })),
    inclusao({ numero: 9999, data: '2026-10-01' }),
  ];
  auditoria[900005].normasIncluidasTotal = 3000;
  const cliente = clienteFalso({ auditoria });
  const dados = await buscar({ cliente });
  assert.deepEqual(inclusoesPedidas(cliente, '900005').map((p) => p.opcoes.page), [0, 1]);
  assert.deepEqual([dados.pessoas.damaris.producao.mes, dados.pessoas.damaris.producao.tudo], [2001, 3000]);
});

test('Atualizações: lista fora de ordem cai para a lista do período e o Todo o Tempo fica "—"', async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidas = [inclusao({ numero: 1, data: '2026-10-01' }), inclusao({ numero: 2, data: '2026-11-04' })];
  const cliente = clienteFalso({ auditoria });
  const avisos = [];
  const dados = await buscar({ cliente, avisar: (m) => avisos.push(m) });
  const reserva = cliente.pedidos.filter((p) => p.metodo === 'listarTudo' && String(p.filtros.usuarioId) === '900005');
  assert.deepEqual(reserva.map((p) => p.filtros), [
    { usuarioId: '900005', modulo: 'Normas', acao: 1, dataInicial: '2026-10-19', dataFinal: '2026-11-04' },
  ]);
  assert.deepEqual([dados.pessoas.damaris.producao.mes, dados.pessoas.damaris.producao.tudo], [1, null]);
  assert.ok(avisos.some((m) => m.includes('damaris')));
});

test(`Atualizações: mais de ${MAX_PAGINAS_NORMAS} páginas no período deixam a pessoa "—", com aviso`, async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidas = Array.from({ length: MAX_PAGINAS_NORMAS * 2000 + 1 }, (_, i) => inclusao({ numero: i, data: '2026-11-03' }));
  auditoria[900005].normasIncluidasTotal = 99_999;
  const cliente = clienteFalso({ auditoria });
  const avisos = [];
  const dados = await buscar({ cliente, avisar: (m) => avisos.push(m) });
  assert.equal(inclusoesPedidas(cliente, '900005').length, MAX_PAGINAS_NORMAS);
  assert.deepEqual(dados.pessoas.damaris.producao, { hoje: null, semana: null, mes: null, tudo: null });
  assert.ok(avisos.some((m) => m.includes('damaris')));
  assert.equal(dados.pessoas.gdressano.producao.mes, 1);
});

test('Atualizações: inclusões com ações de outra pessoa (filtro ignorado) deixam a pessoa "—"', async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidas.splice(1, 0, inclusao({ usuario: 900006, data: '2026-11-04' }));
  const dados = await buscar({ cliente: clienteFalso({ auditoria }) });
  assert.deepEqual(dados.pessoas.damaris.producao, { hoje: null, semana: null, mes: null, tudo: null });
  assert.equal(dados.pessoas.gdressano.producao.mes, 1);
});

test('Atualizações: a resposta não leva as listas cruas da Auditoria', async () => {
  const texto = JSON.stringify(await buscar());
  for (const proibido of ['normasIncluidas', 'Lei Ordinária nº 44/2026']) assert.ok(!texto.includes(proibido), proibido);
});


test(`no máximo ${MAX_PARES} pares cidade×tipo têm estoque por busca`, async () => {
  const auditoria = auditoriaSintetica();
  const tipos = ['Lei Ordinária', 'Lei Complementar', 'Resolução'];
  for (const [i, id] of ['900001', '900002', '900003', '900004'].entries()) {
    auditoria[id].versoes = tipos.flatMap((tipo, t) =>
      [1, 2, 3].map((n) => registro({ tipo, numero: n + 10 * t, cidade: `Cidade ${'ABCD'[i]}-XX`, data: '2026-11-04', usuario: Number(id) })),
    );
  }
  const avisos = [];
  const cliente = clienteFalso({ auditoria });
  await buscar({ cliente, avisar: (m) => avisos.push(m) });
  assert.equal(cliente.pedidos.filter((p) => p.controller === 'Normas' && p.filtros.moduloId !== undefined).length, MAX_PARES * 3);
  assert.ok(avisos.some((m) => m.includes('pares')));
  // Com até 2.000 sem versão por par: 20 fixos + 6 × 3 do estoque + 4 cidades das vinculadas.
  assert.ok(cliente.pedidos.length <= 42, `foram ${cliente.pedidos.length}`);
});

// ---------- normas vinculadas da cidade do projeto (Finalizando) ----------

const vinculadasPedidas = (cliente) => cliente.pedidos.filter((p) => p.controller === 'Normas' && p.filtros.vinculada !== undefined);

test('vinculadas: 1 contagem por cidade de projeto, com vinculada 1 e sem tipo', async () => {
  const cliente = clienteFalso();
  await buscar({ cliente });
  const pedidos = vinculadasPedidas(cliente);
  // Leonardo e Ramon em A, G.Lopes em B, Laura em C: 3 cidades, 3 pedidos.
  assert.deepEqual(pedidos.map((p) => p.filtros.cidadeId).sort(), [1001, 1002, 1003]);
  for (const { metodo, filtros } of pedidos) {
    assert.equal(metodo, 'contar');
    assert.deepEqual(Object.keys(filtros).sort(), ['cidadeId', 'vinculada']);
    assert.equal(filtros.vinculada, 1);
  }
});

test('vinculadas: cada pessoa de Projetos leva o número e a cidade do seu projeto (0 é 0)', async () => {
  const { pessoas } = await buscar();
  assert.deepEqual(pessoas.leonardo.vinculadas, { valor: 7, cidade: { nome: 'Cidade A', uf: 'XX' } });
  assert.deepEqual(pessoas.ramon.vinculadas, pessoas.leonardo.vinculadas);
  assert.deepEqual(pessoas.glopes.vinculadas, { valor: 0, cidade: { nome: 'Cidade B', uf: 'XX' } });
  assert.equal(pessoas.laura.vinculadas.valor, 12);
});

test('vinculadas: sem projeto, valor e cidade ficam null', async () => {
  const { pessoas } = await buscar();
  for (const id of ['damaris', 'gdressano', 'nathalia']) assert.deepEqual(pessoas[id].vinculadas, { valor: null, cidade: null });
});

test('vinculadas: a cidade que não respondeu fica "—" com aviso, e o resto segue', async () => {
  const avisos = [];
  const cliente = clienteFalso({ falhar: (controller, f) => controller === 'Normas' && f.vinculada === 1 && f.cidadeId === 1001 });
  const { pessoas } = await buscar({ cliente, avisar: (m) => avisos.push(m) });
  assert.deepEqual(pessoas.leonardo.vinculadas, { valor: null, cidade: { nome: 'Cidade A', uf: 'XX' } });
  assert.equal(pessoas.leonardo.projeto.total, 40, 'o estoque não depende das vinculadas');
  assert.equal(pessoas.laura.vinculadas.valor, 12);
  assert.ok(avisos.some((m) => m.includes('vinculadas')));
});

test('vinculadas: cidade fora do cadastro não é pedida e fica "—"', async () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004] = {
    versoes: [1, 2, 3].map((n) => registro({ tipo: 'Resolução', numero: n, cidade: 'Cidade Z-XX', data: '2026-11-04', usuario: 900004 })),
    normas: [],
    recentes: [],
  };
  const cliente = clienteFalso({ auditoria });
  const { pessoas } = await buscar({ cliente });
  assert.deepEqual(pessoas.laura.vinculadas, { valor: null, cidade: { nome: 'Cidade Z', uf: 'XX' } });
  assert.deepEqual(vinculadasPedidas(cliente).map((p) => p.filtros.cidadeId).sort(), [1001, 1002]);
});
