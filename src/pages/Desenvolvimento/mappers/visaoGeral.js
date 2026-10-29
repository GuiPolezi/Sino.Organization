/*
 * Contas do painel "Quadro da equipe" de /desenvolvimento. Saem dos mesmos
 * chamados dos cards (api/chamados.js), somados para a equipe e filtrados pelo
 * período escolhido no painel: o total de tickets e a carga por desenvolvedor,
 * por categoria e por local (só a quantidade de cada local).
 */
import { CATEGORIAS, filtrarPorPeriodo } from './chamados.js';
import { nomesCurtos } from './locais.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { Chamado, ChamadosDesenvolvedor, Periodo } from './chamados.js' */

/** Quantos locais o gráfico "Carga por Local" mostra. */
export const LIMITE_LOCAIS = 10;

/** Item que soma o que não tem cor própria nos gráficos do painel (card/cores.js). */
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

// Os locais (campo Local do ticket) com mais chamados, do maior para o menor; no empate, pelo nome.
// `rotulo` é o nome curto do gráfico (mappers/locais.js); `local`, o nome inteiro.
function cargaPorLocal(chamados, curtos) {
  const comLocal = chamados.filter(({ local }) => local);
  return [...contarPor(comLocal, 'local')]
    .sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b))
    .slice(0, LIMITE_LOCAIS)
    .map(([local, total]) => ({ local, rotulo: curtos.get(local) ?? local, total }));
}

/**
 * Tudo o que o painel mostra, para um período. Sem chamados carregados, o total
 * sai null e as listas vazias.
 *
 * @param {Tecnico[]} tecnicos a equipe e, depois dela, os ex-membros (exMembro: true),
 *   para o histórico de quem saiu continuar nas contas
 * @param {Record<string, ChamadosDesenvolvedor>} [chamados] por id do desenvolvedor
 * @param {Periodo} periodo
 * @param {string} hoje "AAAA-MM-DD"
 */
export function visaoGeral(tecnicos, chamados = {}, periodo, hoje) {
  const daEquipe = tecnicos.filter(({ id }) => Array.isArray(chamados[id]?.lista));
  const comChamados = daEquipe.map(({ id, nome, exMembro }) => ({
    id,
    nome,
    exMembro: exMembro === true,
    lista: filtrarPorPeriodo(chamados[id].lista, periodo, hoje),
  }));
  const todos = comChamados.flatMap(({ lista }) => lista);
  const daEquipeToda = daEquipe.flatMap(({ id }) => chamados[id].lista);
  // Os nomes curtos saem de todos os locais, para não mudarem a cada troca de período.
  const curtos = nomesCurtos(daEquipeToda.flatMap(({ local }) => (local ? [local] : [])));

  return {
    total: comChamados.length > 0 ? todos.length : null,
    porDesenvolvedor: comChamados.map(({ id, nome, exMembro, lista }) => ({ id, nome, exMembro, total: lista.length })),
    porCategoria: cargaPorCategoria(todos),
    porLocal: cargaPorLocal(todos, curtos),
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
