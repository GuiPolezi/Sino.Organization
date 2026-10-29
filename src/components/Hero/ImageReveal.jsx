import { useImperativeHandle, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import styles from './ImageReveal.module.css';

const CURSOR_OFFSET = 20;
// Distância mínima entre a imagem e a borda de baixo da tela.
const VIEWPORT_MARGIN = 16;
const FOLLOW = { duration: 0.4, ease: 'power3' };
const SHOW = { duration: 0.4, ease: 'power4.out' };
const HIDE = { duration: 0.3, ease: 'power4.out' };

/*
 * Port do efeito 2 do ImageRevealHover (Codrops) para GSAP 3.
 * Fica em um portal no <body>: dentro da hero, o transform do scroll horizontal
 * faria o `position: fixed` deixar de ser relativo à viewport.
 */
export default function ImageReveal({ ref }) {
  const reveal = useRef(null);
  const inner = useRef(null);
  const img = useRef(null);
  const follow = useRef(null);
  const timeline = useRef(null);
  // Imagem acima do cursor (sem espaço embaixo). Vale até o próximo `show`,
  // para não ficar pulando de lado enquanto o mouse anda no mesmo item.
  const above = useRef(false);

  const { contextSafe } = useGSAP(() => {
    follow.current = {
      x: gsap.quickTo(reveal.current, 'x', FOLLOW),
      y: gsap.quickTo(reveal.current, 'y', FOLLOW),
    };
  });

  const move = contextSafe((x, y, { immediate = false } = {}) => {
    const targetX = x + CURSOR_OFFSET;
    // Sem espaço embaixo (últimos setores em notebooks), a imagem vai para cima
    // do cursor, como um tooltip, em vez de sair da tela ou cobrir o item.
    const height = reveal.current.offsetHeight;
    const belowY = y + CURSOR_OFFSET;
    if (belowY + height + VIEWPORT_MARGIN > window.innerHeight) above.current = true;
    const targetY = above.current ? Math.max(0, y - CURSOR_OFFSET - height) : belowY;
    // Com `start` igual ao destino, o quickTo salta em vez de animar.
    follow.current.x(targetX, immediate ? targetX : undefined);
    follow.current.y(targetY, immediate ? targetY : undefined);
  });

  const show = contextSafe((image, x, y) => {
    timeline.current?.kill();
    img.current.style.backgroundImage = `url("${image}")`;
    above.current = false;
    move(x, y, { immediate: true });
    gsap.set(reveal.current, { opacity: 1 });

    if (matches(MEDIA.reducedMotion)) {
      gsap.set([inner.current, img.current], { xPercent: 0, yPercent: 0 });
      return;
    }

    // Inner e imagem em direções opostas: é isso que cria a máscara diagonal.
    timeline.current = gsap
      .timeline({ defaults: SHOW })
      .fromTo(
        inner.current,
        { xPercent: -100, yPercent: -100 },
        { xPercent: 0, yPercent: 0 },
        0,
      )
      .fromTo(
        img.current,
        { xPercent: 100, yPercent: 100 },
        { xPercent: 0, yPercent: 0 },
        0,
      );
  });

  const hide = contextSafe(() => {
    timeline.current?.kill();

    if (matches(MEDIA.reducedMotion)) {
      gsap.set(reveal.current, { opacity: 0 });
      return;
    }

    timeline.current = gsap
      .timeline({
        defaults: HIDE,
        onComplete: () => gsap.set(reveal.current, { opacity: 0 }),
      })
      .to(inner.current, { xPercent: 100, yPercent: 100 }, 0)
      .to(img.current, { xPercent: -100, yPercent: -100 }, 0);
  });

  useImperativeHandle(ref, () => ({ show, move, hide }));

  return createPortal(
    <div ref={reveal} className={styles.reveal} aria-hidden="true">
      <div ref={inner} className={styles.inner}>
        <div ref={img} className={styles.img} />
      </div>
    </div>,
    document.body,
  );
}
