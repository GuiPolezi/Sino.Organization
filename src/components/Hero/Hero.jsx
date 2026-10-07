import { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import CompanyCard from './CompanyCard.jsx';
import DecorShape from './DecorShape.jsx';
import SectorsList from './SectorsList.jsx';
import { TrackContext } from './TrackContext.js';
import YearsCounter from './YearsCounter.jsx';
import {
  playIntro,
  playReducedIntro,
  setupHorizontalScroll,
} from './heroAnimations.js';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_ID = 'hero-title';

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
          <DecorShape />

          <div className={styles.content}>
            <div className={styles.top}>
              <CompanyCard titleId={TITLE_ID} />
              <YearsCounter />
            </div>
            <SectorsList />
          </div>
        </section>

        <TrackContext value={scrollTween}>{children}</TrackContext>
      </div>
    </div>
  );
}
