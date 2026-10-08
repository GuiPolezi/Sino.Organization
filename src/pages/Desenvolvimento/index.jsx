import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { esvaziarCenario } from '../Suporte/boneco/estacoes.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { buscarEquipe } from './api/equipe.js';
import { APARENCIAS_DEV } from './aparencias.js';

/*
 * A página reaproveita a cena da página de suporte, que guarda o cenário em
 * módulos. Por isso o preparo é feito aqui, uma vez, ao carregar a página e
 * antes de qualquer boneco nascer: sem mesas nem quadro no caminho, e com a
 * aparência dos desenvolvedores. Cada página é carregada à parte (a navegação
 * recarrega o site), então isso não afeta /suporte.
 */
esvaziarCenario();
registrarAparencias(APARENCIAS_DEV);

export default function Desenvolvimento() {
  return (
    <PaginaEquipe
      titulo="Desenvolvimento"
      subtitulo="Conheça nossa equipe de desenvolvimento"
      rotuloElenco="Desenvolvedores"
      buscarEquipe={buscarEquipe}
      simples
    />
  );
}
