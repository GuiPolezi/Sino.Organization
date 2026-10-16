/*
 * O que vai escrito no quadro da cena de /suporte, a partir da visão geral da
 * equipe (mappers/resumoEquipe.js). Cada anotação só existe quando há dado para
 * ela; sem dado, ela sai null e não é desenhada.
 */

/** @import { AnotacoesQuadro } from './texturas.js' */

const META_SLA = 95;

const decimal = (valor) => valor.toFixed(1).replace('.', ',');

// Uma linha por meta que tem dado; `alerta` pinta a linha de vermelho.
function metasDaSemana(resumo) {
  const { slaMedio, atendimentosHoje, chamados, avaliacaoMedia, tempoMedioPrimeiraResposta } = resumo;
  const metas = [];
  if (slaMedio !== null) {
    metas.push({ texto: `${slaMedio >= META_SLA ? '✓' : '•'} SLA ${slaMedio}%  (meta ${META_SLA}%)` });
  }
  if (atendimentosHoje !== null) metas.push({ texto: `✓ ${atendimentosHoje} atendimentos hoje` });
  if (chamados?.atrasadas > 0) metas.push({ texto: `• ${chamados.atrasadas} atrasados → zerar!`, alerta: true });
  else if (chamados) metas.push({ texto: '✓ nenhum chamado atrasado' });
  if (avaliacaoMedia !== null) metas.push({ texto: `✓ nota média ${decimal(avaliacaoMedia)}` });
  if (tempoMedioPrimeiraResposta !== null) {
    metas.push({ texto: `• 1ª resposta: ${tempoMedioPrimeiraResposta} min` });
  }
  return metas;
}

// Post-it: o total de atendimentos do mês ou, sem esse dado, o tamanho da equipe.
function destaqueDoPostIt(resumo) {
  if (resumo.atendimentosMes !== null) return { numero: resumo.atendimentosMes, linhas: ['atendimentos', 'no mês ★'] };
  if (resumo.totalTecnicos > 0) return { numero: resumo.totalTecnicos, linhas: ['técnicos', 'na equipe ★'] };
  return null;
}

/**
 * @param {ReturnType<typeof import('../mappers/resumoEquipe.js').resumoEquipe>} resumo
 * @returns {AnotacoesQuadro}
 */
export function anotacoesDoQuadro(resumo) {
  const metas = metasDaSemana(resumo);
  return {
    assinatura: 'equipe técnica',
    grafico: resumo.dias.length
      ? { titulo: 'Atendimentos', subtitulo: `últimos ${resumo.dias.length} dias`, dias: resumo.dias }
      : null,
    lista: metas.length ? { titulo: 'Metas da semana', linhas: metas } : null,
    postit: destaqueDoPostIt(resumo),
  };
}
