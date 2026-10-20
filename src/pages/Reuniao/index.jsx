import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { STATUS, statusDe } from '../../components/Hero/reunioes/periodos.js';
import { CHAVE_STORAGE, carregarReunioes } from '../../components/Hero/reunioes/reunioesRepo.js';
import { useAgora } from '../../components/Hero/reunioes/useAgora.js';
import { APARENCIAS_DEV } from '../Desenvolvimento/aparencias.js';
import NotFound from '../NotFound/index.jsx';
import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { configurarRitmo } from '../Suporte/boneco/useComportamento.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { removerQuadro } from '../Suporte/quadro/posicao.js';
import { configurarCena, useEquipe } from '../Suporte/store.js';
import { configurarLugares } from './cena/lugares.js';
import CenarioReuniao, { LuzesReuniao } from './cena/CenarioReuniao.jsx';
import { CENA_REUNIAO, RITMO_REUNIAO } from './cena/config.js';
import QuadroReuniao from './cena/QuadroReuniao.jsx';
import { bonecosDa, chaveDosMembros } from './membros.js';
import styles from './Reuniao.module.css';
import { subtituloDa, useReuniao } from './store.js';

/*
 * Página de uma reunião (/reunioes/<id>): a sala de vidro com os membros dela.
 * Reaproveita a página das equipes (bonecos, card, elenco e câmera); o cenário,
 * as luzes e o quadro são os da reunião. O preparo é feito aqui, uma vez, antes
 * de qualquer boneco nascer (a navegação recarrega o site, então isso não
 * afeta /suporte nem /desenvolvimento): a área da sala, o ritmo de reunião (quase
 * todos sentam e ficam), sem o quadro da equipe no caminho, e a aparência dos
 * desenvolvedores, que também podem ser membros.
 */
configurarCena(CENA_REUNIAO);
configurarRitmo(RITMO_REUNIAO);
removerQuadro();
registrarAparencias(APARENCIAS_DEV);

// Estável (fora do componente): a cena é memoizada. A paisagem precisa do stencil.
const CENA = { Cenario: CenarioReuniao, Luzes: LuzesReuniao, gl: { stencil: true } };

// O caminho chega em minúsculas (App.jsx): o id salvo é comparado do mesmo jeito.
const buscarReuniao = (id) => carregarReunioes().find((reuniao) => reuniao.id.toLowerCase() === id) ?? null;

// Os bonecos de quem está na reunião. Os lugares são ativados antes de eles nascerem:
// cada boneco sorteia onde aparece longe das cadeiras e pufes que já estão lá.
function bonecosComLugares(reuniao) {
  const bonecos = bonecosDa(reuniao);
  configurarLugares(bonecos.length);
  return bonecos;
}

const buscarMembros = async () => bonecosComLugares(useReuniao.getState().reuniao);

/*
 * A reunião salva neste navegador. Editada em outra aba (a home, com a tela de
 * Reuniões aberta), o evento storage traz a versão nova: membros entram ou
 * saem, o título e o horário mudam na hora.
 */
function useReuniaoSalva(id) {
  // Já na primeira leitura vai para a store: o céu nasce no período certo, sem pintar o de dia antes.
  const [reuniao, setReuniao] = useState(() => {
    const salva = buscarReuniao(id);
    useReuniao.getState().setReuniao(salva);
    return salva;
  });

  useEffect(() => {
    const aoMudar = (evento) => {
      if (evento.key === null || evento.key === CHAVE_STORAGE) setReuniao(buscarReuniao(id));
    };
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, [id]);

  return reuniao;
}

/** @param {{ id: string }} props */
export default function Reuniao({ id }) {
  const reuniao = useReuniaoSalva(id);
  const membros = chaveDosMembros(reuniao);
  // Hoje, em breve ou encerrada; muda sozinho no início, no fim e à meia-noite.
  const lista = useMemo(() => (reuniao ? [reuniao] : []), [reuniao]);
  const agora = useAgora(lista);

  // Antes do primeiro frame: o quadro e o céu já nascem com a reunião.
  useLayoutEffect(() => {
    useReuniao.getState().setReuniao(reuniao);
  }, [reuniao]);

  // Mudou quem está na reunião: os bonecos novos entram e os que saíram somem
  // (e o card de quem saiu fecha, para não reabrir sozinho se ele voltar).
  useEffect(() => {
    if (!reuniao) return;
    const bonecos = bonecosComLugares(reuniao);
    const { selecionado, selecionar, setTecnicos } = useEquipe.getState();
    if (selecionado && !bonecos.some(({ id: outro }) => outro === selecionado)) selecionar(null);
    setTecnicos(bonecos);
    // Só a lista de membros importa aqui (não o título nem o horário).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membros]);

  if (!reuniao) return <NotFound />;

  const status = STATUS[statusDe(reuniao, agora)] ?? STATUS.encerrada;

  return (
    <PaginaEquipe
      titulo={reuniao.titulo}
      tituloCompacto
      subtitulo={subtituloDa(reuniao)}
      selo={
        <p className={`${styles.selo} ${styles[status.id]}`}>
          <span className="sr-only">Status: </span>
          {status.rotulo}
        </p>
      }
      rotuloElenco="Membros da reunião"
      buscarEquipe={buscarMembros}
      Estacoes={null}
      Quadro={QuadroReuniao}
      PainelQuadro={null}
      cena={CENA}
    />
  );
}
