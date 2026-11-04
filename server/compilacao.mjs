// Busca de /api/compilacao: lê o Legislação Digital (só GET, pelo cliente de
// server/legislacao.mjs) e as planilhas importadas no Supabase, e entrega tudo a
// scripts/lib/build-compilacao.mjs, que monta a resposta pública.
//
// Custo de uma busca (~35 pedidos ao sistema): tipos e cidades (2), por pessoa
// as versões novas do período (7, uma página de 2.000 cada no uso normal) e a 1ª
// página da Auditoria (7), as Normas recentes de quem faz Projetos (4), 3
// contagens por par cidade×tipo (no máximo MAX_PARES pares, ou seja, 18) e 1
// contagem de normas vinculadas por cidade de projeto (no máximo 4).
// No Supabase, mais ~4 pedidos: o histórico do Todo o Tempo de Projetos (F6).
// Os avisos vão para o log só com contagens e ids públicos de personagem.
import { cidadesDosProjetos, montarCompilacao, paresDosProjetos } from '../scripts/lib/build-compilacao.mjs';
import { lerEquipe } from '../scripts/lib/compilacao/configuracao.mjs';
import { calcularPeriodos } from '../scripts/lib/compilacao/periodos.mjs';
import { chaveDoPar } from '../scripts/lib/compilacao/projeto.mjs';
import { CATALOGO, catalogoDeModulos, normalizar } from '../scripts/lib/compilacao/tipos.mjs';
import { decidirProjetos, linhasDoRetrato, repositorioAtribuicoes } from './compilacao-atribuicoes.mjs';
import { repositorioHistorico, todoOTempoDosProjetos } from './compilacao-historico.mjs';
import { LegislacaoError } from './legislacao.mjs';
import { SupabaseError } from './supabase.mjs';

// Janela para cidade/tipo do projeto e "sem atividade": cobre 10 dias úteis.
export const JANELA_DIAS = 16;
const PAGINA_RECENTES = 50;
// O PostgREST do Supabase devolve no máximo 1.000 linhas por pedido.
const LINHAS_POR_PEDIDO = 1000;
const MAX_LINHAS = 50_000;
// Teto de pares cidade×tipo com estoque por busca: 20 pedidos fixos + 6 × 3 = 38,
// mais 1 por cidade de projeto (vinculadas, até 4): no pior caso 42 (hoje são 5
// pares em 3 cidades, 38 pedidos).
export const MAX_PARES = 6;

