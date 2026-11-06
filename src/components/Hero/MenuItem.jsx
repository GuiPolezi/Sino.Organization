import { isSoon } from './menus.js';
import styles from './MenusNav.module.css';

// Foto do banner; sem foto, o banner fica só com a cor de fundo.
function BannerImage({ src }) {
  if (!src) return null;
  return (
    <span
      className={styles.bannerImage}
      data-menu="banner-image"
      style={{ backgroundImage: `url("${src}")` }}
    />
  );
}

/*
 * Um item dos menus: link de página, botão de modal ou, se ainda não foi
 * desenvolvido, um texto apagado. No hover (ou foco por teclado) abre um
 * banner atrás do nome, que encolhe para o canto do banner.
 * Os `data-menu` são os alvos das animações (menusAnimations.js).
 */
export default function MenuItem({ item, handlers, soonHandlers, onOpenModal }) {
  const { label, href, modal, banner } = item;

  if (isSoon(item)) {
    return (
      <span
        className={`${styles.item} ${styles.soon}`}
        role="link"
        aria-disabled="true"
        // O nome acessível fica fixo aqui: os textos de dentro são animados.
        aria-label={`${label}, em breve`}
        tabIndex={0}
        data-menu="item"
        data-soon=""
        data-intro="menu-item"
        {...soonHandlers}
      >
        <span className={`${styles.banner} ${styles.bannerSoon}`} data-menu="banner" aria-hidden="true">
          <BannerImage src={banner} />
        </span>
        <span className={styles.label} data-menu="label" aria-hidden="true">
          <span className={styles.roll}>
            <span className={styles.name} data-menu="name">
              {label}
              {/* Versão clara do nome, acesa sobre o banner cinza. */}
              <span className={styles.nameLit} data-menu="name-lit">
                {label}
              </span>
            </span>
            <span className={styles.soonText} data-menu="soon">
              Em breve
            </span>
          </span>
        </span>
      </span>
    );
  }

  const content = (
    <>
      <span className={styles.banner} data-menu="banner" aria-hidden="true">
        <BannerImage src={banner} />
      </span>
      <span className={styles.label} data-menu="label">
        {label}
        <span className={styles.underline} data-menu="underline" aria-hidden="true" />
      </span>
    </>
  );
  const common = {
    className: styles.item,
    'data-menu': 'item',
    'data-intro': 'menu-item',
    ...handlers,
  };

  if (modal) {
    return (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={(event) => onOpenModal(event, modal)}
        {...common}
      >
        {content}
      </button>
    );
  }

  return (
    <a href={href} {...common}>
      {content}
    </a>
  );
}
