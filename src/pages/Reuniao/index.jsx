import { useEffect, useLayoutEffect, useState } from 'react';
import { CHAVE_STORAGE, carregarReunioes } from '../../components/Hero/reunioes/reunioesRepo.js';
import { APARENCIAS_DEV } from '../Desenvolvimento/aparencias.js';
import NotFound from '../NotFound/index.jsx';
import { registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { configurarRitmo } from '../Suporte/boneco/useComportamento.js';
import PaginaEquipe from '../Suporte/PaginaEquipe.jsx';
import { removerQuadro } from '../Suporte/quadro/posicao.js';
import { configurarCena, useEquipe } from '../Suporte/store.js';
import CenarioReuniao, { LuzesReuniao } from './cena/CenarioReuniao.jsx';
import { CENA_REUNIAO, RITMO_REUNIAO } from './cena/config.js';
import './cena/lugares.js';
import QuadroReuniao from './cena/QuadroReuniao.jsx';
import { bonecosDa, chaveDosMembros } from './membros.js';
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

const buscarReuniao = (id) => carregarReunioes().find((reuniao) => reuniao.id === id) ?? null;

// Os bonecos de quem está na reunião aberta.
const buscarMembros = async () => bonecosDa(useReuniao.getState().reuniao);

/*
 * A reunião salva neste navegador. Editada em outra aba (a home, com a tela de
 * Reuniões aberta), o evento storage traz a versão nova: membros entram ou
 * saem, o título e o horário mudam na hora.
 */
function useReuniaoSalva(id) {
  const [reuniao, setReuniao] = useState(() => buscarReuniao(id));

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

  // Antes do primeiro frame: o quadro e o céu já nascem com a reunião.
  useLayoutEffect(() => {
    useReuniao.getState().setReuniao(reuniao);
  }, [reuniao]);

  // Mudou quem está na reunião: os bonecos novos entram e os que saíram somem.
  useEffect(() => {
    if (reuniao) useEquipe.getState().setTecnicos(bonecosDa(reuniao));
    // Só a lista de membros importa aqui (não o título nem o horário).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membros]);

  if (!reuniao) return <NotFound />;

  return (
    <PaginaEquipe
      titulo={reuniao.titulo}
      subtitulo={subtituloDa(reuniao)}
      rotuloElenco="Membros da reunião"
      buscarEquipe={buscarMembros}
      Estacoes={null}
      Quadro={QuadroReuniao}
      PainelQuadro={null}
      cena={CENA}
    />
  );
}
