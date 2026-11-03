// Monta os `dados` de /api/compilacao (contrato: plano de desenvolvimento, 5.7)
// a partir das respostas cruas do Legislação Digital e das linhas das planilhas.
// Função pura: quem busca é server/compilacao.mjs. Regra de vazio: 0 só quando a
// fonte respondeu 0; null ("—") quando a fonte não respondeu ou não se aplica.
import {
  acaoEmTexto,
  dataDoItem,
  ehDoModulo,
  ehInclusao,
  ehModuloDeAtividade,
  moduloCanonico,
  horaDoItem,
  instanteDoItem,
  itensEntre,
  separarCidadeUf,
  textoPublico,
} from './compilacao/itens.mjs';
import { agruparPorBalde, chaveDaNorma } from './compilacao/normas-distintas.mjs';
import { calcularPeriodos } from './compilacao/periodos.mjs';
import { chaveDoPar, colegasNoPar, estoqueFecha, inferirProjeto, projetoPublico } from './compilacao/projeto.mjs';
import { resumirPlanilhas } from './compilacao/resumo-planilhas.mjs';
import { CATALOGO, normalizar } from './compilacao/tipos.mjs';

// Dias úteis sem ação para "sem atividade desde" e para "ausente".
const UTEIS_SEM_ATIVIDADE = 2;
const UTEIS_AUSENTE = 10;

const PERIODOS_DO_SISTEMA = ['hoje', 'semana', 'mes'];

// Dias de segunda a sexta depois de `de` até `ate` (AAAA-MM-DD), parando em `limite`.
function diasUteisEntre(de, ate, limite = UTEIS_AUSENTE) {
  let uteis = 0;
  const fim = Date.parse(`${ate}T00:00:00Z`);
  for (let dia = Date.parse(`${de}T00:00:00Z`) + 86_400_000; dia <= fim && uteis < limite; dia += 86_400_000) {
    const semana = new Date(dia).getUTCDay();
    if (semana !== 0 && semana !== 6) uteis += 1;
  }
  return uteis;
}

// I13: versão sem tipo ou número/ano reconhecido conta em "Outros", uma vez por
// texto (cidade + descrição), já que não dá para saber o número da norma.
function semPadraoDistintas(itens, catalogo) {
  const textos = new Set();
  for (const item of itens) {
    if (chaveDaNorma(item, catalogo) || typeof item?.descricao !== 'string') continue;
    textos.add(`${item.cidadeUf ?? ''}|${normalizar(item.descricao)}`);
  }
  return textos.size;
}

// Normas distintas com versão nova (Versões, ação 1) em cada período.
function producaoDoSistema(entrada, periodos, catalogo, avisar) {
  if (!entrada) return null;
  const inclusoes = (entrada.versoes ?? []).filter((i) => ehDoModulo(i, 'Versões') && ehInclusao(i));
  const janelas = { hoje: { inicio: periodos.hoje, fim: periodos.hoje }, semana: periodos.semana, mes: periodos.mes };
  const resultado = {};
  for (const periodo of PERIODOS_DO_SISTEMA) {
    const doPeriodo = itensEntre(inclusoes, janelas[periodo].inicio, janelas[periodo].fim);
    const { distintas, porBalde, naoReconhecidas } = agruparPorBalde(doPeriodo, catalogo);
    const semPadrao = naoReconhecidas > 0 ? semPadraoDistintas(doPeriodo, catalogo) : 0;
    if (naoReconhecidas > 0) avisar(`${naoReconhecidas} versão(ões) sem tipo/número reconhecido (${periodo}); contam em Outros`);
    resultado[periodo] = { distintas: distintas + semPadrao, porBalde: { ...porBalde, outros: porBalde.outros + semPadrao } };
  }
  return resultado;
}

