import { useMemo } from 'react';
import { hojeEmBrasilia } from '../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../Suporte/store.js';
import { resumoCompilacao } from './resumo.js';

// Visão geral da compilação, a mesma na folha da estátua e no painel do quadro.
export function useResumo() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const hoje = hojeEmBrasilia();
  return useMemo(() => resumoCompilacao(tecnicos, hoje), [tecnicos, hoje]);
}
