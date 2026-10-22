/*
 * Tempo médio diário de atendimento (calculo-tempo-medio-atendimento.md):
 *   minutos trabalhados ÷ atendimentos de hoje
 * É um indicador de ritmo, não um cronômetro: mede quanto expediente o técnico
 * teve, em média, para cada atendimento do dia.
 *
 * Os atendimentos vêm do último sync do Milldesk, então os minutos são contados
 * até o horário desse sync, e não até agora: os dois lados da divisão são do
 * mesmo momento. Sem isso, a média subiria sozinha enquanto o sync não roda.
 * Tudo no horário de Brasília.
 */

/**
 * Expediente de um técnico, com horários "HH:MM" em Brasília.
 * @typedef {object} Expediente
 * @property {string} inicio
 * @property {string} fim
 * @property {string} almocoInicio
 * @property {number} almocoMin  duração do almoço
 */

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const formatoData = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "08:30" -> 510 (minutos desde a meia-noite). */
export function paraMinutos(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Minutos de expediente até `agoraMin`, sem a parte do almoço que já passou e
 * sem passar do fim do expediente.
 * @param {Expediente} expediente
 * @param {number} agoraMin minutos desde a meia-noite
 */
export function minutosTrabalhados(expediente, agoraMin) {
  const inicio = paraMinutos(expediente.inicio);
  const fim = paraMinutos(expediente.fim);
  const almocoInicio = paraMinutos(expediente.almocoInicio);
  const almocoFim = almocoInicio + expediente.almocoMin;

  const fimConsiderado = Math.max(inicio, Math.min(agoraMin, fim));
  const almoco = Math.max(0, Math.min(fimConsiderado, almocoFim) - Math.max(inicio, almocoInicio));
  return Math.max(0, fimConsiderado - inicio - almoco);
}

const fimDeSemana = (data) => {
  const dia = new Date(`${data}T00:00:00Z`).getUTCDay();
  return dia === 0 || dia === 6;
};

/**
 * Tempo médio de hoje, em minutos inteiros, ou null quando não há média:
 * sem expediente, sync de outro dia, sábado ou domingo, nenhum atendimento
 * hoje, ou sync antes do início do expediente.
 *
 * @param {object} dados
 * @param {Expediente} [dados.expediente]
 * @param {Record<string, number>} dados.porDia  atendimentos por dia ("AAAA-MM-DD")
 * @param {string} [dados.atualizadoEm]  data ISO do último sync
 * @param {string} dados.hoje  "AAAA-MM-DD" em Brasília
 * @returns {number | null}
 */
export function tempoMedioDiario({ expediente, porDia, atualizadoEm, hoje }) {
  const momento = Date.parse(atualizadoEm);
  if (!expediente || Number.isNaN(momento)) return null;
  if (formatoData.format(momento) !== hoje || fimDeSemana(hoje)) return null;

  const atendimentos = porDia[hoje] ?? 0;
  const minutos = minutosTrabalhados(expediente, paraMinutos(formatoHora.format(momento)));
  if (atendimentos <= 0 || minutos <= 0) return null;
  return Math.round(minutos / atendimentos);
}

/** 65 -> { horas: 1, minutos: 5 }; abaixo de 1 hora, horas é 0. */
export function partesDaDuracao(totalMin) {
  return { horas: Math.floor(totalMin / 60), minutos: totalMin % 60 };
}
