import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import quadro from '../../Suporte/card/CardQuadro.module.css';
import card from '../../Suporte/card/CardTecnico.module.css';
import Contagem from '../../Suporte/card/Contagem.jsx';
import useFecharComEsc from '../../Suporte/card/useFecharComEsc.js';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { CATEGORIAS } from '../mappers/chamados.js';
import { visaoGeral } from '../mappers/visaoGeral.js';
import { fatiasPorCategoria, fatiasPorDesenvolvedor } from './cores.js';
import GraficoLocais from './GraficoLocais.jsx';
import GraficoPizza from './GraficoPizza.jsx';
import { useRevelar } from './medidas.js';
import PeriodoEmPilulas from './PeriodoEmPilulas.jsx';
import styles from './CardQuadro.module.css';

gsap.registerPlugin(useGSAP, DrawSVGPlugin);

// Por quanto tempo o botão de uma categoria avisa que o card dela ainda não existe.
const AVISO_MS = 1800;

// Números compridos encolhem para caber na largura (ver [data-digitos] no CSS).
const digitos = (valor) => Math.min(String(valor).length, 6);

// Os três traços à mão sob o período, do mais curto ao mais longo.
function Tracos() {
  return (
    <svg className={styles.tracos} viewBox="0 0 110 16" aria-hidden="true" focusable="false">
      <path data-traco d="M39 2.5h32" />
      <path data-traco d="M17 7.5h76" />
      <path data-traco d="M2 12.5h106" />
    </svg>
  );
}

function TotalDeTickets({ total }) {
  return (
    <section className={`${styles.total} ${card.surge}`} style={{ '--ordem': 2 }}>
      <h3 className={styles.chamada}>Total de Tickets</h3>
      <p className={styles.numero} data-digitos={digitos(total)}>
        {total > 0 && <span aria-hidden="true">+</span>}
        <Contagem valor={total} />
      </p>
    </section>
  );
}

/*
 * Um botão por categoria. Cada um vai abrir o card daquela categoria; enquanto
 * esses cards não existem, o botão avisa "Em breve" por um instante. Quando
 * existirem, é em abrirCategoria que eles abrem.
 */
