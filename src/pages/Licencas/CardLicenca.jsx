import { caminhoCliente, descreverPrazo, formatarData } from './mappers/licencas.js';
import styles from './Licencas.module.css';

// Um cliente com licença vencida ou perto de vencer. O card inteiro é
// clicável: o link se estende por cima dele (ver .link::after no CSS).
export default function CardLicenca({ licenca, extra = false }) {
  const { nome, slug, sistemas, vencimento, dias } = licenca;

  return (
    <li className={styles.card} data-anim="card" data-extra={extra || undefined}>
      <div className={styles.colCliente}>
        <h3 className={styles.nome}>{nome}</h3>
        <a className={styles.link} href={caminhoCliente(slug)}>
          <span className={styles.seta} aria-hidden="true">
            →
          </span>
          Clique para acessar a licença do cliente
          <span className="sr-only">: {nome}</span>
        </a>
      </div>

      <div className={styles.colSistemas}>
        <span className={styles.rotulo}>Sistema</span>
        <ul className={styles.sistemas}>
          {sistemas.map((sistema) => (
            <li key={sistema} data-anim="sistema">
              {sistema}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.colData}>
        <span className={styles.rotulo}>Data Vencimento</span>
        <time className={styles.data} dateTime={vencimento}>
          {formatarData(vencimento)}
        </time>
        <span className={styles.prazo}>{descreverPrazo(dias)}</span>
      </div>
    </li>
  );
}
