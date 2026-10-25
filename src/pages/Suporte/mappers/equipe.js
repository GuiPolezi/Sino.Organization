/** @import { Tecnico } from '../tipos.js' */

const iniciais = (nome) => {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes.at(-1)[0] : '';
  return (partes[0][0] + ultima).toUpperCase();
};

/**
 * Único lugar que conhece o formato das pessoas que /api/equipes/* devolve
 * (scripts/lib/build-team.mjs). Quando elas ganharem campos novos, eles entram aqui.
 * @returns {Tecnico}
 */
export function mapearTecnico({ id, name, role, absent }) {
  return {
    id,
    nome: name,
    funcao: role,
    ausente: absent,
    avatarIniciais: iniciais(name),
  };
}
