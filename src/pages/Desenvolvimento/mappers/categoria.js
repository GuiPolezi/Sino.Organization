/*
 * Contas do card de uma categoria (o botão do Desempenho no painel do quadro):
 * quem da equipe trabalha na categoria, quantos tickets dela foram criados no
 * período, com que frequência ela aparece entre as solicitações e os três
 * rankings do slide. Tudo sai dos chamados dos desenvolvedores (campo Técnico):
 * tickets de quem não é da equipe, como o suporte, não contam. O período é
 * sempre pela data de criação do ticket.
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
 * @property {{ id: string, nome: string, valor: number | null }[]} itens  na ordem da equipe (no tempo, em horas)
 * @property {string | null} melhor
 */

const UM_DIA_MS = 864e5;
const paraUtc = (data) => Date.parse(`${data}T00:00:00Z`);
// Maior "a cada X" que a frase usa com mais de 1 por vez; acima disso, fica "a cada X, pelo menos 1".
const MAIOR_A_CADA = 10;

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
 * "Em média, a cada X novas solicitações, pelo menos Y são da categoria."
 * X e Y são a fração com X até MAIOR_A_CADA que mais se aproxima da parte da
 * categoria sem passar dela (assim o "pelo menos" vale na média); no empate,
 * a de X menor. Ex.: 45% -> 4 a cada 9; 1/3 -> 1 a cada 3. Abaixo de 1 a cada
 * MAIOR_A_CADA, Y é 1 e X arredonda para cima (8% -> 1 a cada 13). X 1 é
 * "todas". Null quando a categoria não teve nenhuma.
 *
 * @param {number} daCategoria
 * @param {number} total
 * @returns {{ x: number, y: number } | null}
 */
export function aCadaQuantas(daCategoria, total) {
  if (!daCategoria) return null;
  if (daCategoria >= total) return { x: 1, y: 1 };
  const parte = daCategoria / total;
  let melhor = null;
  for (let x = 2; x <= MAIOR_A_CADA; x += 1) {
    const y = Math.floor(x * parte);
    if (y >= 1 && (!melhor || y / x > melhor.y / melhor.x)) melhor = { x, y };
  }
  return melhor ?? { x: Math.ceil(total / daCategoria), y: 1 };
}

/**
 * O tempo médio do ranking, para mostrar: em horas abaixo de 1 dia, em dias a
 * partir dele. `numero` null quando é menos de 1 hora.
 *
 * @param {number} horas
 * @returns {{ numero: number | null, unidade: string }}
 */
export function tempoParaMostrar(horas) {
  if (horas < 1) return { numero: null, unidade: 'Menos de 1 h' };
  if (Math.round(horas) < 24) return { numero: Math.round(horas), unidade: 'h' };
  const dias = Math.round(horas / 24);
  return { numero: dias, unidade: dias === 1 ? 'Dia' : 'Dias' };
}

// Quantas horas o chamado fechado levou: pela hora de abertura e de finalização; sem elas, pelas datas.
function horasAteFechar({ data, fechadoEm, minutos }) {
  if (typeof minutos === 'number') return minutos / 60;
  return fechadoEm ? ((paraUtc(fechadoEm) - paraUtc(data)) / UM_DIA_MS) * 24 : null;
}

/**
 * Tudo o que o card da categoria mostra, para um período.
 *
 * Membros são os desenvolvedores com algum chamado da categoria (campo Técnico),
 * em qualquer data: a fila de rostos não muda a cada troca de período. Os
 * rankings contam os chamados da categoria criados no período: atribuídos são
 * todos eles, fechados os que já estão "Fechado", e o tempo médio é o desses
 * fechados, da abertura à finalização, em horas.
 *
 * Tickets criados são os chamados da categoria criados no período, somando os
 * membros (a soma dos atribuídos). A frequência compara esse número com todos
 * os chamados da equipe criados no período, de qualquer categoria.
 *
 * @param {Tecnico[]} tecnicos na ordem da equipe, com os ex-membros (exMembro: true) no fim
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
      const fechados = atribuidos.filter(({ status }) => status === FECHADO);
      const horas = fechados.map(horasAteFechar).filter((valor) => valor !== null);
      return { tecnico, atribuidos: atribuidos.length, fechados: fechados.length, horas: media(horas) };
    });

  const criados = membros.reduce((soma, { atribuidos }) => soma + atribuidos, 0);
  const total = comChamados.reduce((soma, { id }) => soma + filtrarPorPeriodo(chamados[id].lista, periodo, hoje).length, 0);

  const ranking = (id, titulo, valorDe, menorVence = false) => {
    const itens = membros.map((membro) => ({
      id: membro.tecnico.id,
      nome: membro.tecnico.nome,
      exMembro: membro.tecnico.exMembro === true,
      valor: valorDe(membro),
    }));
    return { id, titulo, menorVence, itens, melhor: primeiroLugar(itens, menorVence) };
  };

  return {
    membros: membros.map(({ tecnico }) => tecnico),
    criados,
    aCada: aCadaQuantas(criados, total),
    /** @type {Ranking[]} */
    rankings: [
      ranking('atribuidos', 'Quantidade de Tickets Atribuídos', ({ atribuidos }) => atribuidos),
      ranking('fechados', 'Quantidade de Tickets Fechados', ({ fechados }) => fechados),
      ranking('tempo', 'Tempo Médio para Finalizar Ticket', ({ horas }) => horas, true),
    ],
    ficticio: comChamados.some(({ id }) => chamados[id].ficticio === true),
  };
}
