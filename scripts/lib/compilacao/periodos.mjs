// Períodos do /compilacao (I8): hoje, semana e mês pelo relógio de
// America/Sao_Paulo. A semana vai de SEGUNDA a domingo. Datas são texto
// AAAA-MM-DD, que é o formato dos filtros da Auditoria.
const FUSO = 'America/Sao_Paulo';
const formato = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
const MS_DIA = 86_400_000;

// Data civil (AAAA-MM-DD) de um instante, no fuso de São Paulo.
const dataEmSaoPaulo = (instante) => formato.format(instante);

const paraUtc = (data) => {
  const [a, m, d] = data.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};
const deUtc = (ms) => new Date(ms).toISOString().slice(0, 10);

const filtro = ({ inicio, fim }) => ({ dataInicial: inicio, dataFinal: fim });

/** Períodos de um instante (Date ou texto ISO). */
export function calcularPeriodos(referencia = new Date()) {
  const instante = referencia instanceof Date ? referencia : new Date(referencia);
  if (Number.isNaN(instante.getTime())) throw new Error('Instante de referência inválido.');

  const hoje = dataEmSaoPaulo(instante);
  const ms = paraUtc(hoje);
  const diasDesdeSegunda = (new Date(ms).getUTCDay() + 6) % 7;
  const semana = { inicio: deUtc(ms - diasDesdeSegunda * MS_DIA), fim: deUtc(ms + (6 - diasDesdeSegunda) * MS_DIA) };

  const [ano, mes] = hoje.split('-').map(Number);
  const periodoMes = { inicio: deUtc(Date.UTC(ano, mes - 1, 1)), fim: deUtc(Date.UTC(ano, mes, 0)) };

  return {
    hoje,
    semana,
    mes: periodoMes,
    // dataFinal inclusiva? A confirmar em F0 (conferir um dia fechado no painel).
    filtros: {
      hoje: filtro({ inicio: hoje, fim: hoje }),
      semana: filtro(semana),
      mes: filtro(periodoMes),
    },
  };
}
