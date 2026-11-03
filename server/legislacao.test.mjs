import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LegislacaoError,
  ROTAS_DE_LEITURA,
  criarClienteLegislacao,
  criarClienteLegislacaoDoAmbiente,
  lerCredenciais,
} from './legislacao.mjs';

const USUARIO = 'conta-teste';
const SENHA = 'senha-teste-xyz';
const BASE = 'https://exemplo.invalid/Admin/Api';

const json = (corpo, status = 200, extra = {}) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json', ...extra } });
const lista = (items, total = items.length, page = 0) => json({ items, page, total });
const loginOk = () => new Response('{"authenticated":true}', { status: 200, headers: { 'content-type': 'application/json', 'set-cookie': 'sessao=abc; Path=/' } });

const ehPreparo = (url) => String(url).endsWith('/Account/IsAuthenticated');

// fetch falso: grava as chamadas e responde com a próxima função/resposta da fila.
// O GET de preparo do login (Account/IsAuthenticated) fica à parte, em `preparos`,
// e é respondido sozinho; com { responderPreparo: true } ele vai para a função e
// entra em `chamadas` como qualquer outro pedido.
function fetchFalso(respostas, { responderPreparo = false } = {}) {
  const chamadas = [];
  const preparos = [];
  let emVoo = 0;
  let maxEmVoo = 0;
  const fn = async (url, opcoes) => {
    if (ehPreparo(url) && !responderPreparo) {
      preparos.push({ url: String(url), opcoes });
      return json({ authenticated: false });
    }
    chamadas.push({ url: String(url), opcoes });
    emVoo += 1;
    maxEmVoo = Math.max(maxEmVoo, emVoo);
    await new Promise((r) => setImmediate(r));
    emVoo -= 1;
    const proxima = typeof respostas === 'function' ? respostas(String(url), opcoes, chamadas.length) : respostas.shift();
    return proxima;
  };
  fn.chamadas = chamadas;
  fn.preparos = preparos;
  fn.maxEmVoo = () => maxEmVoo;
  return fn;
}

const criar = (fetch, extra = {}) =>
  criarClienteLegislacao({ usuario: USUARIO, senha: SENHA, fetch, base: BASE, pausaMs: 0, dormir: async () => {}, ...extra });

const roteiro = (url) => (url.includes('Account/Login') ? loginOk() : lista([{ a: 1 }], 1));

test('a lista de leitura tem exatamente 4 controllers', () => {
  assert.deepEqual(Object.keys(ROTAS_DE_LEITURA).sort(), ['Auditoria', 'Cidades', 'ModulosNorma', 'Normas']);
});

for (const controller of ['Usuarios', 'Normas/Get/5', '../Usuarios', 'https://evil.invalid/x', 'auditoria', '', 'Revisoes', '__proto__', 'constructor', null, 42]) {
  test(`recusa o controller ${JSON.stringify(controller)} sem chamar o fetch`, async () => {
    const f = fetchFalso(roteiro);
    const cliente = criar(f);
    await assert.rejects(() => cliente.contar(controller), LegislacaoError);
    await assert.rejects(() => cliente.listarTudo(controller), LegislacaoError);
    await assert.rejects(() => cliente.primeiraPagina(controller), LegislacaoError);
    await assert.rejects(() => cliente.ultimoItem(controller), LegislacaoError);
    assert.equal(f.chamadas.length, 0);
  });
}

test('recusa filtro com chave suspeita ou valor não simples sem chamar o fetch', async () => {
  const f = fetchFalso(roteiro);
  const cliente = criar(f);
  await assert.rejects(() => cliente.contar('Normas', { 'a=b&x': 1 }), LegislacaoError);
  await assert.rejects(() => cliente.contar('Normas', { page: 3 }), LegislacaoError);
  await assert.rejects(() => cliente.contar('Normas', { cidadeId: { x: 1 } }), LegislacaoError);
  assert.equal(f.chamadas.length, 0);
});

