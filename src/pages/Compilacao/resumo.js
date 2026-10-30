/*
 * Contas da compilação: a produção de cada pessoa (para o card dela) e a visão
 * geral da equipe (para o painel do quadro e a folha da estátua). Tudo sai dos
 * números escritos à mão em dados.js; as contas de dias e semanas são as mesmas
 * do suporte (Suporte/mappers/atendimentos.js).
 */
import { diasRecentes, totaisDeAtendimentos } from '../Suporte/mappers/atendimentos.js';
import { META_DO_MES, PRODUCAO, TIPOS_DE_NORMA, normasPorDia } from './dados.js';

/** @import { Tecnico } from '../Suporte/tipos.js' */

/**
 * Inteiros que somam `total`, repartidos pelas partes: cada um fica com o piso e
 * as unidades que faltam vão para os maiores restos (no empate, o primeiro).
 * @param {number} total
 * @param {number[]} partes somam 1
 */
export function repartir(total, partes) {
  const exatos = partes.map((parte) => total * parte);
  const inteiros = exatos.map(Math.floor);
  const faltam = total - inteiros.reduce((a, b) => a + b, 0);
  exatos
    .map((exato, i) => ({ i, resto: exato - inteiros[i] }))
    .toSorted((a, b) => b.resto - a.resto || a.i - b.i)
    .slice(0, Math.max(0, faltam))
    .forEach(({ i }) => {
      inteiros[i] += 1;
    });
  return inteiros;
}

/**
 * Produção de uma pessoa: as normas por dia (o gráfico do card), os totais de
 * hoje, da semana e do mês, e quantas estão na fila dela.
 * @param {string} id
 * @param {string} hoje "AAAA-MM-DD"
 */
export function producaoDe(id, hoje) {
  const porDia = normasPorDia(id, hoje);
  return { porDia, totais: totaisDeAtendimentos(porDia, hoje), emFila: PRODUCAO[id]?.emFila ?? 0 };
}

/**
 * Visão geral da equipe.
 * @param {Tecnico[]} tecnicos
 * @param {string} hoje "AAAA-MM-DD"
 */
export function resumoCompilacao(tecnicos, hoje) {
  const daEquipe = {};
  const ranking = tecnicos
    .map(({ id, nome, funcao }) => {
      const { porDia, totais, emFila } = producaoDe(id, hoje);
      for (const [data, valor] of Object.entries(porDia)) daEquipe[data] = (daEquipe[data] ?? 0) + valor;
      return { id, nome, funcao, normasMes: totais.mes, emFila };
    })
    .toSorted((a, b) => b.normasMes - a.normasMes);

  const totais = totaisDeAtendimentos(daEquipe, hoje);
  const porTipo = repartir(
    totais.mes,
    TIPOS_DE_NORMA.map(({ parte }) => parte),
  ).map((valor, i) => ({ chave: TIPOS_DE_NORMA[i].chave, rotulo: TIPOS_DE_NORMA[i].rotulo, cor: TIPOS_DE_NORMA[i].cor, valor }));

  return {
    totalCompiladores: tecnicos.length,
    normasMes: totais.mes,
    normasHoje: totais.hoje,
    normasSemana: totais.semana,
    emFila: ranking.reduce((soma, { emFila }) => soma + emFila, 0),
    meta: META_DO_MES,
    // Parte da meta do mês já cumprida, de 0 a 100 (passa de 100 quando a meta é batida).
    metaCumprida: Math.round((totais.mes / META_DO_MES) * 100),
    dias: diasRecentes(daEquipe, hoje, 5),
    porTipo,
    ranking,
  };
}
