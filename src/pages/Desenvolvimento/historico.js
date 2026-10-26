import { useMemo } from 'react';
import { useEquipe } from '../Suporte/store.js';

/**
 * Quem conta nas contas do quadro: a equipe e, depois dela, os ex-membros
 * (exMembro: true). Os bonecos e o card individual usam só a equipe.
 */
export function useComExMembros() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const exMembros = useEquipe((s) => s.exMembros);
  return useMemo(() => (exMembros.length > 0 ? [...tecnicos, ...exMembros] : tecnicos), [tecnicos, exMembros]);
}
