/** @import { Tecnico } from '../tipos.js' */
/** @import { ExtrasQuadro } from '../mappers/resumoEquipe.js' */

// Concluídos no mês dos três primeiros técnicos, só para o ranking ter o que mostrar.
const CONCLUIDOS_FICTICIOS = [128, 117, 96];

/**
 * Dados do quadro da equipe que não vêm da lista de técnicos. Hoje são números
 * de demonstração (`ficticio: true`): o Milldesk ainda não é consultado para isso.
 * Quando houver backend, só o corpo desta função muda, mantendo o formato de
 * ExtrasQuadro; campo que o backend não enviar simplesmente não aparece na tela.
 *
 * @param {Tecnico[]} tecnicos
 * @returns {Promise<ExtrasQuadro>}
 */
export async function buscarExtrasQuadro(tecnicos) {
  return {
    ficticio: true,
    atendimentosHoje: 47,
    atendimentosUltimosDias: [41, 52, 44, 38, 47],
    tempoMedioPrimeiraResposta: 18,
    resolvidosPrimeiroContato: 72,
    satisfacaoClientes: 94,
    atualizadoEm: new Date().toISOString(),
    chamados: { abertos: 23, emAndamento: 14, concluidasMes: 412, atrasadas: 3 },
    slaMedio: 96,
    avaliacaoMedia: 4.7,
    destaques: tecnicos
      .slice(0, CONCLUIDOS_FICTICIOS.length)
      .map(({ id }, i) => ({ id, concluidasMes: CONCLUIDOS_FICTICIOS[i] })),
  };
}
