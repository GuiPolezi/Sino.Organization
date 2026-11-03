import { create } from 'zustand';

/*
 * Os números de /compilacao que vieram do servidor (/api/compilacao): o que os
 * cards, o Quadro da equipe e a folha da estátua leem. Vazio até a primeira
 * resposta (os cards mostram "Carregando…").
 *
 * dados:    { referencia, periodos, pessoas, fila } (scripts/lib/build-compilacao.mjs)
 * geradoEm: quando o servidor buscou no sistema (ISO)
 */
export const useCompilacao = create((set) => ({
  dados: null,
  geradoEm: null,
  receber: ({ dados, geradoEm }) => set({ dados: dados ?? null, geradoEm: geradoEm ?? null }),
  limpar: () => set({ dados: null, geradoEm: null }),
}));

/** Os dados de uma pessoa (ou null: ainda não chegaram, ou ela não está na resposta). */
export const usePessoaCompilacao = (id) => useCompilacao((s) => (id ? (s.dados?.pessoas?.[id] ?? null) : null));
