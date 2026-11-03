/*
 * Os slides de "Destaques" no quadro de /compilacao: cada um mostra só quem ficou
 * em primeiro numa conta (normas do mês, fila, cidades), com a barra dela.
 */

export const SLIDES = [
  { chave: 'compiladas', titulo: 'Normas Compiladas no Mês' },
  { chave: 'fila', titulo: 'Normas Aguardando Compilação' },
  { chave: 'cidades', titulo: 'Cidades em Atuação' },
];

/**
 * Quem ficou em primeiro: o maior valor; no empate, quem vem antes na lista.
 * Sem ninguém, ou com todos em zero ou sem número ("—"), não há primeiro lugar.
 *
 * @template T
 * @param {T[]} pessoas
 * @param {(pessoa: T) => number | null} valorDe
 * @returns {{ pessoa: T, valor: number } | null}
 */
export function primeiroLugar(pessoas, valorDe) {
  let primeiro = null;
  for (const pessoa of pessoas) {
    const valor = valorDe(pessoa);
    if (typeof valor === 'number' && valor > 0 && (!primeiro || valor > primeiro.valor)) primeiro = { pessoa, valor };
  }
  return primeiro;
}

// Os "números redondos" de cada casa decimal que o eixo pode usar como topo.
const REDONDOS = [1, 2, 2.5, 5, 10];

/**
 * O topo do gráfico: o primeiro número redondo (1, 2, 2,5 ou 5 vezes uma potência
 * de 10) que deixa um quinto de folga acima do valor. Assim a barra fica entre
 * dois quintos e quatro quintos da altura, seja 6 cidades ou 1.500 normas.
 * @param {number} valor
 */
export function topoDoGrafico(valor) {
  const alvo = Math.max(valor, 1) * 1.25;
  const casa = 10 ** Math.floor(Math.log10(alvo));
  return REDONDOS.map((redondo) => redondo * casa).find((topo) => topo >= alvo);
}

/**
 * Quem ficou em primeiro em cada slide: o mesmo no painel e na folha da estátua.
 * O ranking vem do mais ao menos produtivo, então no empate vence quem compilou mais.
 * Cidades: Projetos Novos conta 1 (a do projeto); Atualizações, a carteira do mês.
 *
 * @template {{ id: string, normasMes: number | null, emFila: number | null, cidades: number }} P
 * @param {P[]} ranking
 * @returns {Record<'compiladas' | 'fila' | 'cidades', { pessoa: P, valor: number } | null>}
 */
export function primeirosLugares(ranking) {
  return {
    compiladas: primeiroLugar(ranking, ({ normasMes }) => normasMes),
    fila: primeiroLugar(ranking, ({ emFila }) => emFila),
    cidades: primeiroLugar(ranking, ({ cidades }) => cidades),
  };
}
