import devTeam from '../../../data/dev-team.json';
import team from '../../../data/team.json';
import { chaveMembro } from './reunioes.js';

/*
 * Quem é cada membro de reunião: o boneco da equipe (suporte ou desenvolvimento)
 * se o nome bater, ou um boneco próprio, gerado pelo id do membro. Sem React:
 * serve à tela de Reuniões da home e à página do cenário de reunião.
 */

// Quem é da equipe, pela chave do nome.
export const EQUIPE = new Map(
  [...team.team, ...devTeam.team].map((pessoa) => [chaveMembro(pessoa.name), pessoa]),
);

// Membro da reunião → id do boneco (o da equipe, se o nome bater) e cargo.
export function identificar(membro) {
  const pessoa = EQUIPE.get(chaveMembro(membro.nome));
  return pessoa ? { id: pessoa.id, cargo: pessoa.role } : { id: membro.id, cargo: null };
}

// "Ana Maria Souza" → "AS"; "Bia" → "B".
export function iniciais(nome) {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}
