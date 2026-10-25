import { useEffect, useRef, useState } from 'react';
import { identificar, iniciais, matiz, useEquipes } from './MembrosAvatares.jsx';
import { useRetratoReuniao } from './RetratosReunioes.jsx';
import SelecaoPersonagens from './selecao/SelecaoPersonagens.jsx';
import styles from './MembrosEscolha.module.css';

// Tempo da animação de saída antes de tirar o membro da lista.
const SAIDA_MS = 220;

function Membro({ membro, onRemover }) {
  useEquipes(); // muda o boneco quando as equipes chegarem da API
  const { id, cargo } = identificar(membro);
  const url = useRetratoReuniao(id);
  const [carregado, setCarregado] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const espera = useRef(null);
  // Se o formulário fechar no meio da saída, o timer não dispara depois.
  useEffect(() => () => clearTimeout(espera.current), []);

  const remover = () => {
    if (saindo) return;
    setSaindo(true);
    espera.current = setTimeout(onRemover, SAIDA_MS);
  };

  return (
    <li className={styles.membro} data-saindo={saindo || undefined}>
      <span className={styles.avatar} style={{ '--matiz': matiz(id) }} data-pronto={carregado || undefined}>
        <span className={styles.iniciais} aria-hidden="true">
          {iniciais(membro.nome)}
        </span>
        {url && (
          <img
            className={styles.retrato}
            src={url}
            alt=""
            draggable="false"
            decoding="async"
            onLoad={() => setCarregado(true)}
          />
        )}
      </span>

      <span className={styles.dica} aria-hidden="true">
        <span className={styles.dicaNome}>{membro.nome}</span>
        {cargo && <span className={styles.dicaCargo}>{cargo}</span>}
      </span>

      <button
        type="button"
        className={styles.remover}
        aria-label={`Remover ${membro.nome}`}
        onClick={remover}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M7 7l10 10M17 7L7 17" />
        </svg>
      </button>
    </li>
  );
}

/**
 * Membros da nova reunião: botão "+" e os avatares escolhidos.
 *
 * O "+" abre o modal de seleção de personagens (selecao/SelecaoPersonagens).
 *
 * @param {object} props
 * @param {{ id: string, nome: string }[]} props.membros
 * @param {(atualizar: (atuais: { id: string, nome: string }[]) => { id: string, nome: string }[]) => void} props.onChange
 *   recebe uma função de atualização (como o setState do React)
 * @param {string} [props.erro]
 * @param {string} [props.erroId]
 */
export default function MembrosEscolha({ membros, onChange, erro, erroId }) {
  const [aberto, setAberto] = useState(false);
  const mais = useRef(null);

  return (
    <div className={styles.secao}>
      <p className={styles.cabecalho}>
        <span>Membros</span>
        <span className={styles.contagem} aria-live="polite">
          <span key={membros.length} className={styles.contagemNumero}>
            {membros.length}
          </span>
        </span>
      </p>

      <ul className={styles.lista} aria-label="Membros da reunião">
        <li className={styles.maisItem}>
          <button
            ref={mais}
            type="button"
            className={styles.mais}
            aria-label="Adicionar membros"
            aria-haspopup="dialog"
            aria-expanded={aberto}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? erroId : undefined}
            onClick={() => setAberto((a) => !a)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {aberto && (
            <SelecaoPersonagens
              membros={membros}
              onChange={onChange}
              onFechar={() => {
                setAberto(false);
                mais.current?.focus();
              }}
              ancora={mais}
            />
          )}
        </li>

        {membros.map((membro) => (
          <Membro
            key={membro.id}
            membro={membro}
            // Funcional: a remoção acontece depois da animação, com a lista já atualizada.
            onRemover={() => onChange((atuais) => atuais.filter((m) => m.id !== membro.id))}
          />
        ))}
      </ul>

      {erro && (
        <p id={erroId} className={styles.erro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
