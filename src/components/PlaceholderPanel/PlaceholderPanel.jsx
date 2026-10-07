import styles from './PlaceholderPanel.module.css';

// Painel provisório: existe só para o track horizontal ter para onde andar.
// Substitua pela próxima seção quando o design chegar.
export default function PlaceholderPanel() {
  return (
    <section className={styles.panel} aria-label="Próxima seção">
      <p className={styles.text}>Próxima seção</p>
    </section>
  );
}
