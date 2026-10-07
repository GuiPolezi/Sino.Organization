import styles from './Notebook.module.css';

// Posição (%) dos blocos de ícones na tela fictícia.
const TILES = [
  { x: 10, y: 24 },
  { x: 27, y: 33 },
  { x: 14, y: 50 },
  { x: 36, y: 54 },
  { x: 31, y: 74 },
  { x: 16, y: 80 },
];

/*
 * Notebook montado em CSS 3D: a base fica deitada no "chão" (.ground) e a
 * tampa gira na dobradiça. Os `data-sys` são os alvos das animações GSAP.
 */
export default function Notebook() {
  return (
    <div className={styles.scene} data-sys="notebook" aria-hidden="true">
      <div className={styles.tilt} data-sys="tilt">
        <div className={styles.ground}>
          <div className={styles.shadow} data-sys="shadow" />

          <div className={styles.laptop} data-sys="laptop">
            <div className={styles.bottom} />
            <div className={styles.sideFront} />
            <div className={styles.sideLeft} />

            <div className={styles.base}>
              <div className={styles.keyboard} />
              <div className={styles.trackpad} />
            </div>

            <div className={styles.lid} data-sys="lid">
              <div className={styles.display}>
                <div className={styles.screen}>
                  {TILES.map(({ x, y }) => (
                    <span
                      key={`${x}-${y}`}
                      className={styles.tile}
                      style={{ '--x': x, '--y': y }}
                    />
                  ))}

                  <div className={styles.login}>
                    <span className={styles.crest} />
                    <span className={styles.field} />
                    <span className={styles.field} />
                    <span className={styles.cta} />
                    <span className={styles.ghost} />
                  </div>
                </div>
                <div className={styles.notch} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
