import { isSoon } from './menus.js';
import styles from './MenusNav.module.css';

/*
 * Um item dos menus: link de página, botão de modal ou, se ainda não foi
 * desenvolvido, um texto apagado que troca para "EM BREVE". Os itens prontos
 * abrem um banner com foto atrás do nome (hover, foco por teclado e a
 * apresentação do botão "Menus").
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
        <span className={styles.label} data-menu="label" aria-hidden="true">
          <span className={styles.roll}>
            <span className={styles.name} data-menu="name">
              {label}
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
        {banner && (
          <span
            className={styles.bannerImage}
            data-menu="banner-image"
            style={{ backgroundImage: `url("${banner}")` }}
          />
        )}
      </span>
      <span className={styles.label} data-menu="label">
        {label}
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
