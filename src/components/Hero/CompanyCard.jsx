import facade from '../../assets/images/banners_site_fachada2.webp';
import styles from './CompanyCard.module.css';

const FACADE_SIZE = { width: 1080, height: 352 };
const TITLE_LINES = ['Sino', 'Informática'];
const OFFICIAL_SITE_URL = '#';

export default function CompanyCard({ titleId }) {
  return (
    <article className={styles.card} data-intro="card">
      <div className={styles.shadow} aria-hidden="true" />

      <div className={styles.mask}>
        <img
          className={styles.image}
          data-intro="card-image"
          src={facade}
          width={FACADE_SIZE.width}
          height={FACADE_SIZE.height}
          alt="Fachada do prédio onde fica a Sino Informática"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className={styles.overlay} aria-hidden="true" />

        <div className={styles.content}>
          <h1 id={titleId} className={styles.title} aria-label={TITLE_LINES.join(' ')}>
            {TITLE_LINES.map((line) => (
              <span key={line} className={styles.titleLine} aria-hidden="true">
                <span className={styles.titleLineInner} data-intro="title-line">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p className={styles.address} data-intro="card-info">
            Endereço: R. Cezira Giovanoni Moretti, 905 - Santa Rosa
          </p>

          <p className={styles.hours} data-intro="card-info">
            Segunda a Sexta
            <br />
            8h às 18h
          </p>

          <a
            className={styles.link}
            data-intro="card-info"
            href={OFFICIAL_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Clique aqui para acessar site oficial
          </a>
        </div>
      </div>
    </article>
  );
}