function ausencia(entrada, hoje) {
  if (!entrada) return { ausente: false, semAtividadeDesde: null };
  const datas = [...(entrada.versoes ?? []), ...(entrada.normas ?? []), ...(entrada.recentes ?? [])]
    .map(dataDoItem)
    .filter((d) => d && d <= hoje);
  if (datas.length === 0) return { ausente: true, semAtividadeDesde: null };
  const ultima = datas.reduce((a, b) => (b > a ? b : a));
  const uteis = diasUteisEntre(ultima, hoje);
  return { ausente: uteis >= UTEIS_AUSENTE, semAtividadeDesde: uteis >= UTEIS_SEM_ATIVIDADE ? ultima : null };
}

// A ação mais recente de um módulo da lista branca (plano, 5.8).
function atividadeRecente(entrada) {
  const [item] = (entrada?.recentes ?? [])
    .filter(ehModuloDeAtividade)
    .sort((a, b) => instanteDoItem(b).localeCompare(instanteDoItem(a)));
  if (!item) return null;
  return {
    acao: acaoEmTexto(item.acao),
    cidade: separarCidadeUf(item.cidadeUf),
    modulo: moduloCanonico(item.modulo),
    data: dataDoItem(item),
    hora: horaDoItem(item),
    descricao: textoPublico(item.descricao),
  };
}

const vazio = () => ({ hoje: null, semana: null, mes: null, tudo: null });

function pessoaDeProjetos(membro, ctx) {
  const entrada = ctx.auditoria?.[membro.usuarioId];
  const sistema = producaoDoSistema(entrada, ctx.periodos, ctx.catalogo, ctx.avisar);
  const inferido = ctx.projetos.get(membro.personagem);
  const projeto = inferido
    ? projetoPublico(inferido, ctx.estoque, colegasNoPar(membro.personagem, ctx.projetos), ctx)
    : null;
  const producao = vazio();
  const fontes = vazio();
  const porTipo = vazio();
  if (sistema) {
    for (const p of PERIODOS_DO_SISTEMA) {
      producao[p] = sistema[p].distintas;
      fontes[p] = 'sistema';
      porTipo[p] = sistema[p].porBalde;
    }
  }
  return {
    funcao: 'projetos',
    desde: null, // F3: começo da atribuição gravada
    planilha: null,
    ...ausencia(entrada, ctx.periodos.hoje),
    cidades: projeto ? [projeto.cidade] : [],
    projeto,
    producao,
    fontes,
    porTipo,
    aguardando: projeto?.aguardando != null ? { valor: projeto.aguardando, fonte: 'normas' } : { valor: null, fonte: null },
    faltantes: null,
    atividade: atividadeRecente(entrada),
  };
}

function pessoaDeAtualizacoes(membro, ctx) {
  const entrada = ctx.auditoria?.[membro.usuarioId];
  const sistema = ctx.atualizacoesDiaSemana === 'auditoria' ? producaoDoSistema(entrada, ctx.periodos, ctx.catalogo, ctx.avisar) : null;
  const resumo = resumirPlanilhas(membro.personagem, ctx.planilhas, ctx.periodos.hoje, {
    cidadesPorId: ctx.cidadesPorId,
    versoes: entrada?.versoes,
    avisar: ctx.avisar,
  });
  const producao = vazio();
  const fontes = vazio();
  const porTipo = vazio();
  if (sistema) {
    for (const p of ['hoje', 'semana']) {
      producao[p] = sistema[p].distintas;
      fontes[p] = 'sistema';
      porTipo[p] = sistema[p].porBalde;
    }
  }
  if (resumo?.mes != null) {
    producao.mes = resumo.mes;
    fontes.mes = 'planilha';
    porTipo.mes = resumo.porTipoMes;
  }
  if (resumo) {
    producao.tudo = resumo.tudo;
    fontes.tudo = 'planilha';
    porTipo.tudo = resumo.porTipoTudo;
  }
  return {
    funcao: 'atualizacoes',
    desde: null,
    planilha: resumo?.planilha ?? null,
    ...ausencia(entrada, ctx.periodos.hoje),
    cidades: resumo?.carteira ?? [],
    projeto: null,
    producao,
    fontes,
    porTipo,
    aguardando: resumo?.aguardando ?? { valor: null, fonte: null },
    faltantes: null, // F8
    atividade: atividadeRecente(entrada),
  };
}

