/** @import { Expediente } from './mappers/tempoMedio.js' */

/**
 * Expediente de cada técnico, por id (scripts/data/support-team.json), no
 * horário de Brasília. Usado no tempo médio diário de atendimento do card.
 * Não trabalham sábado e domingo. Técnico sem expediente aqui fica sem tempo médio.
 * @type {Record<string, Expediente>}
 */
export const EXPEDIENTES = {
  roberto: { inicio: '08:00', fim: '17:00', almocoInicio: '13:00', almocoMin: 60 },
  fabio: { inicio: '09:00', fim: '18:00', almocoInicio: '13:00', almocoMin: 60 },
  'guilherme-p': { inicio: '08:00', fim: '17:00', almocoInicio: '11:00', almocoMin: 60 },
  luiz: { inicio: '09:00', fim: '18:00', almocoInicio: '11:00', almocoMin: 60 },
};
