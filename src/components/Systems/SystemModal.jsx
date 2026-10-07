import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import styles from './SystemModal.module.css';

const blockScroll = (event) => event.preventDefault();

/*
 * Modal de vidro sobre a seção borrada. O <dialog> ocupa a tela inteira e faz
 * o papel de fundo: clicar nele (fora do cartão) ou apertar Esc fecha.
 */
export default function SystemModal({ system, onClose }) {
  const dialog = useRef(null);
  const card = useRef(null);
  const closing = useRef(false);
  const titleId = useId();

  const { contextSafe } = useGSAP(
    () => {
      if (!dialog.current.open) dialog.current.showModal();
      if (matches(MEDIA.reducedMotion)) return;

      gsap.from(dialog.current, { opacity: 0, duration: 0.35, ease: 'power2.out' });
      gsap.from(card.current, {
        scale: 0.9,
        y: 24,
        duration: 0.6,
        ease: 'back.out(1.6)',
      });
      gsap.from('[data-modal="item"]', {
        opacity: 0,
        y: 12,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.05,
        delay: 0.12,
      });
    },
    { scope: dialog },
  );

  // A página não rola enquanto o modal está aberto (o Lenis ignora o dialog).
  useEffect(() => {
    const element = dialog.current;
    const options = { passive: false };

    element.addEventListener('wheel', blockScroll, options);
    element.addEventListener('touchmove', blockScroll, options);

    return () => {
      element.removeEventListener('wheel', blockScroll, options);
      element.removeEventListener('touchmove', blockScroll, options);
    };
  }, []);

  const requestClose = contextSafe(() => {
    if (closing.current) return;
    closing.current = true;

    if (matches(MEDIA.reducedMotion)) {
      dialog.current.close();
      return;
    }

    gsap
      .timeline({ onComplete: () => dialog.current?.close() })
      .to(card.current, { scale: 0.94, y: 12, duration: 0.25, ease: 'power2.in' })
      .to(dialog.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0.05);
  });

  const onCancel = (event) => {
    event.preventDefault();
    requestClose();
  };

  const onBackdropClick = (event) => {
    if (event.target === event.currentTarget) requestClose();
  };

  return createPortal(
    <dialog
      ref={dialog}
      className={styles.overlay}
      aria-labelledby={titleId}
      data-lenis-prevent
      onCancel={onCancel}
      onClose={onClose}
      onClick={onBackdropClick}
    >
      <article ref={card} className={styles.card}>
        <button
          type="button"
          className={styles.close}
          aria-label="Fechar"
          onClick={requestClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <p className={styles.tag} data-modal="item">
          {system.label}
        </p>
        <h3 id={titleId} className={styles.title} data-modal="item">
          {system.title}
        </h3>
        <p className={styles.summary} data-modal="item">
          {system.summary}
        </p>

        <ul className={styles.highlights}>
          {system.highlights.map((highlight) => (
            <li key={highlight} className={styles.highlight} data-modal="item">
              {highlight}
            </li>
          ))}
        </ul>
      </article>
    </dialog>,
    document.body,
  );
}
