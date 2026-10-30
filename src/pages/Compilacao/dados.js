/*
 * Números da compilação, escritos à mão: a página ainda não tem fonte (não usa a
 * API do Milldesk). Para mudar o que o quadro e os cards mostram, edite aqui:
 *
 *   PRODUCAO       quantas normas cada pessoa compila num dia útil, em média, e
 *                  quantas estão na fila dela agora
 *   TIPOS_DE_NORMA a parte de cada tipo no total compilado (as partes somam 1)
 *   META_DO_MES    normas que a equipe quer compilar no mês
 *
 * O dia a dia de cada pessoa sai da média dela (normasPorDia): segunda a sexta,
 * com uma variação fixa por pessoa e por data, a mesma a cada visita. Quando
 * houver fonte de verdade, ela entra no lugar de normasPorDia e o resto segue igual.
 */

/** @type {Record<string, { mediaDiaria: number, emFila: number }>} */
export const PRODUCAO = {
  helena: { mediaDiaria: 6, emFila: 3 },
  marcos: { mediaDiaria: 11, emFila: 8 },
  leticia: { mediaDiaria: 9, emFila: 5 },
  bruno: { mediaDiaria: 7, emFila: 12 },
  camila: { mediaDiaria: 10, emFila: 4 },
  otavio: { mediaDiaria: 5, emFila: 6 },
  priscila: { mediaDiaria: 8, emFila: 7 },
};

export const TIPOS_DE_NORMA = [
  { chave: 'leis', rotulo: 'Leis Ordinárias', parte: 0.36, cor: '#4FA46B' },
  { chave: 'decretos', rotulo: 'Decretos', parte: 0.27, cor: '#7FA7D9' },
  { chave: 'resolucoes', rotulo: 'Resoluções', parte: 0.14, cor: '#F2B632' },
  { chave: 'portarias', rotulo: 'Portarias', parte: 0.12, cor: '#E58F8F' },
  { chave: 'complementares', rotulo: 'Leis Complementares', parte: 0.07, cor: '#B79CE0' },
  { chave: 'emendas', rotulo: 'Emendas à Lei Orgânica', parte: 0.04, cor: '#6FC3C8' },
];

export const META_DO_MES = 1100;

// Até quantos dias para trás existe produção (o gráfico do card volta até lá).
const DIAS_DE_HISTORICO = 56;
const UM_DIA_MS = 864e5;

// Número estável de 0 a 1 a partir de um texto: a mesma pessoa no mesmo dia, o mesmo valor.
function sorteioFixo(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const somarDias = (data, dias) => new Date(Date.parse(`${data}T00:00:00Z`) + dias * UM_DIA_MS).toISOString().slice(0, 10);
const fimDeSemana = (data) => [0, 6].includes(new Date(`${data}T00:00:00Z`).getUTCDay());

/**
 * Normas compiladas por dia ("AAAA-MM-DD" -> total), dos últimos 56 dias até
 * hoje, no formato dos atendimentos do suporte (Suporte/mappers/atendimentos.js).
 * Sábado e domingo ficam de fora. Hoje conta só uma parte do dia.
 *
 * @param {string} id
 * @param {string} hoje "AAAA-MM-DD"
 * @returns {Record<string, number>}
 */
export function normasPorDia(id, hoje) {
  const producao = PRODUCAO[id];
  if (!producao) return {};
  const porDia = {};
  for (let recuo = 0; recuo < DIAS_DE_HISTORICO; recuo++) {
    const data = somarDias(hoje, -recuo);
    if (fimDeSemana(data)) continue;
    // De 55% a 145% da média; hoje, só a metade (o dia ainda não acabou).
    const fator = 0.55 + sorteioFixo(`${id}:${data}`) * 0.9;
    porDia[data] = Math.round(producao.mediaDiaria * fator * (recuo === 0 ? 0.5 : 1));
  }
  return porDia;
}
