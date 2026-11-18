import { isSoon } from './menus.js';
import styles from './MenuCards.module.css';

// Cadeado do card bloqueado.
function Cadeado() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    </svg>
  );
}

/*
 * Um card da home: link de página, botão de modal ou, se ainda não foi
 * desenvolvido, um card bloqueado (cinza, sem clique, com cadeado e "Em breve").
 * O vidro, o reflexo e a arte são camadas separadas: o GSAP anima cada uma
 * (cardsAnimations.js), e a arte pode sair da borda sem ser cortada.
 */
export default function MenuCard({ item, handlers, onOpenModal }) {
  const { label, name, href, modal, image } = item;
  const bloqueado = isSoon(item);

  const conteudo = (
    <>
      <span className={styles.vidro} aria-hidden="true" />
      <span className={styles.reflexo} aria-hidden="true" />
      <span className={styles.rotulo} aria-hidden={bloqueado || undefined}>
        {label}
      </span>
      {bloqueado && (
        <span className={styles.selo} aria-hidden="true">
          <Cadeado />
          Em breve
        </span>
      )}
      <span className={styles.palco} data-intro="card-art" aria-hidden="true">
        <img
          className={styles.arte}
          data-card="arte"
          src={image}
          width={1200}
          height={800}
          alt=""
          draggable="false"
          decoding="async"
        />
      </span>
    </>
  );

  const comum = {
    className: `${styles.card}${bloqueado ? ` ${styles.bloqueado}` : ''}`,
    'data-card': 'card',
    ...handlers,
  };

  if (bloqueado) {
    return (
      <div {...comum} role="link" aria-disabled="true" aria-label={`${label}, em breve`} tabIndex={0}>
        {conteudo}
      </div>
    );
  }

  if (modal) {
    return (
      <button type="button" aria-haspopup="dialog" onClick={() => onOpenModal(modal)} {...comum}>
        {conteudo}
      </button>
    );
  }

  return (
    // O nome acessível começa pelo texto visível ("Dev."), com o nome completo depois.
    <a href={href} aria-label={name ? `${label} (${name})` : undefined} {...comum}>
      {conteudo}
    </a>
  );
}
