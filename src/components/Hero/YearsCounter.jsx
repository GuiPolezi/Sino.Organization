import { FOUNDING_YEAR, getYearsSince } from '../../utils/getYearsSince.js';
import styles from './YearsCounter.module.css';

export default function YearsCounter() {
  const years = getYearsSince();

  return (
    <div className={styles.counter} data-parallax="counter">
      <p className="sr-only">
        {years} anos de história, desde {FOUNDING_YEAR}
      </p>

      <div className={styles.row} aria-hidden="true">
        {/* O sizer invisível reserva a largura final: a contagem não empurra o rótulo. */}
        <span className={styles.number} data-intro="counter-number">
          <span className={styles.sizer}>{years}</span>
          <span className={styles.value} data-intro="count">
            {years}
          </span>
        </span>

        <div className={styles.text}>
          <span className={styles.label} data-intro="counter-text">
            Anos de
            <br />
            História
          </span>
          <span className={styles.since} data-intro="counter-text">
            Desde {FOUNDING_YEAR}
          </span>
        </div>
      </div>
    </div>
  );
}
