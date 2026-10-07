import { create } from 'zustand';

// Estado discreto (React). O que muda a cada frame fica fora do React, mais abaixo.
export const useEquipe = create((set) => ({
  tecnicos: [],
  carregando: true,
  erro: false,
  selecionado: null,
  hover: null,
  setTecnicos: (tecnicos) => set({ tecnicos, carregando: false, erro: false }),
  setErro: () => set({ carregando: false, erro: true }),
  selecionar: (id) => set({ selecionado: id }),
  setHover: (id) => set({ hover: id }),
  // Vai para o técnico vizinho do selecionado, dando a volta na lista.
  navegar: (passo) =>
    set(({ tecnicos, selecionado }) => {
      const atual = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
      if (atual === -1) return {};
      const proximo = (atual + passo + tecnicos.length) % tecnicos.length;
      return { selecionado: tecnicos[proximo].id };
    }),
  limpar: () => set({ selecionado: null, hover: null }),
}));

// id -> THREE.Vector3, mutado dentro de useFrame.
export const posicoes = new Map();

// Área por onde os bonecos andam (elipse). Ajustada em telas estreitas.
export const AREA = { rx: 6.2, rz: 3.4 };

// Espelho de prefers-reduced-motion, lido a cada frame sem consultar o matchMedia.
export const MOVIMENTO = { reduzido: false };
