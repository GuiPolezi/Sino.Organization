import { useSyncExternalStore } from 'react';
import { MEDIA } from '../../utils/media.js';
import styles from './DecorShape.module.css';

/*
 * Anel quadrado de cantos arredondados, girado 45°. Só o canto esquerdo e o
 * superior aparecem; o resto é cortado pela borda da tela, formando o chevron.
 * Coordenadas na escala da arte (1440px), com a origem no centro do anel.
 */
const OUTER = { half: 301, radius: 80 };
const INNER = { half: 125, radius: 30 };
const EXTENT = 393; // meia diagonal do anel já girado

const roundedSquare = ({ half, radius }) => {
  const edge = half - radius;
  const arc = `A ${radius} ${radius} 0 0 1`;
  return [
    `M ${-edge} ${-half}`,
    `H ${edge}`,
    `${arc} ${half} ${-edge}`,
    `V ${edge}`,
    `${arc} ${edge} ${half}`,
    `H ${-edge}`,
    `${arc} ${-half} ${edge}`,
    `V ${-edge}`,
    `${arc} ${-edge} ${-half}`,
    'Z',
  ].join(' ');
};

const RING_PATH = `${roundedSquare(OUTER)} ${roundedSquare(INNER)}`;

/*
 * A home é contínua (sem corte entre seções): em vez de ser cortado na base
 * do Hero, o anel some aos poucos até ela. Frações da altura do SVG; a base
 * do Hero fica em (tamanho + bottom) / tamanho, conforme DecorShape.module.css.
 */
const FADE = {
  desktop: { start: 0.5, end: (54.6 - 18) / 54.6 },
  mobile: { start: 0.4, end: (110 - 50) / 110 },
};
const FADE_ID = 'decor-shape-fade';

const subscribe = (onChange) => {
  const query = window.matchMedia(MEDIA.desktop);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const isDesktop = () => window.matchMedia(MEDIA.desktop).matches;

export default function DecorShape() {
  const fade = useSyncExternalStore(subscribe, isDesktop, () => true) ? FADE.desktop : FADE.mobile;

  return (
    <div className={styles.shape} aria-hidden="true">
      <svg
        className={styles.svg}
        data-intro="shape"
        // A água da home (ripple/WaterRipple.jsx) redesenha o anel refratado.
        data-ripple="svg"
        viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}
        focusable="false"
      >
        {/* Máscara no espaço do viewBox (fora do rotate), para o degradê ser vertical. */}
        <defs>
          <linearGradient id={`${FADE_ID}-grad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset={fade.start} stopColor="#fff" />
            <stop offset={fade.end} stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={FADE_ID} maskUnits="userSpaceOnUse" x={-EXTENT} y={-EXTENT} width={EXTENT * 2} height={EXTENT * 2}>
            <rect x={-EXTENT} y={-EXTENT} width={EXTENT * 2} height={EXTENT * 2} fill={`url(#${FADE_ID}-grad)`} />
          </mask>
        </defs>
        <g mask={`url(#${FADE_ID})`}>
          <path d={RING_PATH} fillRule="evenodd" transform="rotate(45)" />
        </g>
      </svg>
    </div>
  );
}