const diasAntes = (data, dias) => new Date(Date.parse(`${data}T00:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10);

// I11 na Auditoria: se o painel ignorasse o filtro de pessoa, viriam ações de
// várias pessoas. O login só é comparado aqui; nunca sai deste módulo.
export function conferirUmaPessoa(listas) {
  const logins = new Set(listas.flat().map((item) => item?.usuarioLogin).filter(Boolean));
  if (logins.size > 1) {
    throw new LegislacaoError('O filtro de pessoa não foi aplicado pelo Legislação Digital (Auditoria).');
  }
}

// Versões: só as inclusões (acao=1), que são a produção. Hoje, Semana e Mês vêm
// daqui para todas as pessoas, então a busca vai desde o começo do mês (ou da
// semana ou da janela, o que vier antes).
async function auditoriaDaPessoa(cliente, membro, { inicioVersoes: dataInicial, inicioJanela, hoje }) {
  const pessoa = { usuarioId: membro.usuarioId };
  const versoes = await cliente.listarTudo('Auditoria', { ...pessoa, modulo: 'Versões', acao: 1, dataInicial, dataFinal: hoje });
  const normas =
    membro.funcao === 'projetos'
      ? await cliente.listarTudo('Auditoria', { ...pessoa, modulo: 'Normas', dataInicial: inicioJanela, dataFinal: hoje })
      : [];
  const recentes = await cliente.primeiraPagina('Auditoria', pessoa, { limit: PAGINA_RECENTES });
  conferirUmaPessoa([versoes, normas, recentes]);
  return { versoes, normas, recentes };
}

// `doSistema` = false quando valeu o catálogo fixo (o Todo o Tempo depende dele).
export async function lerCatalogo(cliente, avisar) {
  try {
    const catalogo = catalogoDeModulos(await cliente.listarTudo('ModulosNorma'));
    if (catalogo.length > 0) return { catalogo, doSistema: true };
    avisar('ModulosNorma veio vazio; usando o catálogo fixo');
  } catch {
    avisar('ModulosNorma não respondeu; usando o catálogo fixo');
  }
  return { catalogo: CATALOGO, doSistema: false };
}

// "Cidade A-SP" -> id (só para os pedidos de estoque) e id -> { nome, uf } (nomes da carteira).
async function lerCidades(cliente, avisar) {
  const idPorCidadeUf = new Map();
  const cidadesPorId = {};
  try {
    for (const c of await cliente.listarTudo('Cidades')) {
      if (!Number.isInteger(c?.id) || typeof c.nome !== 'string') continue;
      const uf = typeof c.uf === 'string' ? c.uf : '';
      idPorCidadeUf.set(normalizar(c.nomeUf ?? `${c.nome}-${uf}`), c.id);
      cidadesPorId[c.id] = { nome: c.nome, uf };
    }
  } catch {
    avisar('Cidades não respondeu; estoque dos projetos e nomes da carteira ficam sem o cadastro');
  }
  return { idPorCidadeUf, cidadesPorId };
}

async function estoqueDosPares(cliente, pares, idPorCidadeUf, avisar) {
  const estoque = {};
  for (const { cidadeUf, moduloId } of pares) {
    const cidadeId = idPorCidadeUf.get(normalizar(cidadeUf));
    if (!cidadeId) {
      avisar('cidade de um projeto não está no cadastro de Cidades');
      continue;
    }
    const filtro = { cidadeId, moduloId };
    try {
      const [total, versionadas, naoVersionadas] = await Promise.all([
        cliente.contar('Normas', filtro),
        cliente.contar('Normas', { ...filtro, versionada: 1 }),
        cliente.contar('Normas', { ...filtro, versionada: 2 }),
      ]);
      estoque[chaveDoPar(cidadeUf, moduloId)] = { total, versionadas, naoVersionadas };
    } catch {
      avisar('estoque de um par cidade×tipo não respondeu');
    }
  }
  return estoque;
}

// Normas vinculadas (vinculada = 1, todos os tipos) de cada cidade de projeto, para o
// "Finalizando". 1 pedido por cidade; a que não responder fica "—".
async function vinculadasDasCidades(cliente, cidades, idPorCidadeUf, avisar) {
  const vinculadas = {};
  await Promise.all(
    cidades.map(async (cidadeUf) => {
      const cidadeId = idPorCidadeUf.get(normalizar(cidadeUf));
      if (!cidadeId) {
        avisar('cidade de um projeto não está no cadastro de Cidades; vinculadas ficam "—"');
        return;
      }
      try {
        vinculadas[cidadeUf] = await cliente.contar('Normas', { cidadeId, vinculada: 1 });
      } catch {
        avisar('normas vinculadas de uma cidade de projeto não responderam');
      }
    }),
  );
  return vinculadas;
}

async function lerTodas(pedir, caminho) {
  const linhas = [];
  for (let offset = 0; offset < MAX_LINHAS; offset += LINHAS_POR_PEDIDO) {
    const pagina = await pedir(`${caminho}&limit=${LINHAS_POR_PEDIDO}&offset=${offset}`);
    if (!Array.isArray(pagina)) throw new SupabaseError('O Supabase respondeu fora do formato esperado.');
    linhas.push(...pagina);
    if (pagina.length < LINHAS_POR_PEDIDO) return linhas;
  }
  throw new SupabaseError('Linhas demais nas planilhas do /compilacao.');
}

/** Abas e linhas das planilhas de quem é de Atualizações; null sem Supabase. */
export async function lerPlanilhas(pedir, personagens) {
  if (!pedir) return null;
  if (personagens.length === 0) return { abas: [], linhas: [] };
  const quem = `personagem=in.(${personagens.map(encodeURIComponent).join(',')})`;
  const abas = await lerTodas(
    pedir,
    `/compilacao_planilhas_abas?select=personagem,ano,mes,titulo_confere,importado_em&${quem}&order=personagem,ano,mes`,
  );
  const linhas = await lerTodas(
    pedir,
    `/compilacao_planilhas?select=personagem,ano,mes,cidade,uf,cidade_id,cidade_status,balde,compiladas,deficit&${quem}` +
      '&order=personagem,ano,mes,cidade,uf,sigla_planilha',
  );
  return { abas, linhas };
}

/**
 * Busca tudo e devolve os `dados` de /api/compilacao.
 * @param {{
 *   cliente: { contar: Function, listarTudo: Function, primeiraPagina: Function },
 *   pedirSupabase?: ((caminho: string) => Promise<unknown>) | null,
 *   env?: Record<string, string | undefined>,
 *   agora?: Date,
 *   avisar?: (mensagem: string) => void,
 * }} opcoes
 */
export async function buscarCompilacao({
  cliente,
  pedirSupabase = null,
  env = process.env,
  agora = new Date(),
  avisar = (mensagem) => console.warn(`[compilacao] ${mensagem}`),
}) {
  const equipe = lerEquipe(env.COMPILACAO_EQUIPE);
  const { hoje, semana, mes } = calcularPeriodos(agora);
  const inicioJanela = diasAntes(hoje, JANELA_DIAS);
  const inicioVersoes = [semana.inicio, mes.inicio, inicioJanela].sort()[0];

  const { catalogo, doSistema: catalogoDoSistema } = await lerCatalogo(cliente, avisar);

  const resultados = await Promise.allSettled(
    equipe.map((membro) => auditoriaDaPessoa(cliente, membro, { inicioVersoes, inicioJanela, hoje })),
  );
  // Sem nenhuma pessoa (login recusado, sistema fora): erro, e o cache antigo continua.
  if (resultados.every((r) => r.status === 'rejected')) throw resultados[0].reason;
  const auditoria = {};
  resultados.forEach((resultado, i) => {
    if (resultado.status === 'fulfilled') auditoria[equipe[i].usuarioId] = resultado.value;
    else avisar(`a Auditoria de ${equipe[i].personagem} não respondeu`);
  });

  const { idPorCidadeUf, cidadesPorId } = await lerCidades(cliente, avisar);

  // F3: projeto gravado de cada pessoa (regra dos 2 dias, correção manual, "Desde").
  const repo = pedirSupabase ? repositorioAtribuicoes(pedirSupabase) : null;
  const atribuicoes = await decidirProjetos({ repo, cliente, equipe, auditoria, catalogo, idPorCidadeUf, agora, avisar });

  const pares = paresDosProjetos({ equipe, auditoria, catalogo, atribuicoes });
  if (pares.length > MAX_PARES) avisar(`${pares.length} pares cidade×tipo; só os ${MAX_PARES} primeiros têm estoque`);
  const comEstoque = pares.slice(0, MAX_PARES);
  const cidades = cidadesDosProjetos({ equipe, auditoria, catalogo, atribuicoes });
  const [estoque, vinculadas] = await Promise.all([
    estoqueDosPares(cliente, comEstoque, idPorCidadeUf, avisar),
    vinculadasDasCidades(cliente, cidades, idPorCidadeUf, avisar),
  ]);

  // Retrato do estoque do dia (cada busca atualiza a linha; o cron das 23:50 fecha o dia).
  if (repo && atribuicoes !== undefined) {
    await repo.gravarRetrato(linhasDoRetrato({ estoque, pares: comEstoque, idPorCidadeUf, hoje, agora })).catch(() => {
      avisar('não foi possível gravar o retrato diário do estoque');
    });
  }

  // F6: Todo o Tempo de Projetos pelo histórico (grava a janela desta busca e lê os totais).
  const historico = await todoOTempoDosProjetos({
    repo: pedirSupabase ? repositorioHistorico(pedirSupabase) : null,
    equipe,
    auditoria,
    catalogo,
    catalogoDoSistema,
    hoje,
    inicioVersoes,
    agora,
    avisar,
  });

  const deAtualizacoes = equipe.filter((m) => m.funcao === 'atualizacoes').map((m) => m.personagem);
  const planilhas = await lerPlanilhas(pedirSupabase, deAtualizacoes).catch(() => {
    avisar('as planilhas do Supabase não responderam');
    return null;
  });
  if (!pedirSupabase) avisar('sem Supabase: os números das planilhas ficam "—"');

  return montarCompilacao({
    equipe,
    agora,
    auditoria,
    estoque,
    planilhas,
    catalogo,
    cidadesPorId,
    atualizacoesDiaSemana: env.COMPILACAO_ATUALIZACOES_DIA_SEMANA === 'vazio' ? 'vazio' : 'auditoria',
    atribuicoes,
    historico,
    vinculadas,
    avisar,
  });
}
