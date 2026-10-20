import { identificar, iniciais } from '../../components/Hero/reunioes/membrosEquipe.js';

/** @import { Tecnico } from '../Suporte/tipos.js' */

/**
 * Membros da reunião → bonecos da cena, no formato da equipe (Suporte/tipos.js).
 * Quem é da equipe vira o boneco dela (mesmo id, mesma aparência, cargo no
 * card); os demais ganham um boneco próprio, sempre o mesmo para o membro.
 * @param {{ membros?: { id: string, nome: string }[] } | null} reuniao
 * @returns {Tecnico[]}
 */
export function bonecosDa(reuniao) {
  const vistos = new Set();
  return (reuniao?.membros ?? []).flatMap((membro) => {
    const { id, cargo } = identificar(membro);
    if (vistos.has(id)) return [];
    vistos.add(id);
    return [{ id, nome: membro.nome, funcao: cargo, ausente: false, avatarIniciais: iniciais(membro.nome) }];
  });
}

/** O que muda os bonecos (quem está e com que nome), para comparar duas versões da reunião. */
export const chaveDosMembros = (reuniao) => (reuniao?.membros ?? []).map(({ id, nome }) => `${id}:${nome}`).join('|');