test('só usa POST no login e GET nas rotas de leitura', async () => {
  const f = fetchFalso(roteiro);
  await criar(f).contar('Auditoria', { usuarioId: 900001 });
  assert.deepEqual(f.chamadas.map((c) => c.opcoes.method), ['POST', 'GET']);
  assert.equal(f.chamadas[0].url, `${BASE}/Account/Login`);
  assert.ok(f.chamadas[1].url.startsWith(`${BASE}/Auditoria/Get?`));
});

test('contar pede page=0 e limit=1 e devolve o total', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([{}], 777)));
  const total = await criar(f).contar('Normas', { cidadeId: 900010 });
  assert.equal(total, 777);
  const consulta = new URL(f.chamadas[1].url).searchParams;
  assert.equal(consulta.get('page'), '0');
  assert.equal(consulta.get('limit'), '1');
  assert.equal(consulta.get('cidadeId'), '900010');
});

test('envia o cookie da sessão e não segue redirecionamentos', async () => {
  const f = fetchFalso(roteiro);
  await criar(f).contar('Cidades');
  assert.equal(f.chamadas[1].opcoes.headers.cookie, 'sessao=abc');
  assert.equal(f.chamadas[1].opcoes.redirect, 'manual');
  assert.ok(f.chamadas[1].opcoes.signal);
});

test('reaproveita a sessão em vários pedidos (um login só)', async () => {
  const f = fetchFalso(roteiro);
  const cliente = criar(f);
  await cliente.contar('Cidades');
  await cliente.contar('Normas');
  assert.equal(f.chamadas.filter((c) => c.url.includes('Login')).length, 1);
});

test('401 refaz o login uma vez e repete o pedido', async () => {
  let passou401 = false;
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    if (!passou401) {
      passou401 = true;
      return new Response('', { status: 401 });
    }
    return lista([{}], 5);
  });
  assert.equal(await criar(f).contar('Normas'), 5);
  assert.equal(f.chamadas.filter((c) => c.url.includes('Login')).length, 2);
});

test('HTML no lugar de JSON conta como sessão expirada', async () => {
  let primeira = true;
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    if (primeira) {
      primeira = false;
      return new Response('<html>login</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    }
    return lista([], 0);
  });
  assert.equal(await criar(f).contar('Normas'), 0);
});

test('redirecionamento (302) conta como sessão expirada e não é seguido', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : new Response(null, { status: 302, headers: { location: '/Admin/login' } })));
  await assert.rejects(() => criar(f).contar('Normas'), LegislacaoError);
  assert.equal(f.chamadas.length, 4); // login, GET, novo login, GET
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'GET').length, 2);
});

test('se continuar expirando depois do novo login, desiste com erro seguro', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : new Response('', { status: 401 })));
  await assert.rejects(() => criar(f).contar('Normas'), /sess/);
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'GET').length, 2);
});

test('login recusado vira erro seguro', async () => {
  const f = fetchFalso(() => new Response('', { status: 400 }));
  await assert.rejects(() => criar(f).contar('Normas'), /recusou o login/);
});

test('login com 200 mas authenticated false também é recusado', async () => {
  const f = fetchFalso(() => json({ authenticated: false }));
  await assert.rejects(() => criar(f).contar('Normas'), /recusou o login/);
  assert.equal(f.chamadas.length, 1);
});

test('o login manda username, password e rememberMe em JSON', async () => {
  const f = fetchFalso(roteiro);
  await criar(f).contar('Normas');
  const [login] = f.chamadas;
  assert.equal(login.opcoes.method, 'POST');
  assert.deepEqual(JSON.parse(login.opcoes.body), { username: USUARIO, password: SENHA, rememberMe: false });
});

test('429 e 5xx repetem com espera crescente e depois dão certo', async () => {
  const esperas = [];
  let n = 0;
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    n += 1;
    return n === 1 ? new Response('', { status: 429 }) : n === 2 ? new Response('', { status: 503 }) : lista([], 9);
  });
  const cliente = criar(f, { dormir: async (ms) => esperas.push(ms), esperaBaseMs: 100, tentativas: 3 });
  assert.equal(await cliente.contar('Normas'), 9);
  assert.deepEqual(esperas, [100, 200]);
});

