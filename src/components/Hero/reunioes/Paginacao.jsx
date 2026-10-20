import { useEffect, useRef } from 'react';
import styles from './Paginacao.module.css';

function Seta({ direcao }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={direcao === 'anterior' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} />
    </svg>
  );
}

// Paginação minimalista: "1–5 de 12" e setas. `onMudar(+1 | -1)`.
export default function Paginacao({ inicio, fim, total, pagina, totalPaginas, onMudar }) {
  const vazia = total === 0;
  const anterior = useRef(null);
  const seguinte = useRef(null);

  const focoPendente = useRef(null);

  // Ao chegar na ponta, a seta clicada fica desabilitada: o foco vai à outra
  // quando a página de fato mudar (a troca espera a animação de saída).
  const mudar = (delta) => {
    const ponta = delta > 0 ? pagina + 1 >= totalPaginas : pagina - 1 <= 1;
    focoPendente.current = ponta ? (delta > 0 ? anterior : seguinte) : null;
    onMudar(delta);
  };

  useEffect(() => {
    focoPendente.current?.current?.focus();
    focoPendente.current = null;
  }, [pagina]);

  return (
    <nav className={styles.paginacao} aria-label="Paginação das reuniões" hidden={vazia}>
      <p className={styles.texto} aria-live="polite" aria-atomic="true">
        <span className="sr-only">Mostrando </span>
        {inicio}–{fim} de {total}
      </p>
      <button
        ref={anterior}
        type="button"
        className={styles.seta}
        aria-label="Página anterior"
        disabled={pagina <= 1}
        onClick={() => mudar(-1)}
      >
        <Seta direcao="anterior" />
      </button>
      <button
        ref={seguinte}
        type="button"
        className={styles.seta}
        aria-label="Página seguinte"
        disabled={pagina >= totalPaginas}
        onClick={() => mudar(1)}
      >
        <Seta direcao="seguinte" />
      </button>
    </nav>
  );
}
