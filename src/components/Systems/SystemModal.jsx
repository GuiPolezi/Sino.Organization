import GlassModal from '../Modal/GlassModal.jsx';
import styles from './SystemModal.module.css';

export default function SystemModal({ system, onClose }) {
  return (
    <GlassModal tag={system.label} title={system.title} onClose={onClose}>
      <p className={styles.summary} data-modal="item">
        {system.summary}
      </p>

      <ul className={styles.highlights}>
        {system.highlights.map((highlight) => (
          <li key={highlight} className={styles.highlight} data-modal="item">
            {highlight}
          </li>
        ))}
      </ul>
    </GlassModal>
  );
}