test('5xx insistente desiste depois do limite de tentativas', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : new Response('', { status: 500 })));
  await assert.rejects(() => criar(f, { tentativas: 3 }).contar('Normas'), /HTTP 500/);
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'GET').length, 3);
});

test('4xx comum (404) não repete', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })));
  await assert.rejects(() => criar(f).contar('Normas'), /HTTP 404/);
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'GET').length, 1);
});

test('falha de rede vira erro seguro', async () => {
  const f = async () => {
    throw new TypeError('fetch failed https://exemplo.invalid/?token=segredo');
  };
  await assert.rejects(() => criar(f).contar('Normas'), (e) => e instanceof LegislacaoError && !/segredo/.test(e.message));
});

test('faz pausa depois de cada pedido', async () => {
  const esperas = [];
  const f = fetchFalso(roteiro);
  await criar(f, { pausaMs: 400, dormir: async (ms) => esperas.push(ms) }).contar('Normas');
  assert.deepEqual(esperas, [400]);
});

test('no máximo 2 pedidos ao mesmo tempo', async () => {
  const f = fetchFalso(roteiro);
  const cliente = criar(f);
  await cliente.contar('Cidades'); // login já feito
  await Promise.all(Array.from({ length: 8 }, () => cliente.contar('Normas')));
  assert.ok(f.maxEmVoo() <= 2, `máximo em voo: ${f.maxEmVoo()}`);
});

test('pedidos simultâneos antes do login fazem um login só', async () => {
  const f = fetchFalso(roteiro);
  const cliente = criar(f);
  await Promise.all([cliente.contar('Normas'), cliente.contar('Cidades'), cliente.contar('Auditoria')]);
  assert.equal(f.chamadas.filter((c) => c.url.includes('Login')).length, 1);
});

test('listarTudo pagina desde page=0 até esgotar o total', async () => {
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    const page = Number(new URL(url).searchParams.get('page'));
    const paginas = [[{ n: 1 }, { n: 2 }], [{ n: 3 }, { n: 4 }], [{ n: 5 }]];
    return lista(paginas[page] ?? [], 5, page);
  });
  const itens = await criar(f).listarTudo('Auditoria', {}, { limit: 2 });
  assert.deepEqual(itens.map((i) => i.n), [1, 2, 3, 4, 5]);
  const paginas = f.chamadas.filter((c) => c.opcoes.method === 'GET').map((c) => new URL(c.url).searchParams.get('page'));
  assert.deepEqual(paginas, ['0', '1', '2']);
});

test('listarTudo para quando a página vem vazia, mesmo com total maior', async () => {
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    return lista(new URL(url).searchParams.get('page') === '0' ? [{ n: 1 }] : [], 99);
  });
  assert.equal((await criar(f).listarTudo('Normas')).length, 1);
});

test('listarTudo devolve lista vazia quando o total é 0', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([], 0)));
  assert.deepEqual(await criar(f).listarTudo('Normas'), []);
});

test('listarTudo respeita o limite máximo de páginas', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([{ n: 1 }], 1_000_000)));
  await assert.rejects(() => criar(f, { maxPaginas: 3 }).listarTudo('Normas'), /limite de páginas/);
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'GET').length, 3);
});

for (const [nome, corpo] of [
  ['sem items', { page: 0, total: 1 }],
  ['items que não é lista', { items: {}, page: 0, total: 1 }],
  ['total em texto', { items: [], page: 0, total: '1' }],
  ['total negativo', { items: [], page: 0, total: -1 }],
  ['sem page', { items: [], total: 0 }],
  ['null', null],
]) {
  test(`resposta fora do formato (${nome}) vira LegislacaoError`, async () => {
    const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : json(corpo)));
    await assert.rejects(() => criar(f).contar('Normas'), /formato esperado/);
  });
}

test('mensagens de erro não trazem usuário, senha, cookie nem query', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : new Response('', { status: 500 })));
  const erro = await criar(f, { tentativas: 1 }).contar('Auditoria', { usuarioId: 900001 }).catch((e) => e);
  for (const proibido of [USUARIO, SENHA, 'sessao=abc', 'usuarioId', 'http', '?']) {
    assert.ok(!erro.message.includes(proibido), `vazou ${proibido}: ${erro.message}`);
  }
});

