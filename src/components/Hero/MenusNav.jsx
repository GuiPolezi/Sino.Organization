import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import MenuItem from './MenuItem.jsx';
import MenusButton from './MenusButton.jsx';
import ReunioesModal from './ReunioesModal.jsx';
import { menus } from './menus.js';
import {
  buildTour,
  closeBanner,
  hideSoonLabels,
  openBanner,
  rollSoon,
} from './menusAnimations.js';
import styles from './MenusNav.module.css';

// Itens sem página própria abrem um destes modais (chave = `modal` em menus.js).
const MODALS = {
  reunioes: ReunioesModal,
};

// No toque não há hover (nem banner): o "EM BREVE" aparece no toque e some sozinho.
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
  const tour = useRef(null);
  const soonTimer = useRef(null);
  // Botão que abriu o modal com mouse/toque: ao fechar, o <dialog> devolve o foco a ele.
  const pointerOpener = useRef(null);
  const [touring, setTouring] = useState(false);
  const [openModal, setOpenModal] = useState(null);
  const Modal = openModal ? MODALS[openModal] : null;

  const { contextSafe } = useGSAP(() => hideSoonLabels(root.current), { scope: root });

  useEffect(() => {
    // Pré-carrega para a foto do banner já estar pronta no primeiro hover.
    if (!matches(MEDIA.hover)) return;
    menus.forEach(({ items }) =>
      items.forEach(({ banner }) => {
        if (banner) new Image().src = banner;
      }),
    );
  }, []);

  useEffect(() => {
    // Ao voltar de outra página pelo histórico (bfcache), a home volta congelada
    // com o banner do clique aberto, sem o mouseleave: fecha em quem não está em uso.
    const restore = (event) => {
      if (!event.persisted || !root.current) return;
      // No toque o :hover fica grudado no último item tocado: lá ele não conta.
      const canHover = matches(MEDIA.hover);
      root.current.querySelectorAll('[data-menu="item"]').forEach((item) => {
        const isHovered = canHover && item.matches(':hover');
        if (!isHovered && !isKeyboardFocus(item)) closeBanner(item, { reduced: true });
      });
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  const playTour = contextSafe(() => {
    if (tour.current?.isActive()) return;
    tour.current?.kill();
    // O tour anima o mesmo nome que o banner desloca: fecha qualquer banner aberto.
    root.current
      .querySelectorAll('[data-menu="item"]')
      .forEach((item) => closeBanner(item, { reduced: true }));
    tour.current = buildTour(root.current, {
      reduced: isReduced(),
      onComplete: () => setTouring(false),
    });
    setTouring(true);
    tour.current.play();
  });

  const emphasize = contextSafe((item) => openBanner(item, { reduced: isReduced() }));
  const relax = contextSafe((item) => closeBanner(item, { reduced: isReduced() }));

  const tapSoon = contextSafe((item) => {
    soonTimer.current?.kill();
    rollSoon(item, true, { reduced: isReduced() });
    soonTimer.current = gsap.delayedCall(SOON_TAP_HOLD, () =>
      rollSoon(item, false, { reduced: isReduced() }),
    );
  });

  const itemHandlers = {
    onMouseEnter: (event) => {
      // No toque, o mouseenter emulado deixaria o banner aberto depois do toque.
      if (matches(MEDIA.hover)) emphasize(event.currentTarget);
    },
    onMouseLeave: (event) => relax(event.currentTarget),
    // Foco por teclado abre o banner; o foco do clique (ou o que o <dialog> devolve
    // ao fechar) não, senão ele fica aberto sem o mouse em cima.
    onFocus: (event) => isKeyboardFocus(event.currentTarget) && emphasize(event.currentTarget),
    onBlur: (event) => relax(event.currentTarget),
  };

  const soonHandlers = {
    ...itemHandlers,
    onClick: (event) => !matches(MEDIA.hover) && tapSoon(event.currentTarget),
  };

  const handleOpenModal = (event, modal) => {
    relax(event.currentTarget);
    // detail 0 = clique gerado por Enter/Espaço (teclado).
    pointerOpener.current = event.detail > 0 ? event.currentTarget : null;
    setOpenModal(modal);
  };

  const handleCloseModal = () => {
    // Aberto com mouse/toque: o foco devolvido (até por Esc) não reabre o banner,
    // a menos que o mouse esteja em cima dele.
    const opener = pointerOpener.current;
    pointerOpener.current = null;
    if (opener && !(matches(MEDIA.hover) && opener.matches(':hover'))) {
      closeBanner(opener, { reduced: true });
    }
    setOpenModal(null);
  };

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
                    handlers={itemHandlers}
                    soonHandlers={soonHandlers}
                    onOpenModal={handleOpenModal}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {Modal && <Modal onClose={handleCloseModal} />}
    </nav>
  );
}
