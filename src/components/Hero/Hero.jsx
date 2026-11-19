import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import DecorShape from './DecorShape.jsx';
import MenuCards from './MenuCards.jsx';
import { playIntro, playReducedIntro } from './heroAnimations.js';
import styles from './Hero.module.css';

gsap.registerPlugin(useGSAP);

const TITLE_ID = 'hero-title';
const TITLE_LINES = ['Sino', 'Informática'];

// Primeira tela da home; as seções seguintes vêm abaixo, no scroll vertical comum.
export default function Hero() {
  const panel = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => playIntro(panel.current));
      mm.add(MEDIA.reducedMotion, () => playReducedIntro(panel.current));
    },
    { scope: panel },
  );

  return (
    <section ref={panel} className={styles.panel} aria-labelledby={TITLE_ID}>
      {/* A água (WaterRipple, em App.jsx) refrata o título, o divisor e o anel (data-ripple); os cards ficam por cima. */}
      <DecorShape />

      <div className={styles.content}>
        <header className={styles.header}>
          <h1 id={TITLE_ID} className={styles.title} aria-label={TITLE_LINES.join(' ')}>
            {TITLE_LINES.map((line) => (
              <span key={line} className={styles.titleLine} aria-hidden="true">
                <span className={styles.titleLineInner} data-intro="title-line" data-ripple="texto">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/* Linha, duas barrinhas no centro, linha: o divisor da arte. */}
          <div className={styles.divider} aria-hidden="true">
            <span className={`${styles.dividerLine} ${styles.dividerStart}`} data-intro="divider-line" data-ripple="linha" />
            <span className={styles.dividerMark} data-intro="divider-mark" data-ripple="linha" />
            <span className={styles.dividerMark} data-intro="divider-mark" data-ripple="linha" />
            <span className={`${styles.dividerLine} ${styles.dividerEnd}`} data-intro="divider-line" data-ripple="linha" />
          </div>
        </header>

        <MenuCards />
      </div>
    </section>
  );
}
