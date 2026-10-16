/*
 * Contas do painel "Quadro da equipe" de /desenvolvimento. Saem dos mesmos
 * chamados dos cards (api/chamados.js), somados para a equipe e filtrados pelo
 * período escolhido no painel: o total de tickets e a carga por desenvolvedor,
 * por categoria e por local.
 */
import { CATEGORIAS, TIPOS, filtrarPorPeriodo } from './chamados.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { Chamado, ChamadosDesenvolvedor, Periodo } from './chamados.js' */

/** Quantos locais o gráfico "Carga por Local" mostra. */
export const LIMITE_LOCAIS = 10;

/** Tipo que soma os tipos de solicitação que o gráfico não conhece. */
export const OUTROS = 'Outros';

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

// Os tipos fixos, sempre, e "Outros" só quando algum chamado tem um tipo novo.
function tiposDoLocal(chamados) {
  const totais = contarPor(chamados, 'tipo');
  const fixos = TIPOS.map((tipo) => ({ tipo, total: totais.get(tipo) ?? 0 }));
  const outros = chamados.length - fixos.reduce((soma, { total }) => soma + total, 0);
  return outros > 0 ? [...fixos, { tipo: OUTROS, total: outros }] : fixos;
}

// Os locais com mais chamados, do maior para o menor; no empate, pelo nome.
function cargaPorLocal(chamados) {
  const comLocal = chamados.filter(({ local }) => local);
  return [...contarPor(comLocal, 'local')]
    .sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b))
    .slice(0, LIMITE_LOCAIS)
    .map(([local, total]) => ({
      local,
      total,
      tipos: tiposDoLocal(comLocal.filter((chamado) => chamado.local === local)),
    }));
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
  const comChamados = tecnicos
    .filter(({ id }) => Array.isArray(chamados[id]?.lista))
    .map(({ id, nome }) => ({ id, nome, lista: filtrarPorPeriodo(chamados[id].lista, periodo, hoje) }));
  const todos = comChamados.flatMap(({ lista }) => lista);

  return {
    total: comChamados.length > 0 ? todos.length : null,
    porDesenvolvedor: comChamados.map(({ id, nome, lista }) => ({ id, nome, total: lista.length })),
    porCategoria: cargaPorCategoria(todos),
    porLocal: cargaPorLocal(todos),
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
