import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { STATUS, statusDe } from '../../components/Hero/reunioes/periodos.js';
import { carregarEquipes } from '../../components/Hero/reunioes/membrosEquipe.js';
import { migrarReunioesLocais, obterReuniao } from '../../components/Hero/reunioes/reunioesRepo.js';
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

// De quanto em quanto tempo a página relê a reunião no servidor (além de ao voltar para a aba).
const RELER_MS = 30_000;

// Os bonecos de quem está na reunião. Os lugares são ativados antes de eles nascerem:
// cada boneco sorteia onde aparece longe das cadeiras e pufes que já estão lá.
function bonecosComLugares(reuniao) {
  const bonecos = bonecosDa(reuniao);
  configurarLugares(bonecos.length);
  return bonecos;
}

const buscarMembros = async () => bonecosComLugares(useReuniao.getState().reuniao);

/*
 * A reunião, buscada no servidor. Relê a cada RELER_MS e quando a aba volta a
 * ficar visível: se alguém editar a reunião (em qualquer navegador), membros
 * entram ou saem e o título e o horário mudam sem recarregar a página.
 */
function useReuniaoRemota(id) {
  const [estado, setEstado] = useState({ situacao: 'carregando' });

  useEffect(() => {
    let ativo = true;
    let atual = null;
    // Na primeira leitura, espera também as equipes: os bonecos de quem é da
    // equipe (com a aparência dela) são montados uma vez, quando a reunião chega.
    const ler = (primeira) =>
      Promise.all([obterReuniao(id), primeira && carregarEquipes().catch(() => {})]).then(
        ([reuniao]) => {
          if (!ativo || (!primeira && JSON.stringify(reuniao) === JSON.stringify(atual))) return;
          atual = reuniao;
          setEstado({ situacao: 'pronto', reuniao });
        },
        // Numa releitura que falha, fica o que já está na tela.
        (erro) => ativo && primeira && setEstado({ situacao: 'erro', mensagem: erro.message }),
      );

    // Um link antigo pode apontar para uma reunião que ainda está só neste navegador.
    migrarReunioesLocais()
      .catch(() => {})
      .then(() => ler(true));
    const intervalo = setInterval(() => document.visibilityState === 'visible' && ler(false), RELER_MS);
    const aoVoltar = () => document.visibilityState === 'visible' && ler(false);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [id]);

  return estado;
}

/** @param {{ id: string }} props */
export default function Reuniao({ id }) {
  const estado = useReuniaoRemota(id);

  if (estado.situacao === 'carregando') {
    return (
      <main className={styles.espera} role="status">
        Carregando a reunião…
      </main>
    );
  }
  if (estado.situacao === 'erro') {
    return (
      <main className={styles.espera} role="alert">
        <p>Não foi possível carregar a reunião. {estado.mensagem}</p>
        <a href="/">← Voltar para o início</a>
      </main>
    );
  }
  if (!estado.reuniao) return <NotFound />;
  return <SalaReuniao reuniao={estado.reuniao} />;
}

/** @param {{ reuniao: object }} props */
function SalaReuniao({ reuniao }) {
  // Já na primeira renderização vai para a store: o céu nasce no período certo, sem pintar o de dia antes.
  useState(() => useReuniao.getState().setReuniao(reuniao));
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
