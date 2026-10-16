import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { tirarEstacoes } from '../Suporte/boneco/estacoes.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { useEquipe } from '../Suporte/store.js';
import { buscarChamados } from './api/chamados.js';
import { buscarEquipe } from './api/equipe.js';
import { APARENCIAS_DEV } from './aparencias.js';
import CardDesenvolvedor from './card/CardDesenvolvedor.jsx';
import CardQuadro from './card/CardQuadro.jsx';
import QuadroDesenvolvimento from './quadro/QuadroDesenvolvimento.jsx';

/*
 * A página reaproveita a cena da página de suporte, que guarda o cenário em
 * módulos. Por isso o preparo é feito aqui, uma vez, ao carregar a página e
 * antes de qualquer boneco nascer: sem mesas no caminho (o quadro da equipe
 * fica), e com a aparência dos desenvolvedores. Cada página é carregada à parte
 * (a navegação recarrega o site), então isso não afeta /suporte.
 */
tirarEstacoes();
registrarAparencias(APARENCIAS_DEV);

// Os chamados completam o card e o quadro. Se a busca falhar, o card fica só com
// nome e cargo, e o quadro, só com o tamanho da equipe.
function buscarComplementos(equipe, ativo) {
  buscarChamados(equipe)
    .then((chamados) => ativo() && useEquipe.getState().setChamados(chamados))
    .catch(() => {});
}

export default function Desenvolvimento() {
  return (
    <PaginaEquipe
      titulo="Desenvolvimento"
      subtitulo="Conheça nossa equipe de desenvolvimento"
      rotuloElenco="Desenvolvedores"
      buscarEquipe={buscarEquipe}
      aoCarregar={buscarComplementos}
      estacoes={false}
      Card={CardDesenvolvedor}
      Quadro={QuadroDesenvolvimento}
      PainelQuadro={CardQuadro}
      larguraCard="28rem"
    />
  );
}
