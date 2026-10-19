/*
 * Contas do card de uma categoria (o botão do Desempenho no painel do quadro).
 * Saem dos mesmos chamados dos cards (api/chamados.js): quem da equipe trabalha
 * na categoria, quantos tickets dela foram criados no período, com que
 * frequência ela aparece entre as solicitações e os três rankings do slide.
 */
import { FECHADO, filtrarPorPeriodo } from './chamados.js';

/** @import { Tecnico } from '../../Suporte/tipos.js' */
/** @import { ChamadosDesenvolvedor, Periodo } from './chamados.js' */

/**
 * Um ranking do slide. `melhor` é o id do primeiro lugar (null sem ninguém
 * pontuando); em `menorVence` o primeiro é quem tem o menor valor.
 *
 * @typedef {object} Ranking
 * @property {string} id
 * @property {string} titulo
 * @property {boolean} menorVence
 * @property {{ id: string, nome: string, valor: number | null }[]} itens  na ordem da equipe
 * @property {string | null} melhor
 */

const UM_DIA_MS = 864e5;
const paraUtc = (data) => Date.parse(`${data}T00:00:00Z`);

/*
 * O primeiro lugar. Valor null (nada a medir) ou zero num ranking em que o maior
 * vence não disputa; no empate, fica quem vem antes na equipe.
 */
function primeiroLugar(itens, menorVence) {
  const disputam = itens.filter(({ valor }) => valor !== null && (menorVence || valor > 0));
  if (disputam.length === 0) return null;
  return disputam.reduce((lider, item) => (menorVence ? item.valor < lider.valor : item.valor > lider.valor) ? item : lider).id;
}

const media = (valores) => (valores.length ? valores.reduce((soma, valor) => soma + valor, 0) / valores.length : null);

/**
 * "Em média, a cada N novas solicitações, pelo menos 1 é da categoria." N é o
 * total de solicitações do período dividido pelas da categoria, arredondado para
 * cima (assim a frase vale na média). Null quando a categoria não teve nenhuma.
 *
 * Hoje sai da conta dos chamados da equipe; quando a API trouxer a estimativa
 * por categoria (o tempo médio entre um ticket novo e outro da mesma
 * categoria), é só esta função que muda.
 *
 * @param {number} daCategoria
 * @param {number} total
 */
export function aCadaQuantas(daCategoria, total) {
  if (!daCategoria) return null;
  return Math.max(1, Math.ceil(total / daCategoria));
}

/**
 * Tudo o que o card da categoria mostra, para um período.
 *
 * Membros são os desenvolvedores com algum chamado da categoria, em qualquer
 * data: a fila de rostos não muda a cada troca de período. Os rankings contam só
 * o período: atribuídos pela data de atribuição, fechados e tempo médio pela
 * data de fechamento.
 *
 * @param {Tecnico[]} tecnicos na ordem da equipe
 * @param {Record<string, ChamadosDesenvolvedor>} chamados por id
 * @param {string} categoria
 * @param {Periodo} periodo
 * @param {string} hoje "AAAA-MM-DD"
 */
export function desempenhoDaCategoria(tecnicos, chamados = {}, categoria, periodo, hoje) {
  const comChamados = tecnicos.filter(({ id }) => Array.isArray(chamados[id]?.lista));
  const membros = comChamados
    .map((tecnico) => ({ tecnico, daCategoria: chamados[tecnico.id].lista.filter((c) => c.categoria === categoria) }))
    .filter(({ daCategoria }) => daCategoria.length > 0)
    .map(({ tecnico, daCategoria }) => {
      const atribuidos = filtrarPorPeriodo(daCategoria, periodo, hoje);
      // Nos fechados, a data que conta é a do fechamento; de cada um, os dias que levou.
      const fechados = filtrarPorPeriodo(
        daCategoria
          .filter(({ status, fechadoEm }) => status === FECHADO && fechadoEm)
          .map(({ data, fechadoEm }) => ({ data: fechadoEm, dias: (paraUtc(fechadoEm) - paraUtc(data)) / UM_DIA_MS })),
        periodo,
        hoje,
      );
      return { tecnico, atribuidos: atribuidos.length, fechados: fechados.length, dias: media(fechados.map(({ dias }) => dias)) };
    });

  const todosDoPeriodo = comChamados.flatMap(({ id }) => filtrarPorPeriodo(chamados[id].lista, periodo, hoje));
  const criados = todosDoPeriodo.filter((c) => c.categoria === categoria).length;

  const ranking = (id, titulo, valorDe, menorVence = false) => {
    const itens = membros.map((membro) => ({ id: membro.tecnico.id, nome: membro.tecnico.nome, valor: valorDe(membro) }));
    return { id, titulo, menorVence, itens, melhor: primeiroLugar(itens, menorVence) };
  };

  return {
    membros: membros.map(({ tecnico }) => tecnico),
    criados,
    aCada: aCadaQuantas(criados, todosDoPeriodo.length),
    /** @type {Ranking[]} */
    rankings: [
      ranking('atribuidos', 'Quantidade de Tickets Atribuídos', ({ atribuidos }) => atribuidos),
      ranking('fechados', 'Quantidade de Tickets Fechados', ({ fechados }) => fechados),
      ranking('tempo', 'Tempo Médio para Finalizar Ticket', ({ dias }) => dias, true),
    ],
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
