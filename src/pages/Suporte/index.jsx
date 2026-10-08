import { buscarAtendimentos } from './api/atendimentosTecnico.js';
import { buscarEquipe } from './api/equipeTecnica.js';
import { buscarExtrasQuadro } from './api/resumoEquipe.js';
import PaginaEquipe from './PaginaEquipe.jsx';
import { useEquipe } from './store.js';

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
