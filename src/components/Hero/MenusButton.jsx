import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import styles from './MenusButton.module.css';

const FOLLOW = { duration: 0.5, ease: 'power3' };
const GLOW = { duration: 0.5, ease: 'power2.out', overwrite: 'auto' };

/*
 * Pílula de vidro líquido. O reflexo acompanha o ponteiro e o clique "amassa"
 * o vidro, que volta com elasticidade. Só dispara a apresentação dos menus.
 */
export default function MenusButton({ onPlay, playing }) {
  const button = useRef(null);
  const glow = useRef(null);
  const follow = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      gsap.set(glow.current, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      follow.current = {
        x: gsap.quickTo(glow.current, 'x', FOLLOW),
        y: gsap.quickTo(glow.current, 'y', FOLLOW),
      };
    },
    { scope: button },
  );

  const moveGlow = contextSafe((event, immediate = false) => {
    const rect = button.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    follow.current.x(x, immediate ? x : undefined);
    follow.current.y(y, immediate ? y : undefined);
  });

  const handleEnter = contextSafe((event) => {
    if (!matches(MEDIA.hover)) return;
    moveGlow(event, true);
    gsap.to(glow.current, { autoAlpha: 1, ...GLOW });
  });

  const handleMove = (event) => {
    if (matches(MEDIA.hover)) moveGlow(event);
  };

  const handleLeave = contextSafe(() => {
    gsap.to(glow.current, { autoAlpha: 0, ...GLOW });
  });

  const press = contextSafe(() => {
    if (matches(MEDIA.reducedMotion)) return;
    gsap
      .timeline({ overwrite: 'auto' })
      .to(button.current, { scaleX: 1.08, scaleY: 0.9, duration: 0.14, ease: 'power2.out' })
      .to(button.current, {
        scaleX: 1,
        scaleY: 1,
        duration: 0.9,
        ease: 'elastic.out(1, 0.4)',
      });
  });

  const handleClick = () => {
    if (playing) return;
    press();
    onPlay();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        className={styles.glass}
        data-intro="menus-button"
        aria-disabled={playing || undefined}
        aria-describedby="menus-button-hint"
        onClick={handleClick}
        onPointerEnter={handleEnter}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        <span className={styles.progress} data-menu="progress" aria-hidden="true" />
        <span ref={glow} className={styles.glow} aria-hidden="true" />
        <span className={styles.label}>Menus</span>
      </button>
      {/* Fora do botão: dentro dele, entraria no nome acessível. */}
      <span id="menus-button-hint" className="sr-only">
        Apresenta as seções de navegação, uma por vez
      </span>
    </>
  );
}
