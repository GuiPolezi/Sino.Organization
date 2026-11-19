import styles from './Systems.module.css';

const SETA = {
  anterior: 'M9 2 3 8l6 6',
  proximo: 'M3 2l6 6-6 6',
};

/** Pílula de vidro com as setas e um ponto por slide (Desktop + aplicativos). */
export default function SlideNav({ slides, indice, onIr }) {
  const ultimo = slides.length - 1;

  const seta = (direcao, destino, rotulo, desabilitada) => (
    <button
      type="button"
      className={styles.seta}
      aria-label={rotulo}
      disabled={desabilitada}
      onClick={() => onIr(destino)}
    >
      <svg viewBox="0 0 12 16" aria-hidden="true" focusable="false">
        <path d={SETA[direcao]} />
      </svg>
    </button>
  );

  return (
    <nav className={styles.slides} aria-label="Slides dos sistemas">
      {seta('anterior', indice - 1, 'Slide anterior', indice === 0)}
      <ol className={styles.pontos}>
        {slides.map((slide, i) => (
          <li key={slide.nome}>
            <button
              type="button"
              className={styles.ponto}
              aria-label={`Slide ${i + 1}: ${slide.nome}`}
              aria-current={i === indice ? 'step' : undefined}
              onClick={() => onIr(i)}
            />
          </li>
        ))}
      </ol>
      {seta('proximo', indice + 1, 'Próximo slide', indice === ultimo)}
    </nav>
  );
}
