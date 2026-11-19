import { useId } from 'react';
import styles from './JanelaApp.module.css';

/*
 * Janela no estilo do macOS com a descrição de um sistema.
 *
 *   vermelho  fecha (volta ao slide Desktop)
 *   amarelo   alterna o modo janela, que pode ser arrastada pela barra
 *   verde     alterna a tela cheia: a barra se recolhe (volta ao passar o
 *             mouse no topo) e o conteúdo ganha um pouco mais de espaço
 *
 * Partes com `data-janela="parte"` aparecem em fade durante a abertura.
 */
const BOTOES = [
  { acao: 'fechar', rotulo: 'Fechar', cor: styles.vermelho, simbolo: 'M3 3l6 6M9 3l-6 6' },
  { acao: 'janela', rotulo: 'Alternar modo janela', cor: styles.amarelo, simbolo: 'M2.5 6h7' },
  { acao: 'telaCheia', rotulo: 'Alternar tela cheia', cor: styles.verde, simbolo: 'M3.5 8.5V3.5h5M8.5 3.5v5h-5' },
];

export default function JanelaApp({ ref, app, modo, barraRef, onAcao }) {
  const tituloId = useId();

  const aoTeclar = (evento) => {
    if (evento.key === 'Escape') onAcao(modo === 'tela-cheia' ? 'telaCheia' : 'fechar');
  };

  return (
    <article
      ref={ref}
      className={styles.janela}
      data-modo={modo}
      aria-labelledby={tituloId}
      tabIndex={-1}
      onKeyDown={aoTeclar}
    >
      {/* Na tela cheia, encostar no topo traz a barra de volta (como no macOS). */}
      <div className={styles.revelar} aria-hidden="true" />

      <header ref={barraRef} className={styles.barra}>
        <div className={styles.semaforo}>
          {BOTOES.map(({ acao, rotulo, cor, simbolo }) => (
            <button
              key={acao}
              type="button"
              className={`${styles.luz} ${cor}`}
              aria-label={rotulo}
              onClick={() => onAcao(acao)}
            >
              <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path d={simbolo} />
              </svg>
            </button>
          ))}
        </div>
      </header>

      <div className={styles.conteudo} data-lenis-prevent>
        <h3 id={tituloId} className={styles.titulo} data-janela="parte">
          {app.titulo}
        </h3>
        <p className={styles.resumo} data-janela="parte">
          {app.resumo}
        </p>
        <ul className={styles.destaques} data-janela="parte">
          {app.destaques.map((destaque) => (
            <li key={destaque}>{destaque}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
