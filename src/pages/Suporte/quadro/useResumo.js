import { useMemo } from 'react';
import { resumoEquipe } from '../mappers/resumoEquipe.js';
import { useEquipe } from '../store.js';

// Visão geral da equipe, a mesma no quadro 3D e no painel.
export function useResumo() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const extras = useEquipe((s) => s.extrasQuadro);
  return useMemo(() => resumoEquipe(tecnicos, extras), [tecnicos, extras]);
}
