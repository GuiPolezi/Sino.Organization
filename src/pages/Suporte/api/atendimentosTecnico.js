import { hojeEmBrasilia } from '../mappers/atendimentos.js';

/** @import { Tecnico } from '../tipos.js' */
/** @import { AtendimentosTecnico } from '../mappers/atendimentos.js' */

const UM_DIA_MS = 864e5;
// Histórico de demonstração: cinco semanas, para o mês e o gráfico terem o que mostrar.
const DIAS_DE_HISTORICO = 35;

// Sorteio fixo por texto: o mesmo técnico tem sempre os mesmos números no mesmo dia.
function sorteio(texto) {
  let hash = 2166136261;
  for (const letra of texto) hash = Math.imul(hash ^ letra.codePointAt(0), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}

function atendimentosFicticios(id, hoje) {
  const base = Date.parse(`${hoje}T00:00:00Z`);
  const porDia = {};

  for (let recuo = 0; recuo < DIAS_DE_HISTORICO; recuo++) {
    const dia = new Date(base - recuo * UM_DIA_MS);
    const fimDeSemana = dia.getUTCDay() === 0 || dia.getUTCDay() === 6;
    if (fimDeSemana) continue;
    const data = dia.toISOString().slice(0, 10);
    // De 6 a 38 atendimentos num dia útil.
    porDia[data] = 6 + Math.round(sorteio(`${id}:${data}`) * 32);
  }

  return {
    ficticio: true,
    tempoMedioMin: 18 + Math.round(sorteio(`${id}:tempo`) * 20),
    chamadosAtribuidos: 4 + Math.round(sorteio(`${id}:chamados`) * 16),
    porDia,
  };
}

/**
 * Atendimentos de cada técnico, para o card. Hoje são números de demonstração
 * (`ficticio: true`): o registro de atendimentos ainda não é consultado.
 * Quando houver backend, só o corpo desta função muda, mantendo o formato de
 * AtendimentosTecnico; técnico sem dados fica sem essas seções no card.
 *
 * @param {Tecnico[]} tecnicos
 * @returns {Promise<Record<string, AtendimentosTecnico>>} por id do técnico
 */
export async function buscarAtendimentos(tecnicos) {
  const hoje = hojeEmBrasilia();
  return Object.fromEntries(tecnicos.map(({ id }) => [id, atendimentosFicticios(id, hoje)]));
}
