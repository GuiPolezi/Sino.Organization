import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { definirEstacoes } from '../Suporte/boneco/estacoes.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { configurarQuadro } from '../Suporte/quadro/posicao.js';
import { configurarCena, useEquipe } from '../Suporte/store.js';
import { buscarChamados } from './api/chamados.js';
import { buscarEquipe } from './api/equipe.js';
import { APARENCIAS_DEV } from './aparencias.js';
import CardDesenvolvedor from './card/CardDesenvolvedor.jsx';
import CardQuadro from './card/CardQuadro.jsx';
import EstacoesDesenvolvimento from './cena/EstacoesDesenvolvimento.jsx';
import { CENA_DEV, CORREDOR_DEV, basesDasMesas } from './cena/estacoes.js';
import QuadroDesenvolvimento from './quadro/QuadroDesenvolvimento.jsx';

/*
 * A página reaproveita a cena da página de suporte, que guarda o cenário em
 * módulos. Por isso o preparo é feito aqui, uma vez, ao carregar a página e
 * antes de qualquer boneco nascer: um tapete maior, para a equipe grande, com
 * a câmera mais afastada, as mesas de trabalho no lugar do bloco
 * do suporte (cena/estacoes.js; o quadro da equipe fica, com um corredor mais
 * curto, que não cai sobre as mesas), e a aparência dos desenvolvedores. Cada
 * página é carregada à parte (a navegação recarrega o site), então isso não
 * afeta /suporte.
 */
configurarCena(CENA_DEV);
definirEstacoes(basesDasMesas(false));
configurarQuadro({ corredorPaisagem: CORREDOR_DEV });
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
      Estacoes={EstacoesDesenvolvimento}
      Card={CardDesenvolvedor}
      Quadro={QuadroDesenvolvimento}
      PainelQuadro={CardQuadro}
      larguraCard="28rem"
    />
  );
}
