import { create } from 'zustand';

// Estado discreto (React). O que muda a cada frame fica fora do React, mais abaixo.
export const useEquipe = create((set) => ({
  tecnicos: [],
  carregando: true,
  erro: false,
  selecionado: null,
  // 'quadro' com o painel do quadro da equipe aberto; 'categoria' com o card de uma categoria dele.
  painel: null,
  // Categoria do card aberto pelo Desempenho do quadro (/desenvolvimento).
  categoria: null,
  hover: null,
  // Dados do quadro que não saem dos técnicos (mappers/resumoEquipe.js). Hoje só
  // a hora em que o servidor contou os atendimentos (atualizadoEm).
  extrasQuadro: null,
  // Atendimentos de cada técnico, por id, para o card (api/atendimentosTecnico.js).
  atendimentos: {},
  // Situação da busca dos atendimentos (/suporte) ou dos chamados (/desenvolvimento),
  // controlada por api/acompanharComplementos.js. null quando a página não busca
  // nada (reuniões usam o mesmo card); 'carregando' até a primeira resposta,
  // 'pronto' depois dela e 'erro' quando ela falhou e não há nada para mostrar.
  situacaoComplementos: null,
  // Busca de novo na hora (botão "Tentar de novo"); null sem a busca.
  recarregarComplementos: null,
  // Chamados de cada desenvolvedor, por id, para o card de /desenvolvimento.
  chamados: {},
  // Quando o servidor juntou esses chamados (data ISO), para o rodapé do painel.
  chamadosGeradoEm: null,
  // Quem saiu da equipe de /desenvolvimento: sem boneco, mas com o histórico no quadro.
  exMembros: [],
  setTecnicos: (tecnicos) => set({ tecnicos, carregando: false, erro: false }),
  setErro: () => set({ carregando: false, erro: true }),
  setAtendimentos: (atendimentos, geradoEm) => set({ atendimentos, extrasQuadro: { atualizadoEm: geradoEm } }),
  setChamados: (chamados, geradoEm = null) => set({ chamados, chamadosGeradoEm: geradoEm }),
  setExMembros: (exMembros) => set({ exMembros }),
  // Card do técnico e painel do quadro nunca ficam abertos juntos.
  selecionar: (id) => set({ selecionado: id, painel: null }),
  abrirQuadro: () => set({ painel: 'quadro', selecionado: null, hover: null }),
  abrirCategoria: (categoria) => set({ painel: 'categoria', categoria, selecionado: null, hover: null }),
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

/*
 * Tamanho da área de caminhada (as duas formas da elipse por onde os bonecos
 * andam), quanto o tapete desenhado passa dela (margemTapete, em metros) e
 * quanto a câmera recua na vista geral. Valem para /suporte; outra página muda
 * com configurarCena antes de a cena montar.
 */
export const CENA = {
  areaPaisagem: { rx: 6.2, rz: 3.4 },
  areaRetrato: { rx: 3.3, rz: 4.4 },
  margemTapete: 1.7,
  recuo: 1,
  // Em tela retrato a câmera recua encaixeRetrato / aspecto, até recuoMaxRetrato (cena/CameraRig.jsx).
  encaixeRetrato: 0.95,
  recuoMaxRetrato: 2,
};

// Área por onde os bonecos andam (elipse): a de CENA na forma da tela (cena/Cena.jsx).
export const AREA = { ...CENA.areaPaisagem };

/**
 * Troca o tamanho da área, a margem do tapete e o recuo da câmera da página.
 * @param {Partial<typeof CENA>} config
 */
export function configurarCena(config) {
  Object.assign(CENA, config);
  Object.assign(AREA, CENA.areaPaisagem);
}

// Espelho de prefers-reduced-motion, lido a cada frame sem consultar o matchMedia.
export const MOVIMENTO = { reduzido: false };

/**
 * Tempo que um frame avança, em segundos. Depois de uma travada (um frame de
 * mais de 100 ms, como a montagem de um painel), avança um frame comum: senão a
 * câmera e os bonecos dariam o maior passo permitido de uma vez, num tranco.
 * @param {number} delta segundos desde o frame anterior
 */
export const passoDoFrame = (delta) => (delta > 0.1 ? 1 / 60 : Math.min(delta, 0.05));
