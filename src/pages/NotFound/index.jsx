import styles from './NotFound.module.css';

// Caminho que não existe no site. O servidor ainda responde 200 (o site é uma
// SPA), por isso o noindex: buscadores não devem guardar esta página.
export default function NotFound() {
  return (
    <main className={styles.page}>
      <title>Página não encontrada · sino.org</title>
      <meta name="robots" content="noindex" />

      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.text}>O endereço que você abriu não existe ou mudou de lugar.</p>
      <a className={styles.link} href="/">
        ← Voltar para o início
      </a>
    </main>
  );
}
