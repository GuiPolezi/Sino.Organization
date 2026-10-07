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

export default function DecorShape() {
  return (
    <div className={styles.shape} data-parallax="shape" aria-hidden="true">
      <svg
        className={styles.svg}
        data-intro="shape"
        viewBox={`${-EXTENT} ${-EXTENT} ${EXTENT * 2} ${EXTENT * 2}`}
        focusable="false"
      >
        <path d={RING_PATH} fillRule="evenodd" transform="rotate(45)" />
      </svg>
    </div>
  );
}
