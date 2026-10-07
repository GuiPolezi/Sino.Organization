import GlassModal from '../Modal/GlassModal.jsx';
import styles from './PlaceModal.module.css';

const countLabel = (total) => `${total} ${total === 1 ? 'cliente' : 'clientes'} nesta cidade`;

// Informação completa de uma cidade: todos os clientes atendidos nela.
export default function PlaceModal({ place, stateName, onClose }) {
  return (
    <GlassModal tag={`${stateName} · ${place.uf}`} title={place.city} onClose={onClose}>
      <p className={styles.count} data-modal="item">
        {countLabel(place.clients.length)}
      </p>

      <ul className={styles.clients} data-modal="item" data-modal-scroll>
        {place.clients.map((client) => (
          <li key={client} className={styles.client}>
            {client}
          </li>
        ))}
      </ul>
    </GlassModal>
  );
}
