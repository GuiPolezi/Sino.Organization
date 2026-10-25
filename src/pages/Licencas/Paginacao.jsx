import { useEffect, useRef } from 'react';
import { paginasVisiveis } from './mappers/licencas.js';
import styles from './Paginacao.module.css';

function Seta({ direcao }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={direcao === 'anterior' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} />
    </svg>
  );
}

/*
 * Paginação de uma seção de licenças: setas, números e "7–12 de 71". A marca
 * da página atual é uma só e desliza até o número novo (posição pelo índice do
 * botão em --i, sem medir o DOM). `onIr(pagina)` pede a troca.
 */
export default function Paginacao({ ref, pagina, totalPaginas, inicio, fim, total, rotulo, onIr }) {
  const anterior = useRef(null);
  const seguinte = useRef(null);
  const focoPendente = useRef(null);
  const itens = paginasVisiveis(pagina, totalPaginas);
  const indiceAtual = itens.indexOf(pagina);

  // Uma seta que chega na ponta fica desabilitada e perderia o foco: ele passa
  // para a outra seta quando a página de fato mudar.
  const ir = (nova) => {
    if (nova < 1 || nova > totalPaginas || nova === pagina) return;
    if (nova === 1 && document.activeElement === anterior.current) focoPendente.current = seguinte;
    if (nova === totalPaginas && document.activeElement === seguinte.current) focoPendente.current = anterior;
    onIr(nova);
  };

  useEffect(() => {
    focoPendente.current?.current?.focus();
    focoPendente.current = null;
  }, [pagina]);

  return (
    <nav ref={ref} className={styles.paginacao} aria-label={rotulo}>
      <button
        ref={anterior}
        type="button"
        className={styles.seta}
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => ir(pagina - 1)}
      >
        <Seta direcao="anterior" />
      </button>

      <div className={styles.numeros} style={{ '--i': indiceAtual }}>
        <span className={styles.marca} aria-hidden="true" />
        <ol className={styles.lista}>
          {itens.map((numero, i) =>
            numero === null ? (
              <li key={i} className={styles.reticencias} aria-hidden="true">
                …
              </li>
            ) : (
              <li key={i}>
                <button
                  type="button"
                  className={styles.numero}
                  aria-current={numero === pagina ? 'page' : undefined}
                  aria-label={`Página ${numero}`}
                  onClick={() => ir(numero)}
                >
                  {numero}
                </button>
              </li>
            ),
          )}
        </ol>
      </div>

      <button
        ref={seguinte}
        type="button"
        className={styles.seta}
        aria-label="Página seguinte"
        disabled={pagina >= totalPaginas}
        onClick={() => ir(pagina + 1)}
      >
        <Seta direcao="seguinte" />
      </button>

      <p className={styles.faixa} aria-live="polite" aria-atomic="true">
        <span className="sr-only">Mostrando </span>
        {inicio === fim ? inicio : `${inicio}–${fim}`} de {total}
      </p>
    </nav>
  );
}
