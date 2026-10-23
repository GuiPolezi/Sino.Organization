import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMemo, useRef, useState } from 'react';
import { MEDIA } from '../../../utils/media.js';
import quadro from '../../Suporte/card/CardQuadro.module.css';
import card from '../../Suporte/card/CardTecnico.module.css';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { hojeEmBrasilia } from '../../Suporte/mappers/atendimentos.js';
import { useEquipe } from '../../Suporte/store.js';
import { solicitacoes } from '../api/chamados.js';
import { desempenhoDaCategoria } from '../mappers/categoria.js';
import PeriodoEmPilulas from './PeriodoEmPilulas.jsx';
import Ranking from './Ranking.jsx';
import Retrato from './Retrato.jsx';
import geral from './CardQuadro.module.css';
import styles from './CardCategoria.module.css';

gsap.registerPlugin(useGSAP);

const primeiroNome = (nome) => nome.split(' ')[0];
// Números compridos encolhem (ver [data-digitos] no CSS).
const digitos = (valor) => Math.min(String(valor).length, 6);

// Quem trabalha na categoria; o clique abre o card da pessoa.
function Membros({ membros }) {
  const selecionar = useEquipe((s) => s.selecionar);

  return (
    <section className={card.surge} style={{ '--ordem': 1 }}>
      <div className={styles.rotulos}>
        <h3>Membros</h3>
        <span>
          {membros.length}
          <span className="sr-only"> {membros.length === 1 ? 'pessoa' : 'pessoas'}</span>
        </span>
      </div>
      {membros.length > 0 ? (
        <ul className={styles.membros}>
          {membros.map((tecnico) => (
            <li key={tecnico.id}>
              <button type="button" onClick={() => selecionar(tecnico.id)} aria-label={`Abrir o card de ${tecnico.nome}`}>
                <Retrato tecnico={tecnico} className={styles.rosto} />
                <strong>{primeiroNome(tecnico.nome)}</strong>
                {tecnico.funcao && <small>{tecnico.funcao}</small>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.vazio}>Ninguém da equipe tem tickets desta categoria.</p>
      )}
    </section>
  );
}

function Frequencia({ categoria, aCada }) {
  if (aCada === null) return <>Nenhuma solicitação de {categoria} neste período.</>;
  if (aCada.x === 1) return <>Neste período, todas as solicitações foram de {categoria}.</>;
  return (
    <>
      Em média, a cada <strong>{aCada.x}</strong> novas solicitações, pelo menos <strong>{aCada.y}</strong>{' '}
      {aCada.y === 1 ? 'é' : 'são'} de {categoria}
    </>
  );
}

/*
 * Tickets criados da categoria no período e, ao lado, ligado por um tracejado,
 * com que frequência ela aparece entre as solicitações (mappers/categoria.js).
 */
function TicketsCriados({ categoria, criados, aCada }) {
  return (
    <section className={`${styles.criados} ${card.surge}`} style={{ '--ordem': 3 }}>
      <h3>Tickets Criados</h3>
      <div className={styles.linhaCriados}>
        <p className={styles.numero} data-digitos={digitos(criados)}>
          {criados > 0 && <span aria-hidden="true">+</span>}
          <Contagem valor={criados} />
        </p>
        <svg className={styles.tracejado} viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d="M2 6H90" />
        </svg>
        <span className={styles.ponto} aria-hidden="true" />
        <p className={styles.frase}>
          <Frequencia categoria={categoria} aCada={aCada} />
        </p>
      </div>
    </section>
  );
}

/*
 * Entrada: o ícone chega girando, como no painel do quadro, e o tracejado se
 * estende até o ponto. São três elementos pequenos; o resto é a cascata CSS
 * .surge (ver CardQuadro.jsx sobre o piscar da tela).
 */
function animarEntrada(painel) {
  const q = gsap.utils.selector(painel);
  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .from(q(`.${quadro.avatar}`), { scale: 0.6, rotation: -14, duration: 0.8, ease: 'back.out(1.8)' }, 0.1)
    .from(q(`.${styles.tracejado}`), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.9, ease: 'power2.inOut' }, 0.45)
    .from(q(`.${styles.ponto}`), { scale: 0, duration: 0.5, ease: 'back.out(2.5)' }, 1.1);
}

/**
 * Card de uma categoria, aberto pelos botões do Desempenho no painel do quadro:
 * quem da equipe trabalha nela, os tickets criados no período e o ranking dos
 * desenvolvedores em três slides. O período vale para o card todo.
 *
 * @param {object} props
 * @param {string} props.categoria
 * @param {() => void} props.fechar
 */
export default function CardCategoria({ categoria, fechar }) {
  const raiz = useRef(null);
  const tecnicos = useEquipe((s) => s.tecnicos);
  const chamados = useEquipe((s) => s.chamados);
  const [periodo, setPeriodo] = useState('tudo');
  const hoje = hojeEmBrasilia();

  const desempenho = useMemo(
    () => desempenhoDaCategoria(tecnicos, chamados, categoria, periodo, hoje, solicitacoes()),
    [tecnicos, chamados, categoria, periodo, hoje],
  );

  useGSAP(
    () => {
      gsap.matchMedia().add(MEDIA.motion, () => animarEntrada(raiz.current));
    },
    { scope: raiz },
  );

  return (
    <aside
      ref={raiz}
      className={`${card.card} ${quadro.quadro} ${geral.painel} ${styles.card}`}
      aria-label={`Desempenho dos desenvolvedores em ${categoria}`}
    >
      <header className={`${card.topo} ${card.surge}`} style={{ '--ordem': 0 }}>
        <div className={`${card.avatar} ${quadro.avatar}`} aria-hidden="true">
          <svg viewBox="0 0 26 26" focusable="false">
            <path d="M4 22h18M7 18v-3M11.5 18v-6M16 18v-8M20.5 18V8M5 12l5-4 4 2 7-6M17 4h4v4" />
          </svg>
        </div>
        <div className={geral.titulo}>
          <h2>{categoria}</h2>
          <p>Desempenho dos Desenvolvedores</p>
        </div>
        <button type="button" className={card.fechar} aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <Membros membros={desempenho.membros} />

      <section className={card.surge} style={{ '--ordem': 2 }}>
        <PeriodoEmPilulas periodo={periodo} onMudar={setPeriodo} emLinha />
      </section>

      <TicketsCriados categoria={categoria} criados={desempenho.criados} aCada={desempenho.aCada} />

      {desempenho.membros.length > 0 && (
        <Ranking rankings={desempenho.rankings} membros={desempenho.membros} className={card.surge} style={{ '--ordem': 4 }} />
      )}

      {desempenho.ficticio && (
        <footer className={card.rodape}>
          <span>Dados de demonstração</span>
        </footer>
      )}
    </aside>
  );
}
