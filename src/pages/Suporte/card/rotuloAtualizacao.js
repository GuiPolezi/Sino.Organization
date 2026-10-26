import { hojeEmBrasilia } from '../mappers/atendimentos.js';

const formatoHora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/**
 * Rodapé do painel: quando o servidor contou os atendimentos. Se não foi hoje,
 * leva a data também, para um dado de ontem não parecer de agora.
 * @param {string} iso
 * @param {number} [agora]
 */
export function rotuloAtualizacao(iso, agora = Date.now()) {
  const data = new Date(iso);
  const dia = hojeEmBrasilia(data);
  const hora = formatoHora.format(data);
  if (dia === hojeEmBrasilia(agora)) return `Atualizado às ${hora}`;
  return `Atualizado em ${dia.slice(8, 10)}/${dia.slice(5, 7)} às ${hora}`;
}
