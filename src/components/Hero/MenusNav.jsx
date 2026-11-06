import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import ImageReveal from './ImageReveal.jsx';
import MenuItem from './MenuItem.jsx';
import MenusButton from './MenusButton.jsx';
import ReunioesModal from './ReunioesModal.jsx';
import { menus } from './menus.js';
import { buildTour, drawUnderline, hideSoonLabels, rollSoon } from './menusAnimations.js';
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
  // Botão que abriu o modal com mouse/toque: ao fechar, o <dialog> devolve o foco a ele.
  const pointerOpener = useRef(null);
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
    // no destaque do clique, sem o mouseleave: desfaz em quem não está em uso.
    const restore = (event) => {
      if (!event.persisted || !root.current) return;
      // No toque o :hover fica grudado no último item tocado: lá ele não conta.
      const canHover = matches(MEDIA.hover);
      let hovered = false;
      root.current.querySelectorAll('[data-menu="item"]').forEach((item) => {
        const isHovered = canHover && item.matches(':hover');
        hovered ||= isHovered;
        if (!isHovered && !isKeyboardFocus(item)) drawUnderline(item, false);
      });
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

  const emphasize = contextSafe((item) => {
    if (!isReduced()) drawUnderline(item, true);
  });
  const relax = contextSafe((item) => drawUnderline(item, false));

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

  const itemHandlers = (image) => ({
    onMouseEnter: (event) => {
      // No toque, o mouseenter emulado deixaria o item destacado depois do toque.
      if (!matches(MEDIA.hover)) return;
      emphasize(event.currentTarget);
      reveal.current?.show(image, event.clientX, event.clientY);
    },
    onMouseMove: (event) => {
      if (matches(MEDIA.hover)) reveal.current?.move(event.clientX, event.clientY);
    },
    onMouseLeave: (event) => {
      relax(event.currentTarget);
      if (matches(MEDIA.hover)) reveal.current?.hide();
    },
    // Foco por teclado destaca; o foco do clique (ou o que o <dialog> devolve ao
    // fechar) não, senão o item fica sublinhado sem o mouse em cima.
    onFocus: (event) => isKeyboardFocus(event.currentTarget) && emphasize(event.currentTarget),
    onBlur: (event) => relax(event.currentTarget),
  });

  const handleOpenModal = (event, modal) => {
    relax(event.currentTarget);
    reveal.current?.hide();
    // detail 0 = clique gerado por Enter/Espaço (teclado).
    pointerOpener.current = event.detail > 0 ? event.currentTarget : null;
    setOpenModal(modal);
  };

  const handleCloseModal = () => {
    // Aberto com mouse/toque: o foco devolvido (até por Esc) não deixa o item destacado,
    // a menos que o mouse esteja em cima dele.
    const opener = pointerOpener.current;
    pointerOpener.current = null;
    if (opener && !(matches(MEDIA.hover) && opener.matches(':hover'))) {
      drawUnderline(opener, false);
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