test('contarComFiltro devolve os dois totais quando o filtro reduz', async () => {
  const f = fetchFalso((url) => {
    if (url.includes('Login')) return loginOk();
    return lista([{}], new URL(url).searchParams.has('versionada') ? 40 : 100);
  });
  const r = await criar(f).contarComFiltro('Normas', { cidadeId: 900010 }, { versionada: 1 });
  assert.deepEqual(r, { total: 40, semFiltro: 100 });
});

test('contarComFiltro recusa filtro ignorado pelo painel (total não diminuiu)', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([{}], 100)));
  await assert.rejects(() => criar(f).contarComFiltro('Normas', {}, { filtroInexistente: 1 }), /não foi aplicado/);
});

test('contarComFiltro aceita total igual quando permitirIgual', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([{}], 100)));
  const r = await criar(f).contarComFiltro('Normas', {}, { versionada: 1 }, { permitirIgual: true });
  assert.equal(r.total, 100);
});

test('contarComFiltro aceita base vazia (total 0 dos dois lados)', async () => {
  const f = fetchFalso((url) => (url.includes('Login') ? loginOk() : lista([], 0)));
  const r = await criar(f).contarComFiltro('Normas', {}, { versionada: 1 });
  assert.equal(r.total, 0);
});

test('lerCredenciais sem variáveis dá erro seguro', () => {
  assert.throws(() => lerCredenciais({}), (e) => e instanceof LegislacaoError && /LEGISLACAO_USUARIO/.test(e.message));
  assert.throws(() => lerCredenciais({ LEGISLACAO_USUARIO: 'x' }), LegislacaoError);
});

test('criarClienteLegislacaoDoAmbiente lê as variáveis informadas', () => {
  assert.throws(() => criarClienteLegislacaoDoAmbiente({}, {}), LegislacaoError);
  const cliente = criarClienteLegislacaoDoAmbiente({}, { LEGISLACAO_USUARIO: 'a', LEGISLACAO_SENHA: 'b' });
  assert.equal(typeof cliente.contar, 'function');
});

test('criar o cliente sem usuário ou senha dá erro', () => {
  assert.throws(() => criarClienteLegislacao({ usuario: '', senha: 'x' }), LegislacaoError);
});

test('depois de um login recusado, não tenta de novo antes da espera (protege a conta)', async () => {
  let instante = 1_000_000;
  const f = fetchFalso(() => json({ authenticated: false }));
  const cliente = criar(f, { agora: () => instante, esperaAposRecusaMs: 60000 });
  await assert.rejects(() => cliente.contar('Normas'), /recusou o login da conta/);
  await assert.rejects(() => cliente.contar('Normas'), /recusou o login há pouco/);
  assert.equal(f.chamadas.length, 1);
  instante += 60001;
  await assert.rejects(() => cliente.contar('Normas'), /recusou o login da conta/);
  assert.equal(f.chamadas.length, 2);
});

test('login aceito sem cookie não vira um novo login a cada pedido', async () => {
  const f = fetchFalso((url) => (url.includes('Account/Login') ? json({ authenticated: true }) : lista([{ a: 1 }], 1)));
  const cliente = criar(f);
  await cliente.contar('Normas');
  await cliente.contar('Normas');
  assert.equal(f.chamadas.filter((c) => c.opcoes.method === 'POST').length, 1);
});

test('page e limit em qualquer caixa não podem ser passados como filtro', async () => {
  const cliente = criar(fetchFalso(roteiro));
  for (const chave of ['Page', 'LIMIT', 'pAgE']) {
    await assert.rejects(() => cliente.contar('Normas', { [chave]: 1 }), /Filtro inválido/);
  }
});

