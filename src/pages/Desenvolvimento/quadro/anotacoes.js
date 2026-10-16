/*
 * O que vai escrito no quadro da cena de /desenvolvimento, a partir da visão
 * geral da equipe (mappers/resumoEquipe.js). Cada anotação só existe quando há
 * dado para ela; sem dado, ela sai null e não é desenhada.
 */

/** @import { AnotacoesQuadro } from '../../Suporte/quadro/texturas.js' */

// A folha pautada do quadro tem cinco linhas (Suporte/quadro/texturas.js).
const LINHAS_DA_FOLHA = 5;

// Como cada status vai escrito à mão na folha. O que não estiver aqui vai em minúsculas.
const NA_FOLHA = {
  'Com o desenvolvedor': 'com os desenvolvedores',
  'Em atendimento': 'em atendimento',
  'Aguardando Testes': 'aguardando testes',
  'Aguardando Retorno do Solicitante': 'aguardando o solicitante',
  'Aguardando Deploy': 'aguardando deploy',
};

const escrito = ({ status, total }) => {
  if (status === 'Pendente') return total === 1 ? 'pendente' : 'pendentes';
  return NA_FOLHA[status] ?? status.toLocaleLowerCase('pt-BR');
};

// Uma linha por status em aberto. Se não couberem todos, os últimos viram uma linha só.
function linhasDaFila(fila) {
  const cabem = fila.length <= LINHAS_DA_FOLHA ? fila : fila.slice(0, LINHAS_DA_FOLHA - 1);
  const linhas = cabem.map((item) => ({ texto: `• ${item.total} ${escrito(item)}` }));
  if (cabem.length < fila.length) {
    const resto = fila.slice(cabem.length).reduce((total, item) => total + item.total, 0);
    linhas.push({ texto: `• ${resto} em outros status` });
  }
  return linhas;
}

// Post-it: os fechados no mês ou, sem chamados, o tamanho da equipe.
function destaqueDoPostIt(resumo) {
  if (resumo.fechadosMes !== null) return { numero: resumo.fechadosMes, linhas: ['fechados', 'no mês ★'] };
  const total = resumo.totalDesenvolvedores;
  if (total > 0) return { numero: total, linhas: [total === 1 ? 'desenvolvedor' : 'desenvolvedores', 'na equipe ★'] };
  return null;
}

/**
 * @param {ReturnType<typeof import('../mappers/resumoEquipe.js').resumoEquipe>} resumo
 * @returns {AnotacoesQuadro}
 */
export function anotacoesDoQuadro(resumo) {
  return {
    assinatura: 'desenvolvimento',
    grafico: resumo.dias.length
      ? { titulo: 'Chamados', subtitulo: `recebidos nos últimos ${resumo.dias.length} dias`, dias: resumo.dias }
      : null,
    lista: resumo.fila.length ? { titulo: 'Chamados em aberto', linhas: linhasDaFila(resumo.fila) } : null,
    postit: destaqueDoPostIt(resumo),
  };
}
