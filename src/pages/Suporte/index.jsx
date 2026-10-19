import { buscarAtendimentos } from './api/atendimentosTecnico.js';
import { buscarEquipe } from './api/equipeTecnica.js';
import { buscarExtrasQuadro } from './api/resumoEquipe.js';
import PaginaEquipe from './PaginaEquipe.jsx';
import { configurarCena, useEquipe } from './store.js';

/*
 * Câmera da vista geral um pouco mais afastada: em telas 16:9 (como 1536×864)
 * o tapete passava das bordas da tela. Ajustado aqui, ao carregar a página e
 * antes de a cena montar, para não mexer no padrão de store.js (/desenvolvimento
 * tem o seu próprio recuo).
 */
configurarCena({ recuo: 1.15 });

// O que complementa a equipe do suporte. Se uma dessas buscas falhar, a página
// continua de pé: o quadro fica só com o que os técnicos trazem e o card, só
// com nome e cargo.
function buscarComplementos(equipe, ativo) {
  const { setExtrasQuadro, setAtendimentos } = useEquipe.getState();

  buscarExtrasQuadro(equipe)
    .then((extras) => ativo() && setExtrasQuadro(extras))
    .catch(() => {});
  buscarAtendimentos(equipe)
    .then((atendimentos) => ativo() && setAtendimentos(atendimentos))
    .catch(() => {});
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
