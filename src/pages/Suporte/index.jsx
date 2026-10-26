import { acompanharFonte } from './api/acompanharFonte.js';
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
 * estão carregando (nada de número de exemplo). Com a página aberta eles são
 * buscados de novo sozinhos: logo, se o servidor mandou a versão anterior do
 * cache ou falhou, e a cada 15 minutos (api/acompanharFonte.js). Uma aba que
 * volta do segundo plano com o dado velho busca na hora.
 */
function buscarComplementos(equipe) {
  const loja = useEquipe.getState();
  useEquipe.setState({ situacaoAtendimentos: 'carregando' });
  const fonte = acompanharFonte({
    buscar: () => buscarAtendimentos(equipe),
    aoReceber: ({ porTecnico, geradoEm }) => useEquipe.getState().setAtendimentos(porTecnico, geradoEm),
    aoFalhar: () => useEquipe.getState().falharAtendimentos(),
  });

  const aoVoltar = () => {
    if (document.visibilityState === 'visible' && fonte.atrasado()) fonte.agora();
  };
  document.addEventListener('visibilitychange', aoVoltar);

  loja.setRecarregarAtendimentos(() => {
    if (useEquipe.getState().situacaoAtendimentos === 'erro') {
      useEquipe.setState({ situacaoAtendimentos: 'carregando' });
    }
    fonte.agora();
  });

  return () => {
    fonte.parar();
    document.removeEventListener('visibilitychange', aoVoltar);
    // Ao voltar à página, nada da visita anterior aparece antes do dado novo.
    useEquipe.setState({
      atendimentos: {},
      extrasQuadro: null,
      situacaoAtendimentos: null,
      recarregarAtendimentos: null,
    });
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
