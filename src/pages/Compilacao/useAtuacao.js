import { useMemo } from 'react';
import { create } from 'zustand';
import { hojeEmBrasilia } from '../Suporte/mappers/atendimentos.js';
import { agoraEmBrasilia, atuacaoDe } from './atuacao.js';

/*
 * As responsabilidades escolhidas no card ("Alterar"), por pessoa. Ficam só na
 * memória da página (ainda não há onde gravar): ao recarregar, volta o que está
 * escrito em atuacao.js.
 */
const useEscolhas = create((set) => ({
  escolhas: {},
  escolher: (id, responsabilidade) =>
    set(({ escolhas }) => ({
      escolhas: { ...escolhas, [id]: { responsabilidade, alteradaEm: agoraEmBrasilia() } },
    })),
}));

/**
 * A atuação de agora de uma pessoa e a função que troca a responsabilidade dela.
 * @param {string} id
 */
export function useAtuacao(id) {
  const escolha = useEscolhas((s) => s.escolhas[id]);
  const escolher = useEscolhas((s) => s.escolher);
  const hoje = hojeEmBrasilia();
  const atuacao = useMemo(() => atuacaoDe(id, hoje, escolha), [id, hoje, escolha]);
  return { atuacao, escolher: (responsabilidade) => escolher(id, responsabilidade) };
}
