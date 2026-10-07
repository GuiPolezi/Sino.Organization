/** @import { Tecnico } from '../tipos.js' */

const iniciais = (nome) => {
  const partes = nome.trim().split(/\s+/);
  const ultima = partes.length > 1 ? partes.at(-1)[0] : '';
  return (partes[0][0] + ultima).toUpperCase();
};

/**
 * Único lugar que conhece o formato de src/data/team.json (gerado por
 * `npm run sync:team`). Quando o arquivo ganhar campos novos, eles entram aqui.
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
