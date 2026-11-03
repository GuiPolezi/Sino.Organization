// Cliente SOMENTE LEITURA do painel do Legislação Digital
// (https://www.legislacaodigital.com.br/Admin/). O painel não tem API pública
// documentada: o servidor entra com a conta de serviço (sessão por cookie, como
// um navegador) e lê as listas da API interna.
//
// Regras de segurança (plano de dados, seção 5):
// - Só três coisas são permitidas: o login (GET Account/IsAuthenticated de preparo
//   e POST Account/Login, endereços fixos) e o GET de `{Controller}/Get` dos
//   controllers da lista ROTAS_DE_LEITURA. Qualquer outra coisa é recusada
//   ANTES de chamar o fetch (inclusive `Usuarios`, `Get/{id}`, `..` e URLs absolutas).
// - Nunca segue redirecionamentos. Sessão só em memória.
// - Mensagens de erro nunca levam usuário, senha, cookies nem endereços com query.
export const BASE_PADRAO = 'https://www.legislacaodigital.com.br/Admin/Api';

// O login do painel (conferido em 03/11/2026, igual ao navegador):
// 1. GET Account/IsAuthenticated: o painel devolve os cookies anti-falsificação,
//    entre eles XSRF-TOKEN;
// 2. POST Account/Login em JSON (username, password, rememberMe) com o valor do
//    XSRF-TOKEN no cabeçalho x-xsrf-token. Entrou quando a resposta traz
//    `authenticated: true`. Sem o passo 1 o painel recusa o login.
export const LOGIN = {
  preparo: 'Account/IsAuthenticated',
  rota: 'Account/Login',
  cookieDoToken: 'XSRF-TOKEN',
  cabecalhoDoToken: 'x-xsrf-token',
  corpo: (usuario, senha) => ({ username: usuario, password: senha, rememberMe: false }),
};

// A única lista de leitura permitida: controller -> rota.
export const ROTAS_DE_LEITURA = Object.freeze({
  Auditoria: 'Auditoria/Get',
  Normas: 'Normas/Get',
  Cidades: 'Cidades/Get',
  ModulosNorma: 'ModulosNorma/Get',
});

export class LegislacaoError extends Error {}

const PADROES = {
  pausaMs: 400,
  timeoutMs: 20000,
  simultaneos: 2,
  tentativas: 3,
  esperaBaseMs: 1000,
  maxPaginas: 500,
  // Depois de um login recusado, não tenta de novo por este tempo (evita
  // bloquear a conta de serviço com várias tentativas seguidas).
  esperaAposRecusaMs: 60000,
};

const dormirReal = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lê LEGISLACAO_USUARIO/LEGISLACAO_SENHA; sem elas, erro seguro de configuração. */
export function lerCredenciais(env = process.env) {
  const usuario = env.LEGISLACAO_USUARIO;
  const senha = env.LEGISLACAO_SENHA;
  if (!usuario || !senha) {
    throw new LegislacaoError('Defina LEGISLACAO_USUARIO e LEGISLACAO_SENHA no ambiente (veja .env.example).');
  }
  return { usuario, senha };
}

// Devolve a rota de leitura do controller ou recusa (sem tocar na rede).
function rotaDeLeitura(controller) {
  if (typeof controller !== 'string' || !Object.hasOwn(ROTAS_DE_LEITURA, controller)) {
    throw new LegislacaoError('Rota do Legislação Digital não permitida (só leitura de rotas conhecidas).');
  }
  return ROTAS_DE_LEITURA[controller];
}

// Monta a query: só chaves simples, só valores simples; page/limit são do cliente.
function montarQuery(filtros, page, limit) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros ?? {})) {
    if (!/^[A-Za-z]+$/.test(chave) || ['page', 'limit'].includes(chave.toLowerCase())) {
      throw new LegislacaoError('Filtro inválido para o Legislação Digital.');
    }
    if (!['string', 'number', 'boolean'].includes(typeof valor)) {
      throw new LegislacaoError('Valor de filtro inválido para o Legislação Digital.');
    }
    params.set(chave, String(valor));
  }
  params.set('page', String(page));
  params.set('limit', String(limit));
  return params.toString();
}

function lerCookies(resposta, cookies) {
  for (const linha of resposta.headers.getSetCookie?.() ?? []) {
    const [par] = linha.split(';');
    const igual = par.indexOf('=');
    if (igual > 0) cookies.set(par.slice(0, igual).trim(), par.slice(igual + 1).trim());
  }
}

// O valor do cookie vem codificado para URL (ex.: "%3D"); o cabeçalho leva o valor puro.
const decodificar = (valor) => {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
};

const ehJson = (resposta) => /json/i.test(resposta.headers.get('content-type') ?? '');
const sessaoExpirou = (resposta) =>
  resposta.status === 401 || (resposta.status >= 300 && resposta.status < 400) || (resposta.ok && !ehJson(resposta));

// Garante a forma { items: [], page, total }.
function validarLista(corpo) {
  const ok =
    corpo &&
    Array.isArray(corpo.items) &&
    Number.isInteger(corpo.total) &&
    corpo.total >= 0 &&
    Number.isInteger(corpo.page);
  if (!ok) throw new LegislacaoError('Resposta do Legislação Digital fora do formato esperado.');
  return corpo;
}

// Limita quantos pedidos andam ao mesmo tempo.
function criarFila(maximo) {
  let ativos = 0;
  const espera = [];
  return async (tarefa) => {
    while (ativos >= maximo) await new Promise((resolve) => espera.push(resolve));
    ativos += 1;
    try {
      return await tarefa();
    } finally {
      ativos -= 1;
      espera.shift()?.();
    }
  };
}

/**
 * Cria o cliente. `fetch`, `dormir` e os tempos são injetáveis para os testes.
 */
