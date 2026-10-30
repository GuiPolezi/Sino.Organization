import { useRef, useState } from 'react';
import GlassModal from '../../../components/Modal/GlassModal.jsx';
import { RESPONSABILIDADES } from '../atuacao.js';
import styles from './CardCompilador.module.css';

const ICONES = {
  // Setas em volta: manter em dia.
  atualizacoes: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  ),
  // Folha com "+": uma cidade nova.
  projetos: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  ),
};

/**
 * O modal do "Alterar": as duas responsabilidades, com a de agora marcada. A
 * escolha marca a opção na hora, o modal sai com a animação dele e só então o
 * card troca (aoEscolher), para a troca acontecer à vista.
 *
 * @param {object} props
 * @param {string} props.nome
 * @param {string} props.atual chave em RESPONSABILIDADES
 * @param {(chave: string) => void} props.aoEscolher só quando muda
 * @param {() => void} props.aoFechar
 */
export default function ModalResponsabilidade({ nome, atual, aoEscolher, aoFechar }) {
  const [marcada, setMarcada] = useState(atual);
  // A escolha também num ref: o "close" do <dialog> pode chegar antes do novo render.
  const escolhida = useRef(atual);
  const primeiroNome = nome.split(' ')[0];

  const fechou = () => {
    aoFechar();
    if (escolhida.current !== atual) aoEscolher(escolhida.current);
  };

  return (
    <GlassModal tag={nome} title="Responsabilidade" className={styles.modal} onClose={fechou}>
      {(fechar) => (
        <>
          <p className={styles.modalTexto} data-modal="item">
            No que {primeiroNome} está trabalhando agora?
          </p>
          <div className={styles.opcoes}>
            {Object.entries(RESPONSABILIDADES).map(([chave, { rotulo, descricao }]) => (
              <button
                key={chave}
                type="button"
                className={styles.opcao}
                aria-pressed={chave === marcada}
                data-modal="item"
                onClick={() => {
                  escolhida.current = chave;
                  setMarcada(chave);
                  fechar();
                }}
              >
                <span className={styles.icone}>{ICONES[chave]}</span>
                <span>
                  <strong>{rotulo}</strong>
                  <small>{descricao}</small>
                </span>
                <span className={styles.marcador} aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </GlassModal>
  );
}
