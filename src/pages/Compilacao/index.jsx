import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { configurarExtra } from '../Suporte/boneco/useComportamento.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { configurarQuadro } from '../Suporte/quadro/posicao.js';
import { configurarCena } from '../Suporte/store.js';
import CardCompilador from './card/CardCompilador.jsx';
import CardQuadroCompilacao from './card/CardQuadroCompilacao.jsx';
import * as cafe from './cena/cafe.js';
import CenarioCompilacao from './cena/CenarioCompilacao.jsx';
import EstatuaTemis from './cena/EstatuaTemis.jsx';
import { aplicarPlanta } from './cena/lugares.js';
import { CENA_COMPILACAO, QUADRO_COMPILACAO } from './cena/planta.js';
import Xicara from './cena/Xicara.jsx';
import { APARENCIAS_COMPILACAO, buscarEquipe } from './equipe.js';

/*
 * /compilacao reaproveita a página das equipes (bonecos, card, elenco, câmera).
 * O preparo é feito aqui, uma vez, ao carregar a página e antes de qualquer
 * boneco nascer (a navegação recarrega o site, então nada disso afeta as outras
 * páginas): o tapete grande de /desenvolvimento, a planta da sala (mesas, café e
 * pufes), a estátua de Têmis no lugar do quadro, a aparência da equipe e o
 * comportamento a mais (buscar café, tomar café, descansar no pufe, com a xícara na mão).
 * A equipe e os números ainda não vêm do Milldesk: estão escritos à mão
 * (equipe.js e dados.js).
 */
configurarCena(CENA_COMPILACAO);
aplicarPlanta(false);
configurarQuadro(QUADRO_COMPILACAO);
registrarAparencias(APARENCIAS_COMPILACAO);
configurarExtra({
  criar: cafe.criar,
  decidir: cafe.decidir,
  aoSentar: cafe.aoSentar,
  aoLevantar: cafe.aoLevantar,
  atualizar: cafe.atualizar,
  pose: cafe.pose,
  NaMao: Xicara,
});

export default function Compilacao() {
  return (
    <PaginaEquipe
      titulo="Compilação"
      subtitulo="Conheça nossa equipe de compilação"
      rotuloElenco="Equipe de compilação"
      buscarEquipe={buscarEquipe}
      Estacoes={CenarioCompilacao}
      Card={CardCompilador}
      Quadro={EstatuaTemis}
      PainelQuadro={CardQuadroCompilacao}
      larguraCard="28rem"
    />
  );
}
