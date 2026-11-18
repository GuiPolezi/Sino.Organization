import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import DecorShape from './DecorShape.jsx';
import MenuCards from './MenuCards.jsx';
import WaterRipple from './ripple/WaterRipple.jsx';
import { TrackContext } from './TrackContext.js';
import { playIntro, playReducedIntro, setupHorizontalScroll } from './heroAnimations.js';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_ID = 'hero-title';
const TITLE_LINES = ['Sino', 'Informática'];

/*
 * `children` são os próximos painéis do track horizontal. Uma seção que deva
 * voltar ao scroll vertical entra depois do <Hero />, fora dele.
 */
export default function Hero({ children }) {
  const viewport = useRef(null);
  const track = useRef(null);
  const panel = useRef(null);
  const [scrollTween, setScrollTween] = useState(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MEDIA.motion, () => playIntro(panel.current));
      mm.add(MEDIA.reducedMotion, () => playReducedIntro(panel.current));
      mm.add(MEDIA.horizontalScroll, () => {
        setScrollTween(
          setupHorizontalScroll({
            viewport: viewport.current,
            track: track.current,
            panel: panel.current,
          }),
        );
        return () => setScrollTween(null);
      });
    },
    { scope: viewport },
  );

  return (
    <div ref={viewport} className={styles.viewport}>
      <div ref={track} className={styles.track}>
        <section ref={panel} className={styles.panel} aria-labelledby={TITLE_ID}>
          {/* Água sobre o fundo: refrata o título, o divisor e o anel (data-ripple); os cards ficam por cima. */}
          <WaterRipple painel={panel} />
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

        <TrackContext value={scrollTween}>{children}</TrackContext>
      </div>
    </div>
  );
}
