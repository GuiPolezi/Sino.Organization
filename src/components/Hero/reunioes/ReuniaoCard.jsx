import { useEffect, useId, useRef, useState } from 'react';
import { MODALIDADES } from './reunioes.js';
import { STATUS, partesDataHora, statusDe } from './periodos.js';
import MembrosAvatares from './MembrosAvatares.jsx';
import styles from './ReuniaoCard.module.css';

// TODO: apontar para a página da reunião quando ela existir. Sem destino
// (null), o link fica visível mas não navega.
const linkDaReuniao = () => null;

function IconeModalidade({ digital }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {digital ? (
        <>
          <rect x="3" y="6" width="12" height="12" rx="2" />
          <path d="M15 10.5l6-3.5v10l-6-3.5" />
        </>
      ) : (
        <>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.3" />
        </>
      )}
    </svg>
  );
}

// Ações do card (aparecem no hover/foco): editar e remover. A remoção tem
// confirmação inline (nunca window.confirm).
function Acoes({ titulo, onEditar, onConfirmar }) {
  const [confirmando, setConfirmando] = useState(false);
  const naoBotao = useRef(null);
  const removerBotao = useRef(null);
  const abriu = useRef(false);

  // Foco acompanha a troca entre o botão e a confirmação.
  useEffect(() => {
    if (confirmando) naoBotao.current?.focus();
    else if (abriu.current) removerBotao.current?.focus();
  }, [confirmando]);

  // Esc cancela só a confirmação, sem fechar o modal.
  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setConfirmando(false);
  };

  if (confirmando) {
    return (
      <div
        className={`${styles.acoes} ${styles.confirmando}`}
        role="group"
        aria-label={`Remover a reunião ${titulo}?`}
        onKeyDown={onKeyDown}
      >
        <span className={styles.pergunta} aria-hidden="true">
          Remover?
        </span>
        <button type="button" className={styles.sim} onClick={onConfirmar}>
          Sim, remover
        </button>
        <button
          ref={naoBotao}
          type="button"
          className={styles.nao}
          onClick={() => setConfirmando(false)}
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div className={styles.acoes}>
      <button
        type="button"
        className={styles.editar}
        aria-label={`Editar a reunião ${titulo}`}
        onClick={onEditar}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4z" />
          <path d="M13.5 6.5l4 4" />
        </svg>
        <span className={styles.acaoTexto}>Editar</span>
      </button>
      <button
        ref={removerBotao}
        type="button"
        className={styles.remover}
        aria-label={`Remover a reunião ${titulo}`}
        onClick={() => {
          abriu.current = true;
          setConfirmando(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
        <span className={styles.acaoTexto}>Remover</span>
      </button>
    </div>
  );
}

// Card de uma reunião do histórico (layout do design: info, membros, avatares, selo).
export default function ReuniaoCard({ reuniao, agora, destaque = false, onEditar, onRemover }) {
  const tituloId = useId();
  const status = STATUS[statusDe(reuniao, agora)] ?? STATUS.encerrada;
  const { diaSemana, data, horario } = partesDataHora(reuniao);
  const digital = reuniao.modalidade === MODALIDADES.DIGITAL;
  const membros = Array.isArray(reuniao.membros) ? reuniao.membros : [];
  const link = linkDaReuniao(reuniao);

  return (
    <article
      className={destaque ? `${styles.card} ${styles.novo}` : styles.card}
      aria-labelledby={tituloId}
    >
      <div className={styles.info}>
        <h5 id={tituloId} className={styles.titulo} title={reuniao.titulo}>
          {reuniao.titulo}
        </h5>

        <p className={styles.quando}>
          <time dateTime={reuniao.dataHora}>
            {diaSemana}
            <span className={styles.barra} aria-hidden="true">/</span>
            <span className="sr-only">, </span>
            {data}
            <span className={styles.barra} aria-hidden="true">/</span>
            <span className="sr-only">, </span>
            {horario}
          </time>
          <span className={styles.modalidade}>
            <IconeModalidade digital={digital} />
            <span className="sr-only">, </span>
            {digital ? 'Digital' : 'Presencial'}
          </span>
        </p>

        <a
          className={styles.acessar}
          href={link ?? '#'}
          aria-disabled={link ? undefined : 'true'}
          onClick={(event) => {
            if (!link) event.preventDefault();
          }}
        >
          <svg className={styles.seta} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
          <span className={styles.acessarTexto}>Clique para acessar a reunião</span>
          <span className="sr-only">: {reuniao.titulo}</span>
        </a>
      </div>

      <p className={styles.membros}>
        <span className={styles.membrosRotulo}>Membros</span>
        <span className={styles.membrosNumero}>{membros.length}</span>
      </p>

      <div className={styles.avatares}>
        <MembrosAvatares membros={membros} max={6} />
      </div>

      <span className={`${styles.selo} ${styles[status.id]}`}>
        <span className="sr-only">Status: </span>
        {status.rotulo}
      </span>

      <Acoes
        titulo={reuniao.titulo}
        onEditar={() => onEditar(reuniao)}
        onConfirmar={() => onRemover(reuniao.id)}
      />
    </article>
  );
}
