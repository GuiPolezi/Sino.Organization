// Rotas da API do sino.org. Cada rota recebe um Request e devolve um Response
// (padrão da web), então o mesmo código roda nas funções da Vercel (api/*.js),
// no servidor do Vite em desenvolvimento (vite.config.js) e, se um dia
// precisar, num Node atrás do IIS.
//
// Segredos (MILLDESK_API_KEY, LICENCA_*, SUPABASE_SECRET_KEY) só existem aqui,
// no servidor: as respostas levam apenas os dados já filtrados.
import { montarLicencas } from '../scripts/lib/build-licencas.mjs';
import { LicencaError, baixarPaginas } from '../scripts/lib/licenca.mjs';
import { MilldeskError } from '../scripts/lib/milldesk.mjs';
import { armazemMemoria, criarCache } from './cache.mjs';
import { SupabaseError, armazemSupabase } from './supabase.mjs';

// Só estes erros têm mensagem segura para mostrar (nunca trazem chave ou senha).
const ERROS_SEGUROS = [LicencaError, MilldeskError, SupabaseError];
const mensagemDe = (erro) =>
  ERROS_SEGUROS.some((Tipo) => erro instanceof Tipo) ? erro.message : 'Erro inesperado ao buscar os dados.';

let cache;
function obterCache() {
  if (!cache) {
    const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: chave } = process.env;
    const armazem = url && chave ? armazemSupabase({ url, chave }) : armazemMemoria();
    if (!url || !chave) console.warn('[api] Sem SUPABASE_URL/SUPABASE_SECRET_KEY: cache só em memória.');
    cache = criarCache({ armazem, mensagemDe });
  }
  return cache;
}

const json = (corpo, status = 200) =>
  Response.json(corpo, {
    status,
    headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });

// Fontes de dados: chave do cache -> função que busca o dado já filtrado.
const FONTES = {
  licencas: async () => {
    const { totalClientes, licencas } = montarLicencas(await baixarPaginas());
    return { totalClientes, licencas };
  },
};

async function responderFonte(chave) {
  try {
    const { dados, geradoEm, situacao, aviso } = await obterCache()(chave, FONTES[chave]);
    return json({ dados, geradoEm, situacao, ...(aviso && { aviso }) });
  } catch (erro) {
    if (!ERROS_SEGUROS.some((Tipo) => erro instanceof Tipo)) console.error(`[api] ${chave}:`, erro);
    return json({ erro: mensagemDe(erro) }, 502);
  }
}

export const responderLicencas = () => responderFonte('licencas');

const ROTAS = {
  '/api/licencas': responderLicencas,
};

/** Atende qualquer requisição /api/* (usado no desenvolvimento e no IIS). */
export async function tratarApi(request) {
  const rota = ROTAS[new URL(request.url).pathname.replace(/\/+$/, '')];
  if (!rota) return json({ erro: 'Rota não encontrada.' }, 404);
  if (request.method !== 'GET') return json({ erro: 'Método não permitido.' }, 405);
  return rota(request);
}
