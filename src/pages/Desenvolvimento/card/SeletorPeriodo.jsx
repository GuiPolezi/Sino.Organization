import { useEffect, useId, useRef, useState } from 'react';
import { PERIODOS } from '../mappers/chamados.js';
import styles from './CardDesenvolvedor.module.css';

// Teclas que o menu usa e que não podem chegar aos atalhos do card (Esc fecha o card, ← → troca de pessoa).
const TECLAS_DO_MENU = ['Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

/**
 * Pílula do período: ao clicar, abre o menu com as opções. Menu de botões de
 * rádio (padrão "menu button" da WAI-ARIA): ↑ ↓ Home End andam entre as opções,
 * Enter ou espaço escolhe, Esc fecha e devolve o foco à pílula, e Tab fecha e
 * segue para o próximo elemento.
 *
 * @param {object} props
 * @param {import('../mappers/chamados.js').Periodo} props.periodo
 * @param {(periodo: import('../mappers/chamados.js').Periodo) => void} props.onMudar
 */
export default function SeletorPeriodo({ periodo, onMudar }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);
  const opcoes = useRef([]);
  const id = useId();
  const atual = PERIODOS.find((opcao) => opcao.id === periodo) ?? PERIODOS[0];

  // Ao abrir, o foco vai para a opção escolhida; um clique fora fecha o menu.
  useEffect(() => {
    if (!aberto) return undefined;
    opcoes.current.find((opcao) => opcao?.getAttribute('aria-checked') === 'true')?.focus();

    const fora = (event) => {
      if (!raiz.current.contains(event.target)) setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  const fechar = () => {
    setAberto(false);
    botao.current.focus();
  };

  const escolher = (opcao) => {
    onMudar(opcao.id);
    fechar();
  };

  const onKeyDownBotao = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    setAberto(true);
  };

  const onKeyDownMenu = (event) => {
    if (event.key === 'Tab') {
      setAberto(false);
      return;
    }
    if (!TECLAS_DO_MENU.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      fechar();
      return;
    }

    const indice = opcoes.current.indexOf(document.activeElement);
    const ultimo = PERIODOS.length - 1;
    const destino = {
      ArrowDown: indice === ultimo ? 0 : indice + 1,
      ArrowUp: indice <= 0 ? ultimo : indice - 1,
      Home: 0,
      End: ultimo,
    }[event.key];
    opcoes.current[destino]?.focus();
  };

  return (
    <div ref={raiz} className={styles.periodo}>
      <span id={`${id}-rotulo`}>Período:</span>
      <button
        ref={botao}
        id={`${id}-botao`}
        type="button"
        className={styles.periodoBotao}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={`${id}-menu`}
        aria-labelledby={`${id}-rotulo ${id}-botao`}
        onClick={() => setAberto((estava) => !estava)}
        onKeyDown={onKeyDownBotao}
      >
        {atual.rotulo}
        <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>

      {aberto && (
        <ul
          id={`${id}-menu`}
          className={styles.periodoMenu}
          role="menu"
          aria-labelledby={`${id}-rotulo`}
          onKeyDown={onKeyDownMenu}
        >
          {PERIODOS.map((opcao, i) => (
            <li key={opcao.id} role="none">
              <button
                ref={(elemento) => {
                  opcoes.current[i] = elemento;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={opcao.id === atual.id}
                tabIndex={-1}
                style={{ '--ordem': i }}
                onClick={() => escolher(opcao)}
              >
                {opcao.rotulo}
                <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                  <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
