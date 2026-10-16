import { useMemo } from 'react';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { resumoEquipe } from '../mappers/resumoEquipe.js';

// Visão geral da equipe de desenvolvimento, a mesma no quadro 3D e no painel.
export function useResumo() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const chamados = useEquipe((s) => s.chamados);
  const hoje = hojeEmBrasilia();
  return useMemo(() => resumoEquipe(tecnicos, chamados, hoje), [tecnicos, chamados, hoje]);
}