export function criarClienteLegislacao({
  usuario,
  senha,
  fetch: buscar = globalThis.fetch,
  base = BASE_PADRAO,
  dormir = dormirReal,
  agora = Date.now,
  ...ajustes
}) {
  if (!usuario || !senha) throw new LegislacaoError('Usuário e senha do Legislação Digital são obrigatórios.');
  const cfg = { ...PADROES, ...ajustes };
  const cookies = new Map();
  const naFila = criarFila(cfg.simultaneos);
  let loginEmCurso = null;
  let logado = false;
  let recusadoAte = 0;

  const cabecalhos = () => ({
    accept: 'application/json',
    ...(cookies.size && { cookie: [...cookies].map(([n, v]) => `${n}=${v}`).join('; ') }),
  });

  // Chamada de rede única: tudo passa por aqui, depois das checagens da lista.
  async function chamar(url, opcoes) {
    const resposta = await buscar(url, {
      ...opcoes,
      redirect: 'manual',
      signal: AbortSignal.timeout(cfg.timeoutMs),
      headers: { ...cabecalhos(), ...opcoes.headers },
    }).catch(() => {
      throw new LegislacaoError('Não foi possível conectar ao Legislação Digital.');
    });
    lerCookies(resposta, cookies);
    return resposta;
  }

  async function entrar() {
    if (agora() < recusadoAte) {
      throw new LegislacaoError('O Legislação Digital recusou o login há pouco; nova tentativa em instantes.');
    }
    logado = false;
    cookies.clear();
    // Só para receber os cookies anti-falsificação; a resposta não importa.
    await chamar(`${base}/${LOGIN.preparo}`, { method: 'GET' });
    const token = cookies.get(LOGIN.cookieDoToken);
    const resposta = await chamar(`${base}/${LOGIN.rota}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token && { [LOGIN.cabecalhoDoToken]: decodificar(token) }),
      },
      body: JSON.stringify(LOGIN.corpo(usuario, senha)),
    });
    const corpo = resposta.ok && ehJson(resposta) ? await resposta.json().catch(() => null) : null;
    if (corpo?.authenticated !== true) {
      recusadoAte = agora() + cfg.esperaAposRecusaMs;
      throw new LegislacaoError('O Legislação Digital recusou o login da conta de serviço.');
    }
    logado = true;
  }

  // Vários pedidos que precisam entrar ao mesmo tempo fazem um login só.
  const garantirLogin = () => {
    loginEmCurso ??= entrar().finally(() => {
      loginEmCurso = null;
    });
    return loginEmCurso;
  };

  // Um GET de leitura, com pausa, nova sessão (1x) e espera crescente em 429/5xx.
  async function lerLista(controller, query) {
    const url = `${base}/${rotaDeLeitura(controller)}?${query}`;
    let relogou = false;
    for (let tentativa = 0; ; tentativa += 1) {
      if (!logado) await garantirLogin();
      const resposta = await naFila(async () => {
        try {
          return await chamar(url, { method: 'GET' });
        } finally {
          if (cfg.pausaMs > 0) await dormir(cfg.pausaMs);
        }
      });

      if (sessaoExpirou(resposta)) {
        if (relogou) throw new LegislacaoError(`O Legislação Digital não manteve a sessão (${controller}).`);
        relogou = true;
        logado = false;
        cookies.clear();
        await garantirLogin();
        continue;
      }
      if (resposta.ok) return validarLista(await resposta.json().catch(() => null));

      const repetivel = resposta.status === 429 || resposta.status >= 500;
      if (!repetivel || tentativa + 1 >= cfg.tentativas) {
        throw new LegislacaoError(`O Legislação Digital respondeu HTTP ${resposta.status} em ${controller}.`);
      }
      await dormir(cfg.esperaBaseMs * 2 ** tentativa);
    }
  }

  /** Total de itens que casam com os filtros, em 1 pedido (`page=0&limit=1`). */
  async function contar(controller, filtros = {}) {
    return (await lerLista(controller, montarQuery(filtros, 0, 1))).total;
  }

  /** Todos os itens, paginando desde `page=0` (o painel começa em 0). */
  async function listarTudo(controller, filtros = {}, { limit = 2000 } = {}) {
    const itens = [];
    for (let page = 0; page < cfg.maxPaginas; page += 1) {
      const lista = await lerLista(controller, montarQuery(filtros, page, limit));
      itens.push(...lista.items);
      if (lista.items.length === 0 || itens.length >= lista.total) return itens;
    }
    throw new LegislacaoError(`Paginação do Legislação Digital passou do limite de páginas (${controller}).`);
  }

  /**
   * I11: o painel ignora filtro desconhecido em silêncio e devolve tudo. Conta com
   * `filtrosBase` e depois com `filtrosBase + extra`; se o total não diminuiu, o
   * filtro não foi aplicado e dá erro. Se `extra` pode mesmo casar com tudo, use
   * `permitirIgual`.
   */
  async function contarComFiltro(controller, filtrosBase, extra, { permitirIgual = false } = {}) {
    const semFiltro = await contar(controller, filtrosBase);
    const total = await contar(controller, { ...filtrosBase, ...extra });
    if (total > semFiltro || (!permitirIgual && semFiltro > 0 && total === semFiltro)) {
      throw new LegislacaoError(`O filtro não foi aplicado pelo Legislação Digital (${controller}).`);
    }
    return { total, semFiltro };
  }

  return { contar, listarTudo, contarComFiltro };
}

/** Cliente com as credenciais de LEGISLACAO_USUARIO/LEGISLACAO_SENHA. */
export function criarClienteLegislacaoDoAmbiente(opcoes = {}, env = process.env) {
  return criarClienteLegislacao({ ...lerCredenciais(env), ...opcoes });
}
