/*
 * Contas do card do técnico: totais de atendimentos, a semana do gráfico e a
 * escala do eixo Y. Datas são sempre "AAAA-MM-DD" no horário de Brasília e toda
 * a aritmética é feita em UTC sobre essa data, sem depender do fuso do navegador.
 */

/**
 * Atendimentos de um técnico (api/atendimentosTecnico.js).
 *
 * @typedef {object} AtendimentosTecnico
 * @property {boolean} [ficticio]            dados de demonstração, ainda sem backend
 * @property {number} [tempoMedioMin]        tempo médio diário de atendimento, em minutos
 * @property {number} [chamadosAtribuidos]   chamados hoje atribuídos ao técnico
 * @property {Record<string, number>} porDia atendimentos por dia ("AAAA-MM-DD" -> total)
 */

const UM_DIA_MS = 864e5;
const DIAS_NA_SEMANA = 7;
// Até quantos intervalos o eixo Y tem antes de trocar de passo.
const MAX_INTERVALOS = 5;
const formatoDataBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** A data de hoje em Brasília, "AAAA-MM-DD". */
export const hojeEmBrasilia = (agora = Date.now()) => formatoDataBrasilia.format(agora);

const paraUtc = (data) => Date.parse(`${data}T00:00:00Z`);
const somarDias = (data, dias) => new Date(paraUtc(data) + dias * UM_DIA_MS).toISOString().slice(0, 10);
const diaDaSemana = (data) => new Date(paraUtc(data)).getUTCDay(); // 0 = domingo
const domingoDe = (data) => somarDias(data, -diaDaSemana(data));
// "2026-10-05" -> "05/10"
const diaMes = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

// Semana do mês da data, contando como 1ª a semana (de domingo a sábado) que contém o dia 1.
function semanaDoMes(data) {
  const primeiroDia = diaDaSemana(`${data.slice(0, 8)}01`);
  return Math.ceil((Number(data.slice(8, 10)) + primeiroDia) / DIAS_NA_SEMANA);
}

/**
 * Totais de hoje, da semana (domingo a sábado) e do mês corrente.
 * @param {Record<string, number>} porDia
 * @param {string} hoje "AAAA-MM-DD"
 */
export function totaisDeAtendimentos(porDia, hoje) {
  const domingo = domingoDe(hoje);
  const sabado = somarDias(domingo, DIAS_NA_SEMANA - 1);
  const mes = hoje.slice(0, 7);
  const totais = { hoje: porDia[hoje] ?? 0, semana: 0, mes: 0 };

  for (const [data, total] of Object.entries(porDia)) {
    if (data >= domingo && data <= sabado) totais.semana += total;
    if (data.startsWith(mes)) totais.mes += total;
  }
  return totais;
}

/**
 * A semana do gráfico: os 7 dias, de domingo a sábado. `recuo` é quantas semanas
 * antes da atual (0 = a semana de hoje). O rótulo usa os dias úteis, de segunda
 * a sexta, e o número da semana dentro do mês da segunda-feira.
 *
 * @param {Record<string, number>} porDia
 * @param {string} hoje "AAAA-MM-DD"
 * @param {number} [recuo]
 */
export function semanaDoGrafico(porDia, hoje, recuo = 0) {
  const domingo = somarDias(domingoDe(hoje), -recuo * DIAS_NA_SEMANA);
  const segunda = somarDias(domingo, 1);
  const dias = Array.from({ length: DIAS_NA_SEMANA }, (_, i) => {
    const data = somarDias(domingo, i);
    return { data, rotulo: diaMes(data), total: porDia[data] ?? 0, hoje: data === hoje };
  });

  return {
    numero: semanaDoMes(segunda),
    periodo: `${diaMes(segunda)} - ${diaMes(somarDias(segunda, 4))}`,
    dias,
  };
}

/** Quantas semanas dá para voltar no gráfico: até a do dia mais antigo com registro. */
export function semanasAnteriores(porDia, hoje) {
  const datas = Object.keys(porDia).filter((data) => data <= hoje);
  if (!datas.length) return 0;
  const maisAntiga = datas.reduce((a, b) => (a < b ? a : b));
  return Math.round((paraUtc(domingoDe(hoje)) - paraUtc(domingoDe(maisAntiga))) / (UM_DIA_MS * DIAS_NA_SEMANA));
}

/**
 * Eixo Y que acompanha os dados: o topo é o primeiro múltiplo do passo acima do
 * maior valor (sobra um respiro sobre a barra mais alta) e o passo cresce para
 * o eixo nunca ter marcas demais. Ex.: até 9 -> topo 10; 31 -> 40; 40 -> 50.
 *
 * @param {number} maximo maior valor do gráfico
 * @returns {{ topo: number, marcas: number[] }} marcas de 0 até o topo
 */
export function escalaY(maximo) {
  const valor = Math.max(0, maximo);
  let passo = 1;
  // 1, 2, 5, 10, 20, 50, 100…
  for (let i = 0; Math.ceil(valor / passo) > MAX_INTERVALOS; i++) {
    passo = [1, 2, 5][(i + 1) % 3] * 10 ** Math.floor((i + 1) / 3);
  }
  // Com poucos atendimentos o eixo não desce abaixo de 0–10, de 2 em 2.
  passo = Math.max(passo, 2);
  const topo = Math.max((Math.floor(valor / passo) + 1) * passo, 10);
  const marcas = Array.from({ length: topo / passo + 1 }, (_, i) => i * passo);
  return { topo, marcas };
}
