import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import ImageReveal from './ImageReveal.jsx';
import { sectors } from './sectors.js';
import styles from './SectorsList.module.css';

// Quanto a linha cresce no hover (fração da própria largura); o texto anda o mesmo tanto.
const LINE_GROWTH = 0.08;
const HOVER_TWEEN = { duration: 0.5, ease: 'power3.out', overwrite: 'auto' };

const getParts = (link) => ({
  line: link.querySelector('[data-sector="line"]'),
  text: link.querySelector('[data-sector="text"]'),
});

export default function SectorsList() {
  const root = useRef(null);
  const reveal = useRef(null);
  const { contextSafe } = useGSAP({ scope: root });

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

  const relax = contextSafe((link) => {
    const { line, text } = getParts(link);
    gsap.to(line, { scaleX: 1, ...HOVER_TWEEN });
    gsap.to(text, { x: 0, ...HOVER_TWEEN });
  });

  const handleEnter = (event, image) => {
    emphasize(event.currentTarget);
    if (matches(MEDIA.hover)) {
      reveal.current?.show(image, event.clientX, event.clientY);
    }
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

  return (
    <nav ref={root} className={styles.sectors} aria-labelledby="sectors-label">
      <h2 id="sectors-label" className={styles.label} data-intro="sectors-label">
        Setores
      </h2>

      <ul className={styles.list}>
        {sectors.map(({ label, href, image }) => (
          <li key={href}>
            <a
              className={styles.link}
              data-intro="sector"
              href={href}
              onMouseEnter={(event) => handleEnter(event, image)}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              onFocus={(event) => emphasize(event.currentTarget)}
              onBlur={(event) => relax(event.currentTarget)}
            >
              <span className={styles.line} data-sector="line" data-intro="sector-line" />
              <span className={styles.text} data-sector="text">
                {label}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <ImageReveal ref={reveal} />
    </nav>
  );
}