test('antes do login pega o token anti-falsificação (GET Account/IsAuthenticated) e o manda no login', async () => {
  const f = fetchFalso((url) => {
    if (url.endsWith('/Account/IsAuthenticated')) {
      return new Response('{"authenticated":false}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'set-cookie': 'XSRF-TOKEN=abc%3D123; Path=/' },
      });
    }
    return roteiro(url);
  }, { responderPreparo: true });
  await criar(f).contar('Normas');
  const [preparo, login] = f.chamadas;
  assert.equal(preparo.url, `${BASE}/Account/IsAuthenticated`);
  assert.equal(preparo.opcoes.method, 'GET');
  assert.equal(login.opcoes.method, 'POST');
  assert.equal(login.opcoes.headers['x-xsrf-token'], 'abc=123');
  assert.match(login.opcoes.headers.cookie, /XSRF-TOKEN=abc%3D123/);
});

test('sem token anti-falsificação, o login vai sem o cabeçalho', async () => {
  const f = fetchFalso(roteiro);
  await criar(f).contar('Normas');
  const login = f.chamadas.find((c) => c.opcoes.method === 'POST');
  assert.equal(login.opcoes.headers['x-xsrf-token'], undefined);
});

test('cada login faz um preparo antes; login recusado na espera não faz nem o preparo', async () => {
  let instante = 1_000_000;
  const f = fetchFalso(() => json({ authenticated: false }));
  const cliente = criar(f, { agora: () => instante });
  await assert.rejects(() => cliente.contar('Normas'), /recusou o login da conta/);
  await assert.rejects(() => cliente.contar('Normas'), /recusou o login há pouco/);
  assert.equal(f.preparos.length, 1);
  assert.equal(f.preparos[0].opcoes.method, 'GET');
});

test('primeiraPagina pede só page=0 com o limit pedido e devolve os itens', async () => {
  const f = fetchFalso((url) => (url.includes('Account/Login') ? loginOk() : lista([{ a: 1 }, { a: 2 }], 900)));
  const itens = await criar(f).primeiraPagina('Auditoria', { usuarioId: 900001 }, { limit: 20 });
  assert.deepEqual(itens, [{ a: 1 }, { a: 2 }]);
  const leituras = f.chamadas.filter((c) => c.url.includes('/Auditoria/Get'));
  assert.equal(leituras.length, 1);
  const query = new URL(leituras[0].url).searchParams;
  assert.equal(query.get('page'), '0');
  assert.equal(query.get('limit'), '20');
  assert.equal(query.get('usuarioId'), '900001');
});

test('primeiraPagina recusa limit fora de 1 a 200 sem chamar o fetch', async () => {
  const f = fetchFalso(roteiro);
  const cliente = criar(f);
  for (const limit of [0, 201, 2000, 1.5, '50']) {
    await assert.rejects(() => cliente.primeiraPagina('Auditoria', {}, { limit }), LegislacaoError);
  }
  assert.equal(f.chamadas.length, 0);
});

test('ultimoItem pede o total e depois a página total-1 com 1 item', async () => {
  const f = fetchFalso((url) => {
    if (url.includes('Account/Login')) return loginOk();
    const page = new URL(url).searchParams.get('page');
    return page === '0' ? lista([{ a: 'novo' }], 37) : lista([{ a: 'antigo' }], 37, 36);
  });
  const item = await criar(f).ultimoItem('Auditoria', { usuarioId: 900001, cidadeId: 1001 });
  assert.deepEqual(item, { a: 'antigo' });
  const leituras = f.chamadas.filter((c) => c.url.includes('/Auditoria/Get')).map((c) => new URL(c.url).searchParams);
  assert.deepEqual(leituras.map((q) => [q.get('page'), q.get('limit')]), [['0', '1'], ['36', '1']]);
  assert.ok(leituras.every((q) => q.get('cidadeId') === '1001'));
});

test('ultimoItem com lista vazia devolve null em 1 pedido', async () => {
  const f = fetchFalso((url) => (url.includes('Account/Login') ? loginOk() : lista([], 0)));
  assert.equal(await criar(f).ultimoItem('Auditoria', {}), null);
  assert.equal(f.chamadas.filter((c) => c.url.includes('/Auditoria/Get')).length, 1);
});
