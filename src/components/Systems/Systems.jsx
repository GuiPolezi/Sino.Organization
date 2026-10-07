import { useContext, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import DecorShape from '../Hero/DecorShape.jsx';
import { TrackContext } from '../Hero/TrackContext.js';
import Notebook from './Notebook.jsx';
import SystemModal from './SystemModal.jsx';
import { LINE_DASH, SYSTEMS } from './systems.js';
import { playAmbient, playEntrance, setupTilt } from './systemsAnimations.js';
import styles from './Systems.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITLE_ID = 'systems-title';
const ART_SIZE = { width: 1440, height: 1024 };

export default function Systems() {
  const root = useRef(null);
  const scrollTween = useContext(TrackContext);
  const [activeSystem, setActiveSystem] = useState(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // No track horizontal a entrada depende do tween do Hero; empilhado, do scroll normal.
      mm.add(MEDIA.horizontalScroll, () => {
        if (!scrollTween) return;
        playEntrance(root.current, {
          containerAnimation: scrollTween,
          start: 'left 55%',
        });
      });
      mm.add(MEDIA.verticalMotion, () => {
        playEntrance(root.current, { start: 'top 65%' });
      });
      mm.add(MEDIA.motion, () => playAmbient(root.current));
      mm.add(`${MEDIA.hover} and ${MEDIA.motion}`, () => setupTilt(root.current));
    },
    { scope: root, dependencies: [scrollTween], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.panel} aria-labelledby={TITLE_ID}>
      <DecorShape variant="systems" />

      <div className={styles.stage}>
        <header className={styles.header}>
          <h2 id={TITLE_ID} className={styles.title}>
            <span className={styles.titleLine}>
              <span className={styles.titleLineInner} data-sys="title-line">
                Sistemas
              </span>
            </span>
          </h2>
          <p className={styles.subtitle} data-sys="subtitle">
            Clique para visualizar uma explicação sucinta sobre o sistema
          </p>
        </header>

        <div className={styles.hub} data-sys="hub" aria-hidden="true">
          <div className={styles.hubPulse} data-sys="hub-pulse" />
        </div>

        <svg
          className={styles.lines}
          viewBox={`0 0 ${ART_SIZE.width} ${ART_SIZE.height}`}
          aria-hidden="true"
          focusable="false"
        >
          {SYSTEMS.map(({ id, line }) => (
            <line
              key={id}
              data-sys="line"
              strokeDasharray={LINE_DASH.join(' ')}
              {...line}
            />
          ))}
        </svg>

        <div className={styles.notebook}>
          <Notebook />
        </div>

        <ul className={styles.balloons}>
          {SYSTEMS.map((system) => (
            <li
              key={system.id}
              className={styles.item}
              data-sys="balloon"
              style={{ '--x': system.position.x, '--y': system.position.y }}
            >
              <div data-sys="balloon-float">
                <button
                  type="button"
                  className={styles.balloon}
                  aria-haspopup="dialog"
                  onClick={() => setActiveSystem(system)}
                >
                  {system.label}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {activeSystem && (
        <SystemModal system={activeSystem} onClose={() => setActiveSystem(null)} />
      )}
    </section>
  );
}
