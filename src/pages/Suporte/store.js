import { create } from 'zustand';

// Estado discreto (React). O que muda a cada frame fica fora do React, mais abaixo.
export const useEquipe = create((set) => ({
  tecnicos: [],
  carregando: true,
  erro: false,
  selecionado: null,
  // 'quadro' quando o painel do quadro da equipe está aberto.
  painel: null,
  hover: null,
  // Dados do quadro que não saem dos técnicos (api/resumoEquipe.js).
  extrasQuadro: null,
  // Atendimentos de cada técnico, por id, para o card (api/atendimentosTecnico.js).
  atendimentos: {},
  setTecnicos: (tecnicos) => set({ tecnicos, carregando: false, erro: false }),
  setErro: () => set({ carregando: false, erro: true }),
  setExtrasQuadro: (extrasQuadro) => set({ extrasQuadro }),
  setAtendimentos: (atendimentos) => set({ atendimentos }),
  // Card do técnico e painel do quadro nunca ficam abertos juntos.
  selecionar: (id) => set({ selecionado: id, painel: null }),
  abrirQuadro: () => set({ painel: 'quadro', selecionado: null, hover: null }),
  fecharPainel: () => set({ painel: null }),
  setHover: (id) => set({ hover: id }),
  // Vai para o técnico vizinho do selecionado, dando a volta na lista.
  navegar: (passo) =>
    set(({ tecnicos, selecionado }) => {
      const atual = tecnicos.findIndex((tecnico) => tecnico.id === selecionado);
      if (atual === -1) return {};
      const proximo = (atual + passo + tecnicos.length) % tecnicos.length;
      return { selecionado: tecnicos[proximo].id };
    }),
  limpar: () => set({ selecionado: null, painel: null, hover: null }),
}));

// id -> THREE.Vector3, mutado dentro de useFrame.
export const posicoes = new Map();

// Área por onde os bonecos andam (elipse). Ajustada em telas estreitas.
export const AREA = { rx: 6.2, rz: 3.4 };

// Espelho de prefers-reduced-motion, lido a cada frame sem consultar o matchMedia.
export const MOVIMENTO = { reduzido: false };
