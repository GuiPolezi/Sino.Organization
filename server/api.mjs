// Rotas da API do sino.org. Cada rota recebe um Request e devolve um Response
// (padrão da web), então o mesmo código roda nas funções da Vercel (api/**),
// no servidor do Vite em desenvolvimento (vite.config.js) e, se um dia
// precisar, num Node atrás do IIS.
//
// Segredos (MILLDESK_API_KEY, LICENCA_*, SUPABASE_SECRET_KEY) só existem aqui,
// no servidor: as respostas levam apenas os dados já filtrados.
import { ClientesError } from '../scripts/lib/build-clients.mjs';
import { TeamError } from '../scripts/lib/build-team.mjs';
import { LicencaError } from '../scripts/lib/licenca.mjs';
import { MilldeskError } from '../scripts/lib/milldesk.mjs';
import { armazemMemoria, criarCache } from './cache.mjs';
import { obterChamados, renovarJanelasAntigas } from './chamados.mjs';
import { FONTES } from './fontes.mjs';
import { criarServicoReunioes, reunioesMemoria } from './reunioes.mjs';
import {
  SupabaseConflito,
  SupabaseError,
  armazemSupabase,
  criarClienteSupabase,
  reunioesSupabase,
} from './supabase.mjs';

// Só estes erros têm mensagem segura para mostrar (nunca trazem chave ou senha).
const ERROS_SEGUROS = [LicencaError, MilldeskError, SupabaseError, TeamError, ClientesError];
const ehSeguro = (erro) => ERROS_SEGUROS.some((Tipo) => erro instanceof Tipo);
const mensagemDe = (erro) => (ehSeguro(erro) ? erro.message : 'Erro inesperado no servidor.');

// Corpo máximo aceito (uma reunião tem bem menos que isso).
const CORPO_MAX = 20_000;

// Supabase quando configurado; senão tudo em memória (só para desenvolvimento).
// Exportado para os scripts de manutenção (ex.: scripts/seed-chamados.mjs).
let servicos;
export function obterServicos() {
  if (!servicos) {
    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: chave } = process.env;
    const pedir = url && chave ? criarClienteSupabase({ url, chave }) : null;
    if (!pedir) console.warn('[api] Sem SUPABASE_URL/SUPABASE_SECRET_KEY: dados só em memória.');
    const armazem = pedir ? armazemSupabase(pedir) : armazemMemoria();
    servicos = {
      armazem,
      cache: criarCache({ armazem, mensagemDe }),
      reunioes: criarServicoReunioes(pedir ? reunioesSupabase(pedir) : reunioesMemoria()),
    };
  }
  return servicos;
}

export { mensagemDe };

const json = (corpo, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(corpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  });

const erroInterno = (contexto, erro) => {
  if (!ehSeguro(erro)) console.error(`[api] ${contexto}:`, erro);
  return json({ erro: mensagemDe(erro) }, 502);
};

// ---------- Fontes de dados com cache ----------

// As fontes (o que buscar e por quanto tempo vale) estão em server/fontes.mjs.
async function responderFonte(chave) {
  const { buscar, idadeMaximaMs } = FONTES[chave];
  try {
    const { dados, geradoEm, situacao, aviso } = await obterServicos().cache(chave, buscar, { idadeMaximaMs });
    return json({ dados, geradoEm, situacao, ...(aviso && { aviso }) });
  } catch (erro) {
    return erroInterno(chave, erro);
  }
}

// ---------- Chamados (histórico em janelas, ver server/chamados.mjs) ----------

async function responderChamados() {
  try {
    return json(await obterChamados(obterServicos()));
  } catch (erro) {
    return erroInterno('chamados', erro);
  }
}

// Agendamento diário da Vercel (vercel.json > crons). A Vercel manda
// "Authorization: Bearer <CRON_SECRET>"; sem o segredo certo, nada roda.
async function responderCronChamados(request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return json({ erro: 'Defina CRON_SECRET nas variáveis de ambiente.' }, 503);
  if (request.headers.get('authorization') !== `Bearer ${segredo}`) return json({ erro: 'Não autorizado.' }, 401);
  try {
    return json(await renovarJanelasAntigas(obterServicos(), { mensagemDe }));
  } catch (erro) {
    return erroInterno('cron chamados', erro);
  }
}

// ---------- Reuniões ----------

async function lerCorpo(request) {
  const texto = await request.text();
  if (texto.length > CORPO_MAX) return { erro: json({ erro: 'Pedido grande demais.' }, 413) };
  try {
    return { dados: JSON.parse(texto) };
  } catch {
    return { erro: json({ erro: 'O corpo do pedido não é JSON.' }, 400) };
  }
}

// Resultado do serviço -> resposta HTTP.
const responderResultado = (resultado, statusOk = 200) =>
  resultado.ok
    ? json(resultado.reuniao ? { reuniao: resultado.reuniao } : null, resultado.reuniao ? statusOk : 204)
    : json({ erros: resultado.erros }, resultado.status);

const comServico = (contexto, acao) => async (request, ...parametros) => {
  try {
    return await acao(obterServicos().reunioes, request, ...parametros);
  } catch (erro) {
    if (erro instanceof SupabaseConflito) return json({ erros: { geral: 'Essa reunião já existe.' } }, 409);
    return erroInterno(contexto, erro);
  }
};

const listarReunioes = comServico('reunioes', async (servico) => json({ reunioes: await servico.listar() }));

const criarReuniao = comServico('reunioes', async (servico, request) => {
  const { dados, erro } = await lerCorpo(request);
  const migracao = new URL(request.url).searchParams.get('migracao') === '1';
  return erro ?? responderResultado(await servico.criar(dados, { migracao }), 201);
});

const obterReuniao = comServico('reuniao', async (servico, _request, id) => responderResultado(await servico.obter(id)));

const editarReuniao = comServico('reuniao', async (servico, request, id) => {
  const { dados, erro } = await lerCorpo(request);
  return erro ?? responderResultado(await servico.editar(id, dados));
});

const apagarReuniao = comServico('reuniao', async (servico, _request, id) => responderResultado(await servico.apagar(id)));

// ---------- Roteamento ----------

const ROTAS = [
  { caminho: /^\/api\/licencas$/, GET: () => responderFonte('licencas') },
  { caminho: /^\/api\/equipes\/(suporte|desenvolvimento)$/, GET: (_request, setor) => responderFonte(`equipe-${setor}`) },
  { caminho: /^\/api\/atendimentos$/, GET: () => responderFonte('atendimentos') },
  { caminho: /^\/api\/clientes$/, GET: () => responderFonte('clientes') },
  { caminho: /^\/api\/chamados$/, GET: responderChamados },
  { caminho: /^\/api\/cron\/chamados$/, GET: responderCronChamados },
  { caminho: /^\/api\/reunioes$/, GET: listarReunioes, POST: criarReuniao },
  { caminho: /^\/api\/reunioes\/([^/]+)$/, GET: obterReuniao, PUT: editarReuniao, DELETE: apagarReuniao },
];

/** Atende qualquer requisição /api/*: Vercel (api/**), Vite em dev e IIS. */
export async function tratarApi(request) {
  const caminho = new URL(request.url).pathname.replace(/\/+$/, '');
  for (const rota of ROTAS) {
    const encontrado = rota.caminho.exec(caminho);
    if (!encontrado) continue;
    const acao = rota[request.method];
    if (!acao) return json({ erro: 'Método não permitido.' }, 405);
    return acao(request, ...encontrado.slice(1).map(decodeURIComponent));
  }
  return json({ erro: 'Rota não encontrada.' }, 404);
}