// Projeto inferido de cada pessoa de Projetos Novos.
function projetosDaEquipe(equipe, auditoria, catalogo) {
  const projetos = new Map();
  for (const membro of equipe) {
    if (membro.funcao !== 'projetos') continue;
    const projeto = inferirProjeto(auditoria?.[membro.usuarioId], catalogo);
    if (projeto) projetos.set(membro.personagem, projeto);
  }
  return projetos;
}

/** Pares cidade×tipo dos projetos (para server/compilacao.mjs buscar o estoque). */
export function paresDosProjetos({ equipe, auditoria, catalogo = CATALOGO }) {
  const pares = new Map();
  for (const { cidadeUf, moduloIds } of projetosDaEquipe(equipe, auditoria, catalogo).values()) {
    for (const moduloId of moduloIds) pares.set(chaveDoPar(cidadeUf, moduloId), { cidadeUf, moduloId });
  }
  return [...pares.values()];
}

/**
 * Fila da equipe: Projetos soma cada par cidade×tipo uma vez (I6); Atualizações
 * soma o déficit de quem tem planilha. Pares sem estoque válido ficam de fora.
 */
export function filaDaEquipe(entradas) {
  const dados = entradas.pessoas ? entradas : montarCompilacao(entradas);
  const pares = new Map(paresDosProjetos(entradas).map((p) => [chaveDoPar(p.cidadeUf, p.moduloId), p]));
  let projetos = 0;
  for (const chave of pares.keys()) {
    const e = entradas.estoque?.[chave];
    if (e && estoqueFecha(e)) projetos += e.naoVersionadas;
  }
  const atualizacoes = Object.values(dados.pessoas)
    .filter((p) => p.funcao === 'atualizacoes' && p.aguardando.valor !== null)
    .reduce((soma, p) => soma + p.aguardando.valor, 0);
  return { projetos, atualizacoes };
}

/**
 * @param {{
 *   equipe: { usuarioId: string, personagem: string, funcao: 'projetos' | 'atualizacoes' }[],
 *   agora: Date,
 *   auditoria?: Record<string, { versoes?: object[], normas?: object[], recentes?: object[] }>,
 *   estoque?: Record<string, { total: number, versionadas: number, naoVersionadas: number }>,
 *   planilhas?: { abas: object[], linhas: object[] } | null,
 *   catalogo?: { id: number, sigla: string | null, nomeSingular: string }[],
 *   cidadesPorId?: Record<string, { nome: string, uf: string }>,
 *   atualizacoesDiaSemana?: 'auditoria' | 'vazio',
 *   avisar?: (mensagem: string) => void,
 * }} entradas
 */
export function montarCompilacao({
  equipe,
  agora,
  auditoria = {},
  estoque = {},
  planilhas = null,
  catalogo = CATALOGO,
  cidadesPorId = {},
  atualizacoesDiaSemana = 'auditoria',
  avisar = () => {},
}) {
  const periodos = calcularPeriodos(agora);
  const ctx = {
    periodos,
    auditoria,
    estoque,
    planilhas,
    catalogo,
    cidadesPorId,
    atualizacoesDiaSemana,
    avisar,
    projetos: projetosDaEquipe(equipe, auditoria, catalogo),
  };
  const pessoas = {};
  for (const membro of equipe) {
    pessoas[membro.personagem] = membro.funcao === 'projetos' ? pessoaDeProjetos(membro, ctx) : pessoaDeAtualizacoes(membro, ctx);
  }
  const dados = {
    referencia: periodos.hoje,
    periodos: { semana: periodos.semana, mes: periodos.mes },
    pessoas,
  };
  return { ...dados, fila: filaDaEquipe({ equipe, auditoria, estoque, catalogo, ...dados }) };
}
