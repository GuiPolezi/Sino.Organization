/*
 * Contas do painel "Quadro da equipe" de /desenvolvimento. Saem dos mesmos
 * chamados dos cards (api/chamados.js), somados para a equipe e filtrados pelo
 * período escolhido no painel: o total de tickets e a carga por desenvolvedor,
 * por categoria e por local.
 */
import { CATEGORIAS, filtrarPorPeriodo } from './chamados.js';
import { nomesCurtos } from './locais.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { Chamado, ChamadosDesenvolvedor, Periodo } from './chamados.js' */

/** Quantos locais o gráfico "Carga por Local" mostra. */
export const LIMITE_LOCAIS = 10;

/** Quantas subcategorias ganham cor própria na "Carga por Local"; as demais somam em "Outros". */
export const LIMITE_TIPOS = 5;

/** Tipo que soma as subcategorias sem cor própria. */
export const OUTROS = 'Outros';

// O assunto de quem não tem subcategoria no Milldesk (SEM_ASSUNTO em scripts/lib/build-chamados.mjs).
const SEM_ASSUNTO = 'Sem assunto';

const porNome = (a, b) => a.localeCompare(b, 'pt-BR');

/** @param {Chamado[]} chamados @param {keyof Chamado} campo */
function contarPor(chamados, campo) {
  const totais = new Map();
  for (const chamado of chamados) totais.set(chamado[campo], (totais.get(chamado[campo]) ?? 0) + 1);
  return totais;
}

// Na ordem dos botões do Desempenho; uma categoria nova vai para o fim, em ordem alfabética.
function cargaPorCategoria(chamados) {
  const totais = contarPor(chamados, 'categoria');
  const novas = [...totais.keys()].filter((nome) => !CATEGORIAS.includes(nome)).sort(porNome);
  return [...CATEGORIAS, ...novas]
    .filter((nome) => totais.has(nome))
    .map((nome) => ({ nome, total: totais.get(nome) }));
}

/*
 * Os tipos da "Carga por Local" são as subcategorias do Milldesk (o assunto do
 * chamado). As LIMITE_TIPOS mais comuns na equipe, em todo o tempo, ganham cor
 * própria; "Sem assunto" (e um "Outros" que venha do Milldesk) nunca é uma
 * delas. A conta usa todos os chamados, e não só os do período, para as cores e
 * a legenda não mudarem a cada troca de período.
 */
function tiposComCor(todos) {
  return [...contarPor(todos, 'assunto')]
    .filter(([assunto]) => assunto && assunto !== SEM_ASSUNTO && assunto !== OUTROS)
    .sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b))
    .slice(0, LIMITE_TIPOS)
    .map(([assunto]) => assunto);
}

// Os tipos com cor, sempre (mesmo zerados), e "Outros" só quando sobra chamado.
function tiposDoLocal(chamados, comCor) {
  const totais = contarPor(chamados, 'assunto');
  const fixos = comCor.map((tipo) => ({ tipo, total: totais.get(tipo) ?? 0 }));
  const outros = chamados.length - fixos.reduce((soma, { total }) => soma + total, 0);
  return outros > 0 ? [...fixos, { tipo: OUTROS, total: outros }] : fixos;
}

// Todas as subcategorias do local, da mais comum para a menos comum (para a dica do gráfico).
const assuntosDoLocal = (chamados) =>
  [...contarPor(chamados, 'assunto')]
    .sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b))
    .map(([assunto, total]) => ({ assunto, total }));

// Os locais (campo Local do ticket) com mais chamados, do maior para o menor; no empate, pelo nome.
// `rotulo` é o nome curto do gráfico (mappers/locais.js); `local`, o nome inteiro.
function cargaPorLocal(chamados, comCor, curtos) {
  const comLocal = chamados.filter(({ local }) => local);
  return [...contarPor(comLocal, 'local')]
    .sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b))
    .slice(0, LIMITE_LOCAIS)
    .map(([local, total]) => {
      const doLocal = comLocal.filter((chamado) => chamado.local === local);
      const rotulo = curtos.get(local) ?? local;
      return { local, rotulo, total, tipos: tiposDoLocal(doLocal, comCor), assuntos: assuntosDoLocal(doLocal) };
    });
}

/**
 * Tudo o que o painel mostra, para um período. Sem chamados carregados, o total
 * sai null e as listas vazias.
 *
 * @param {Tecnico[]} tecnicos
 * @param {Record<string, ChamadosDesenvolvedor>} [chamados] por id do desenvolvedor
 * @param {Periodo} periodo
 * @param {string} hoje "AAAA-MM-DD"
 */
export function visaoGeral(tecnicos, chamados = {}, periodo, hoje) {
  const daEquipe = tecnicos.filter(({ id }) => Array.isArray(chamados[id]?.lista));
  const comChamados = daEquipe.map(({ id, nome }) => ({ id, nome, lista: filtrarPorPeriodo(chamados[id].lista, periodo, hoje) }));
  const todos = comChamados.flatMap(({ lista }) => lista);
  const daEquipeToda = daEquipe.flatMap(({ id }) => chamados[id].lista);
  const comCor = tiposComCor(daEquipeToda);
  // Os nomes curtos saem de todos os locais, para não mudarem a cada troca de período.
  const curtos = nomesCurtos(daEquipeToda.flatMap(({ local }) => (local ? [local] : [])));
  const porLocal = cargaPorLocal(todos, comCor, curtos);
  const temOutros = porLocal.some(({ tipos }) => tipos.some(({ tipo }) => tipo === OUTROS));

  return {
    total: comChamados.length > 0 ? todos.length : null,
    porDesenvolvedor: comChamados.map(({ id, nome, lista }) => ({ id, nome, total: lista.length })),
    porCategoria: cargaPorCategoria(todos),
    porLocal,
    // Os tipos da legenda da "Carga por Local", na ordem das cores.
    tiposDosLocais: temOutros ? [...comCor, OUTROS] : comCor,
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