function Desempenho() {
  const raiz = useRef(null);
  const visto = useRevelar(raiz);
  const [avisando, setAvisando] = useState(null);

  useEffect(() => {
    if (!avisando) return undefined;
    const espera = setTimeout(() => setAvisando(null), AVISO_MS);
    return () => clearTimeout(espera);
  }, [avisando]);

  useGSAP(
    () => {
      if (!visto) return;
      gsap.matchMedia().add(MEDIA.motion, () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .from(`.${styles.chamada}`, { autoAlpha: 0, duration: 0.9 })
          .from(`.${styles.categorias} li`, { autoAlpha: 0, y: 14, scale: 0.96, duration: 0.5, stagger: 0.05 }, 0.1);
      });
    },
    { dependencies: [visto], scope: raiz },
  );

  const abrirCategoria = (nome) => setAvisando(nome);

  return (
    <section ref={raiz} className={styles.desempenho} data-esperando={!visto || undefined}>
      <h3 className={styles.chamada}>Desempenho</h3>
      <ul className={styles.categorias}>
        {CATEGORIAS.map((nome) => (
          <li key={nome}>
            <button type="button" data-avisando={avisando === nome || undefined} onClick={() => abrirCategoria(nome)}>
              <span className={styles.nomeCategoria}>{nome}</span>
              <span className={styles.emBreve} aria-hidden="true">
                Em breve
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        {avisando && `O card de ${avisando} ainda está em construção.`}
      </p>
    </section>
  );
}

/*
 * Entrada do painel: o ícone chega girando e os traços se desenham do centro.
 * A cascata das seções é a animação CSS .surge do card (CardTecnico.module.css),
 * que roda no compositor. Animar por aqui (estilos inline a cada quadro), e
 * sobretudo animar o letter-spacing da chamada (relayout do texto grande a cada
 * quadro), fazia o Chrome apresentar um frame só com a cor de fundo sobre a
 * cena WebGL: a tela "piscava" ao abrir (medido por captura de tela).
 */
function animarEntrada(painel) {
  const q = gsap.utils.selector(painel);
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q(`.${quadro.avatar}`), { scale: 0.6, rotation: -14, duration: 0.8, ease: 'back.out(1.8)' }, 0.1)
    .from(q('[data-traco]'), { drawSVG: '50% 50%', duration: 0.7, ease: 'power2.inOut', stagger: 0.1 }, 0.35);
}

function Painel({ fechar }) {
  const raiz = useRef(null);
  const tecnicos = useEquipe((s) => s.tecnicos);
  const chamados = useEquipe((s) => s.chamados);
  const [periodo, setPeriodo] = useState('tudo');
  const hoje = hojeEmBrasilia();

  const visao = useMemo(() => visaoGeral(tecnicos, chamados, periodo, hoje), [tecnicos, chamados, periodo, hoje]);
  const fatiasDev = useMemo(() => fatiasPorDesenvolvedor(visao.porDesenvolvedor), [visao]);
  const fatiasCategoria = useMemo(() => fatiasPorCategoria(visao.porCategoria), [visao]);

  useGSAP(
    () => {
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(raiz.current));
    },
    { scope: raiz },
  );

  return (
    <aside ref={raiz} className={`${card.card} ${quadro.quadro} ${styles.painel}`} aria-label="Quadro da equipe: visão geral">
      <header className={`${card.topo} ${card.surge}`} style={{ '--ordem': 0 }}>
        <div className={`${card.avatar} ${quadro.avatar} ${styles.avatar}`} aria-hidden="true">
          <svg viewBox="0 0 26 26" focusable="false">
            <rect x="3" y="3" width="20" height="14" rx="2" />
            <path d="M7 8h5M7 12h8M9 17l-3 6M17 17l3 6M13 17v4" />
          </svg>
        </div>
        <div className={styles.titulo}>
          <h2>Quadro da equipe</h2>
          <p>Visão geral da equipe técnica</p>
          <p>
            {tecnicos.length} {tecnicos.length === 1 ? 'técnico' : 'técnicos'}
          </p>
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <section className={card.surge} style={{ '--ordem': 1 }}>
        <PeriodoEmPilulas periodo={periodo} onMudar={setPeriodo} />
        <Tracos />
      </section>

      {visao.total !== null && (
        <>
          <TotalDeTickets total={visao.total} />
          <section className={`${styles.pizzas} ${card.surge}`} style={{ '--ordem': 3 }} aria-label="Carga de tickets">
            <GraficoPizza titulo="Carga por Dev" cabecalho="Desenvolvedor" itens={fatiasDev} />
            <GraficoPizza titulo="Carga por Categoria" cabecalho="Categoria" itens={fatiasCategoria} />
          </section>
          <section>
            <h3 className={styles.subtitulo}>Carga por Local</h3>
            <GraficoLocais locais={visao.porLocal} />
          </section>
        </>
      )}

      <Desempenho />

      {visao.ficticio && (
        <footer className={card.rodape}>
          <span>Dados de demonstração</span>
        </footer>
      )}
    </aside>
  );
}

/*
 * Painel "Quadro da equipe" de /desenvolvimento: a visão geral da equipe, que
 * abre pelo quadro da cena. O período vale para o painel todo: o total de
 * tickets e as cargas por desenvolvedor, por categoria e por local (as contas
 * estão em mappers/visaoGeral.js). Os números saem dos chamados dos cards; hoje
 * são de demonstração.
 */
export default function CardQuadro() {
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const fechar = useEquipe((s) => s.fecharPainel);
  useFecharComEsc(aberto, fechar);

  return aberto ? <Painel fechar={fechar} /> : null;
}
