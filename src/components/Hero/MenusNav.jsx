import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import ImageReveal from './ImageReveal.jsx';
import MenuItem from './MenuItem.jsx';
import MenusButton from './MenusButton.jsx';
import ReunioesModal from './ReunioesModal.jsx';
import { menus } from './menus.js';
import { buildTour, hideSoonLabels, rollSoon } from './menusAnimations.js';
import styles from './MenusNav.module.css';

// Itens sem página própria abrem um destes modais (chave = `modal` em menus.js).
const MODALS = {
  reunioes: ReunioesModal,
};

// No toque não há hover: o "EM BREVE" aparece no toque e some sozinho.
const SOON_TAP_HOLD = 1.6;

const isReduced = () => matches(MEDIA.reducedMotion);

// Foco vindo do teclado? Safari < 15.4 não conhece :focus-visible: aí vale qualquer foco.
const isKeyboardFocus = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return element === document.activeElement;
  }
};

export default function MenusNav() {
  const root = useRef(null);
  const reveal = useRef(null);
  const tour = useRef(null);
  const soonTimer = useRef(null);
  const [touring, setTouring] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  const Modal = openModal ? MODALS[openModal] : null;

  const { contextSafe } = useGSAP(() => hideSoonLabels(root.current), { scope: root });

  useEffect(() => {
    // Pré-carrega para a imagem já estar pronta no primeiro hover.
    if (!matches(MEDIA.hover)) return;
    menus.forEach(({ items }) =>
      items.forEach(({ image }) => {
        if (image) new Image().src = image;
      }),
    );
  }, []);

  useEffect(() => {
    // Ao voltar de outra página pelo histórico (bfcache), a home volta congelada
    // com a imagem do clique à mostra, sem o mouseleave: esconde se ninguém está em cima.
    const restore = (event) => {
      if (!event.persisted || !root.current) return;
      // No toque o :hover fica grudado no último item tocado: lá ele não conta.
      const hovered =
        matches(MEDIA.hover) &&
        [...root.current.querySelectorAll('[data-menu="item"]')].some((item) =>
          item.matches(':hover'),
        );
      if (!hovered) reveal.current?.hide();
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  const playTour = contextSafe(() => {
    if (tour.current?.isActive()) return;
    tour.current?.kill();
    reveal.current?.hide();
    tour.current = buildTour(root.current, {
      reduced: isReduced(),
      onComplete: () => setTouring(false),
    });
    setTouring(true);
    tour.current.play();
  });

  const rollTo = contextSafe((item, show) => {
    soonTimer.current?.kill();
    rollSoon(item, show, { reduced: isReduced() });
  });

  const tapSoon = contextSafe((item) => {
    rollTo(item, true);
    soonTimer.current = gsap.delayedCall(SOON_TAP_HOLD, () =>
      rollSoon(item, false, { reduced: isReduced() }),
    );
  });

  const soonHandlers = {
    onMouseEnter: (event) => matches(MEDIA.hover) && rollTo(event.currentTarget, true),
    onMouseLeave: (event) => rollTo(event.currentTarget, false),
    onFocus: (event) => isKeyboardFocus(event.currentTarget) && rollTo(event.currentTarget, true),
    onBlur: (event) => rollTo(event.currentTarget, false),
    onClick: (event) => !matches(MEDIA.hover) && tapSoon(event.currentTarget),
  };

  // Hover: um quadro com a imagem do item acompanha o cursor (só com mouse;
  // no toque, o mouseenter emulado deixaria a imagem presa depois do toque).
  const itemHandlers = (image) => ({
    onMouseEnter: (event) => {
      if (matches(MEDIA.hover)) reveal.current?.show(image, event.clientX, event.clientY);
    },
    onMouseMove: (event) => {
      if (matches(MEDIA.hover)) reveal.current?.move(event.clientX, event.clientY);
    },
    onMouseLeave: () => {
      if (matches(MEDIA.hover)) reveal.current?.hide();
    },
  });

  const handleOpenModal = (modal) => {
    reveal.current?.hide();
    setOpenModal(modal);
  };

  const handleCloseModal = () => setOpenModal(null);

  return (
    <nav ref={root} className={styles.nav} aria-label="Menus">
      <MenusButton onPlay={playTour} playing={touring} />

      {/* Durante a apresentação o hover não disputa os mesmos elementos. */}
      <div className={styles.columns} data-touring={touring || undefined}>
        {menus.map(({ title, items }, index) => (
          <div
            key={title}
            className={styles.column}
            role="group"
            aria-labelledby={`menu-title-${index}`}
            data-menu="column"
          >
            {index > 0 && (
              <span className={styles.divider} data-intro="menu-divider" aria-hidden="true" />
            )}
            <span className={styles.beam} data-menu="beam" aria-hidden="true" />

            <h2
              id={`menu-title-${index}`}
              className={styles.title}
              data-menu="title"
              data-intro="menu-title"
            >
              {title}
            </h2>

            <ul className={styles.list}>
              {items.map((item) => (
                <li key={item.label}>
                  <MenuItem
                    item={item}
                    handlers={itemHandlers(item.image)}
                    soonHandlers={soonHandlers}
                    onOpenModal={handleOpenModal}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ImageReveal ref={reveal} />
      {Modal && <Modal onClose={handleCloseModal} />}
    </nav>
  );
}
