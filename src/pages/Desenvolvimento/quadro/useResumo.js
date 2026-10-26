import { useMemo } from 'react';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { useComExMembros } from '../historico.js';
import { visaoGeral } from '../mappers/visaoGeral.js';

/**
 * O que o quadro 3D de /desenvolvimento escreve: o tamanho da equipe e a mesma
 * visão geral do painel que ele abre, no período "todo o tempo".
 */
export function useResumo() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const comExMembros = useComExMembros();
  const chamados = useEquipe((s) => s.chamados);
  const hoje = hojeEmBrasilia();
  return useMemo(
    () => ({ totalDesenvolvedores: tecnicos.length, visao: visaoGeral(comExMembros, chamados, 'tudo', hoje) }),
    [tecnicos, comExMembros, chamados, hoje],
  );
}
