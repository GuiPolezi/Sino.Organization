import { useEffect, useId, useRef, useState } from 'react';
import { MODALIDADES, formatarDataHora, separarReunioes } from './reunioes.js';
import styles from './ReunioesLista.module.css';

const MEMBROS_VISIVEIS = 6;

// Iniciais para o avatar: primeira letra das duas primeiras palavras.
const iniciais = (nome) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

function IconeModalidade({ modalidade }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {modalidade === MODALIDADES.DIGITAL ? (
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

function ReuniaoItem({ reuniao, passada, onRemover }) {
  const [confirmando, setConfirmando] = useState(false);
  const naoBotao = useRef(null);
  const removerBotao = useRef(null);
  const abriuConfirmacao = useRef(false);

  // Foco acompanha a troca entre "Remover" e a confirmação.
  useEffect(() => {
    if (confirmando) naoBotao.current?.focus();
    else if (abriuConfirmacao.current) removerBotao.current?.focus();
  }, [confirmando]);

  const abrir = () => {
    abriuConfirmacao.current = true;
    setConfirmando(true);
  };

  // Esc cancela só a confirmação, sem fechar o modal.
  const onKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    setConfirmando(false);
  };

  const digital = reuniao.modalidade === MODALIDADES.DIGITAL;
  const extras = reuniao.membros.length - MEMBROS_VISIVEIS;

  return (
    <li className={passada ? `${styles.item} ${styles.passada}` : styles.item}>
      <div className={styles.topo}>
        <h4 className={styles.titulo}>{reuniao.titulo}</h4>
        <span className={`${styles.selo} ${digital ? styles.digital : ''}`}>
          <IconeModalidade modalidade={reuniao.modalidade} />
          {digital ? 'Digital' : 'Presencial'}
        </span>
      </div>

      <time className={styles.data} dateTime={reuniao.dataHora}>
        {formatarDataHora(reuniao.dataHora)}
      </time>

      <div className={styles.rodape}>
        {reuniao.membros.length > 0 ? (
          <ul className={styles.membros} aria-label="Membros">
            {reuniao.membros.slice(0, MEMBROS_VISIVEIS).map((membro) => (
              <li key={membro.id} className={styles.membro}>
                <span className={styles.avatar} aria-hidden="true">
                  {iniciais(membro.nome)}
                </span>
                {membro.nome}
              </li>
            ))}
            {extras > 0 && (
              <li
                className={styles.mais}
                title={reuniao.membros
                  .slice(MEMBROS_VISIVEIS)
                  .map((membro) => membro.nome)
                  .join(', ')}
              >
                +{extras}
                <span className="sr-only"> membros</span>
              </li>
            )}
          </ul>
        ) : (
          <span className={styles.semMembros}>Sem membros</span>
        )}

        {confirmando ? (
          <div
            className={styles.confirmacao}
            role="group"
            aria-label={`Remover a reunião ${reuniao.titulo}?`}
            onKeyDown={onKeyDown}
          >
            <span className={styles.pergunta} aria-hidden="true">
              Remover?
            </span>
            <button
              type="button"
              className={styles.sim}
              onClick={() => onRemover(reuniao.id)}
            >
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
        ) : (
          <button
            ref={removerBotao}
            type="button"
            className={styles.remover}
            aria-label={`Remover a reunião ${reuniao.titulo}`}
            onClick={abrir}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
            <span className={styles.removerTexto}>Remover</span>
          </button>
        )}
      </div>
    </li>
  );
}

function Grupo({ titulo, reunioes, passada = false, onRemover }) {
  const tituloId = useId();

  return (
    <section className={styles.grupo} aria-labelledby={tituloId}>
      <h4 id={tituloId} className={styles.grupoTitulo}>
        {titulo} <span className={styles.contagem}>{reunioes.length}</span>
      </h4>
      <ul className={styles.lista}>
        {reunioes.map((reuniao) => (
          <ReuniaoItem
            key={reuniao.id}
            reuniao={reuniao}
            passada={passada}
            onRemover={onRemover}
          />
        ))}
      </ul>
    </section>
  );
}

// Histórico de reuniões: próximas e anteriores, ou o estado vazio.
export default function ReunioesLista({ reunioes, onRemover }) {
  if (reunioes.length === 0) {
    return <p className={styles.vazio}>Nenhuma Reunião no histórico</p>;
  }

  const { proximas, passadas } = separarReunioes(reunioes, new Date());
  const ambas = proximas.length > 0 && passadas.length > 0;

  return (
    <div className={styles.rolagem} data-modal-scroll tabIndex={0} aria-label="Histórico de reuniões">
      {ambas ? (
        <>
          <Grupo titulo="Próximas" reunioes={proximas} onRemover={onRemover} />
          <Grupo titulo="Anteriores" reunioes={passadas} passada onRemover={onRemover} />
        </>
      ) : (
        <ul className={styles.lista}>
          {reunioes.map((reuniao) => (
            <ReuniaoItem
              key={reuniao.id}
              reuniao={reuniao}
              passada={proximas.length === 0}
              onRemover={onRemover}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
