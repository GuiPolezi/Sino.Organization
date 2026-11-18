import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import { focarCard, negar, SOMBRA_REPOUSO } from './cardsAnimations.js';
import MenuCard from './MenuCard.jsx';
import ReunioesModal from './ReunioesModal.jsx';
import { isSoon, menus } from './menus.js';
import styles from './MenuCards.module.css';

// Itens sem página própria abrem um destes modais (chave = `modal` em menus.js).
const MODALS = {
  reunioes: ReunioesModal,
};

// Tempo (s) que o foco espera, ao sair de um card, antes de soltar a grade:
// passar de um card ao vizinho pelo vão não faz tudo voltar e crescer de novo.
const SOLTAR_DEPOIS = 0.12;

const isReduced = () => matches(MEDIA.reducedMotion);

// Foco vindo do teclado? Safari < 15.4 não conhece :focus-visible: aí vale qualquer foco.
const isKeyboardFocus = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return element === document.activeElement;
  }
};

// Foco de teclado agora? Sem :focus-visible (Safari antigo) conta como não.
const temFocoVisivel = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
};

/** Os 6 cards da home, em grade, com o hover em GSAP e o modal de Reuniões. */
export default function MenuCards() {
  const root = useRef(null);
  const soltar = useRef(null);
  const [openModal, setOpenModal] = useState(null);
  const Modal = openModal ? MODALS[openModal] : null;

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(root.current.querySelectorAll('[data-card="arte"]'), { filter: SOMBRA_REPOUSO });
    },
    { scope: root },
  );

  const cards = () => [...root.current.querySelectorAll('[data-card="card"]')];

  const focar = contextSafe((card) => {
    soltar.current?.kill();
    focarCard(cards(), card, { reduzido: isReduced() });
  });

  const soltarDepois = contextSafe(() => {
    soltar.current?.kill();
    soltar.current = gsap.delayedCall(SOLTAR_DEPOIS, () => focarCard(cards(), null, { reduzido: isReduced() }));
  });

  // O reflexo do vidro acompanha o ponteiro (só no card em foco).
  const moverReflexo = contextSafe((event) => {
    const card = event.currentTarget;
    const caixa = card.getBoundingClientRect();
    gsap.to(card, {
      '--reflexo-x': `${((event.clientX - caixa.left) / caixa.width) * 100}%`,
      '--reflexo-y': `${((event.clientY - caixa.top) / caixa.height) * 100}%`,
      duration: 0.4,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  });

  const tremer = contextSafe((card) => negar(card, { reduzido: isReduced() }));

  // Ao voltar de outra página pelo histórico (bfcache), a home volta congelada
  // com o card do clique em foco, sem o mouseleave: solta se ninguém está em cima.
  useEffect(() => {
    const restaurar = (event) => {
      if (!event.persisted || !root.current) return;
      const emCima = matches(MEDIA.hover) && cards().some((card) => card.matches(':hover'));
      if (!emCima) focarCard(cards(), null, { reduzido: true });
    };
    window.addEventListener('pageshow', restaurar);
    return () => window.removeEventListener('pageshow', restaurar);
  }, []);

  // Só com mouse: no toque, o mouseenter emulado deixaria o card preso em foco.
  const handlersDe = (item) => {
    if (isSoon(item)) {
      return {
        onClick: (event) => tremer(event.currentTarget),
        onKeyDown: (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          // Espaço num elemento que não é botão rolaria a página.
          event.preventDefault();
          tremer(event.currentTarget);
        },
      };
    }
    return {
      onMouseEnter: (event) => matches(MEDIA.hover) && focar(event.currentTarget),
      onMouseMove: (event) => matches(MEDIA.hover) && moverReflexo(event),
      // O mouse saindo não tira o foco de quem está com o foco do teclado.
      onMouseLeave: (event) => matches(MEDIA.hover) && !temFocoVisivel(event.currentTarget) && soltarDepois(),
      onFocus: (event) => isKeyboardFocus(event.currentTarget) && focar(event.currentTarget),
      onBlur: () => soltarDepois(),
    };
  };

  const abrirModal = (modal) => {
    focarCard(cards(), null, { reduzido: true });
    setOpenModal(modal);
  };

  return (
    <nav ref={root} className={styles.nav} aria-label="Menus">
      <ul className={styles.grade}>
        {menus.map((item) => (
          <li key={item.label} className={styles.item} data-intro="card">
            <MenuCard item={item} handlers={handlersDe(item)} onOpenModal={abrirModal} />
          </li>
        ))}
      </ul>

      {Modal && <Modal onClose={() => setOpenModal(null)} />}
    </nav>
  );
}
