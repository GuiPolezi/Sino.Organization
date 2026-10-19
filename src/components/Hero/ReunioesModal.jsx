import GlassModal from '../Modal/GlassModal.jsx';
import styles from './ReunioesModal.module.css';

// Modal do setor "Reuniões". Conteúdo provisório até o setor ser definido.
export default function ReunioesModal({ onClose }) {
  return (
    <GlassModal tag="Setores" title="Reuniões" onClose={onClose}>
      <p className={styles.summary} data-modal="item">
        Em breve: agenda, pautas e registros das reuniões da equipe Sino.
      </p>
    </GlassModal>
  );
}
