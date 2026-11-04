import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { configurarExtra } from '../Suporte/boneco/useComportamento.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { acompanharComplementos } from '../Suporte/api/acompanharComplementos.js';
import { configurarQuadro } from '../Suporte/quadro/posicao.js';
import { configurarCena, useEquipe } from '../Suporte/store.js';
import { buscarCompilacao } from './api/compilacao.js';
import { acompanharResponsabilidades } from './api/responsabilidades.js';
import CardCompilador from './card/CardCompilador.jsx';
import CardQuadroCompilacao from './card/CardQuadroCompilacao.jsx';
import * as cafe from './cena/cafe.js';
import CenarioCompilacao from './cena/CenarioCompilacao.jsx';
import EstatuaTemis from './cena/EstatuaTemis.jsx';
import { aplicarPlanta } from './cena/lugares.js';
import { CENA_COMPILACAO, QUADRO_COMPILACAO } from './cena/planta.js';
import Xicara from './cena/Xicara.jsx';
import { APARENCIAS_COMPILACAO, buscarEquipe } from './equipe.js';
import { useCompilacao } from './store.js';

/*
 * /compilacao reaproveita a página das equipes (bonecos, card, elenco, câmera).
 * O preparo é feito aqui, uma vez, ao carregar a página e antes de qualquer
 * boneco nascer (a navegação recarrega o site, então nada disso afeta as outras
 * páginas): o tapete grande de /desenvolvimento, a planta da sala (mesas, café e
 * pufes), a estátua de Têmis no lugar do quadro, a aparência da equipe e o
 * comportamento a mais (buscar café, tomar café, descansar no pufe, com a xícara na mão).
 * A equipe (nomes e aparências) está em equipe.js; os números vêm do servidor
 * (/api/compilacao: o sistema Legislação Digital e as planilhas de atualização).
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

// "Ausente" (10 dias úteis sem ação no sistema) vem do servidor; só troca a equipe se mudou.
function marcarAusentes(pessoas) {
  const { tecnicos } = useEquipe.getState();
  const ausente = (id) => pessoas?.[id]?.ausente === true;
  if (tecnicos.every((t) => t.ausente === ausente(t.id))) return;
  useEquipe.setState({ tecnicos: tecnicos.map((t) => ({ ...t, ausente: ausente(t.id) })) });
}

/*
 * Os números completam os cards, o Quadro e a folha. Até chegarem, os cards dizem
 * que estão carregando; se a busca falhar, mostram o erro com "Tentar de novo".
 * Com a página aberta, a busca se repete a cada 15 minutos (o cache do servidor).
 * As responsabilidades trocadas pelo "Alterar" vêm à parte, a cada minuto.
 */
function buscarNumeros() {
  const pararResponsabilidades = acompanharResponsabilidades();
  const parar = acompanharComplementos({
    buscar: buscarCompilacao,
    aoReceber: (resposta) => {
      useCompilacao.getState().receber(resposta);
      marcarAusentes(resposta?.dados?.pessoas);
    },
  });
  return () => {
    parar();
    pararResponsabilidades();
    useCompilacao.getState().limpar();
  };
}

export default function Compilacao() {
  return (
    <PaginaEquipe
      titulo="Compilação"
      subtitulo="Conheça nossa equipe de compilação"
      rotuloElenco="Equipe de compilação"
      buscarEquipe={buscarEquipe}
      aoCarregar={buscarNumeros}
      Estacoes={CenarioCompilacao}
      Card={CardCompilador}
      Quadro={EstatuaTemis}
      PainelQuadro={CardQuadroCompilacao}
      larguraCard="28rem"
    />
  );
}
