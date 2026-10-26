import { acompanharComplementos } from './api/acompanharComplementos.js';
import { buscarAtendimentos } from './api/atendimentosTecnico.js';
import { buscarEquipe } from './api/equipeTecnica.js';
import PaginaEquipe from './PaginaEquipe.jsx';
import { configurarCena, useEquipe } from './store.js';

/*
 * Câmera da vista geral um pouco mais afastada: em telas 16:9 (como 1536×864)
 * o tapete passava das bordas da tela. Ajustado aqui, ao carregar a página e
 * antes de a cena montar, para não mexer no padrão de store.js (/desenvolvimento
 * tem o seu próprio recuo).
 */
configurarCena({ recuo: 1.15 });

/*
 * Os atendimentos completam o card e o quadro. Até chegarem, os cards dizem que
 * estão carregando (nada de número de exemplo); com a página aberta eles são
 * buscados de novo sozinhos (api/acompanharComplementos.js).
 */
function buscarComplementos(equipe) {
  const parar = acompanharComplementos({
    buscar: () => buscarAtendimentos(equipe),
    aoReceber: ({ porTecnico, geradoEm }) => useEquipe.getState().setAtendimentos(porTecnico, geradoEm),
  });

  return () => {
    parar();
    // Ao voltar à página, nada da visita anterior aparece antes do dado novo.
    useEquipe.setState({ atendimentos: {}, extrasQuadro: null });
  };
}

export default function Suporte() {
  return (
    <PaginaEquipe
      titulo="Suporte"
      subtitulo="Conheça nossa equipe técnica"
      rotuloElenco="Técnicos"
      buscarEquipe={buscarEquipe}
      aoCarregar={buscarComplementos}
    />
  );
}
