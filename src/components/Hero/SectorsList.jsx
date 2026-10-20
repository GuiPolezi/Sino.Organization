import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import ImageReveal from './ImageReveal.jsx';
import ReunioesModal from './ReunioesModal.jsx';
import { sectors } from './sectors.js';
import styles from './SectorsList.module.css';

// Quanto a linha cresce no hover (fração da própria largura); o texto anda o mesmo tanto.
const LINE_GROWTH = 0.08;
const HOVER_TWEEN = { duration: 0.5, ease: 'power3.out', overwrite: 'auto' };

// Setores sem página própria abrem um destes modais (chave = `modal` em sectors.js).
const MODALS = {
  reunioes: ReunioesModal,
};

const getParts = (link) => ({
  line: link.querySelector('[data-sector="line"]'),
  text: link.querySelector('[data-sector="text"]'),
});

// Desfaz o destaque. Fora do componente para o pageshow e o fechar do modal usarem sem ref.
const relaxLink = (link) => {
  const { line, text } = getParts(link);
  gsap.to(line, { scaleX: 1, ...HOVER_TWEEN });
  gsap.to(text, { x: 0, ...HOVER_TWEEN });
};

// Foco vindo do teclado? Safari < 15.4 não conhece :focus-visible: aí vale qualquer foco.
const isKeyboardFocus = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

export default function SectorsList() {
  const root = useRef(null);
  const reveal = useRef(null);
  const [openModal, setOpenModal] = useState(null);
  // Botão que abriu o modal com mouse/toque: ao fechar, o <dialog> devolve o foco a ele.
  const pointerOpener = useRef(null);
  const { contextSafe } = useGSAP({ scope: root });
  const Modal = openModal ? MODALS[openModal] : null;

  useEffect(() => {
    // Pré-carrega para a imagem já estar pronta no primeiro hover.
    if (!matches(MEDIA.hover)) return;
    sectors.forEach(({ image }) => {
      new Image().src = image;
    });
  }, []);

  const emphasize = contextSafe((link) => {
    if (matches(MEDIA.reducedMotion)) return;
    const { line, text } = getParts(link);
    gsap.to(line, { scaleX: 1 + LINE_GROWTH, ...HOVER_TWEEN });
    gsap.to(text, { x: line.offsetWidth * LINE_GROWTH, ...HOVER_TWEEN });
  });

  const relax = contextSafe(relaxLink);

  // Foco por teclado destaca; o foco do clique (ou o que o <dialog> devolve ao
  // fechar) não, senão o item fica deslocado sem o mouse em cima.
  const handleFocus = (event) => {
    if (isKeyboardFocus(event.currentTarget)) emphasize(event.currentTarget);
  };

  useEffect(() => {
    // Ao voltar de outra página pelo histórico (bfcache), a home volta congelada
    // no destaque do clique, sem o mouseleave: desfaz em quem não está em uso.
    const restore = (event) => {
      if (!event.persisted || !root.current) return;
      // No toque o :hover fica grudado no último item tocado: lá ele não conta.
      const canHover = matches(MEDIA.hover);
      let hovered = false;
      root.current.querySelectorAll('[data-intro="sector"]').forEach((link) => {
        const isHovered = canHover && link.matches(':hover');
        hovered ||= isHovered;
        if (!isHovered && !isKeyboardFocus(link)) relaxLink(link);
      });
      if (!hovered) reveal.current?.hide();
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);

  const handleEnter = (event, image) => {
    // No toque, o mouseenter emulado deixaria o item destacado depois do toque.
    if (!matches(MEDIA.hover)) return;
    emphasize(event.currentTarget);
    reveal.current?.show(image, event.clientX, event.clientY);
  };

  const handleMove = (event) => {
    if (matches(MEDIA.hover)) {
      reveal.current?.move(event.clientX, event.clientY);
    }
  };

  const handleLeave = (event) => {
    relax(event.currentTarget);
    if (matches(MEDIA.hover)) reveal.current?.hide();
  };

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
    if (opener && !(matches(MEDIA.hover) && opener.matches(':hover'))) relaxLink(opener);
    setOpenModal(null);
  };

  return (
    <nav ref={root} className={styles.sectors} aria-labelledby="sectors-label">
      <h2 id="sectors-label" className={styles.label} data-intro="sectors-label">
        Setores
      </h2>

      <ul className={styles.list}>
        {sectors.map(({ label, href, modal, image }) => {
          const handlers = {
            onMouseEnter: (event) => handleEnter(event, image),
            onMouseMove: handleMove,
            onMouseLeave: handleLeave,
            onFocus: handleFocus,
            onBlur: (event) => relax(event.currentTarget),
          };
          const content = (
            <>
              <span className={styles.line} data-sector="line" data-intro="sector-line" />
              <span className={styles.text} data-sector="text">
                {label}
              </span>
            </>
          );

          return (
            <li key={label}>
              {modal ? (
                <button
                  type="button"
                  className={styles.link}
                  data-intro="sector"
                  aria-haspopup="dialog"
                  onClick={(event) => handleOpenModal(event, modal)}
                  {...handlers}
                >
                  {content}
                </button>
              ) : (
                <a className={styles.link} data-intro="sector" href={href} {...handlers}>
                  {content}
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <ImageReveal ref={reveal} />
      {Modal && <Modal onClose={handleCloseModal} />}
    </nav>
  );
}
