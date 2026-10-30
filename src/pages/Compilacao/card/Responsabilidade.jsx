import { useEffect, useId, useRef, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { RESPONSABILIDADES, rotuloDataHora } from '../atuacao.js';
import styles from './CardCompilador.module.css';

const OPCOES = Object.entries(RESPONSABILIDADES).map(([chave, { rotulo }]) => ({ chave, rotulo }));

// Teclas que a caixa usa e que não podem chegar aos atalhos do card (Esc fecha o card, ← → troca de pessoa).
const TECLAS_DA_CAIXA = ['Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

/**
 * O "Alterar" e a caixa com as responsabilidades, logo abaixo dele. Mesmo padrão
 * do seletor de período de /desenvolvimento (Desenvolvimento/card/SeletorPeriodo.jsx):
 * ↑ ↓ Home End andam entre as opções, Enter ou espaço escolhe, Esc fecha e devolve
 * o foco ao botão, Tab fecha, e um clique fora também fecha.
 *
 * @param {{ atual: string, aoEscolher: (chave: string) => void }} props
 */
function Alterar({ atual, aoEscolher }) {
  const [aberta, setAberta] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);
  const opcoes = useRef([]);
  const id = useId();

  // Ao abrir, o foco vai para a opção de agora; um clique fora fecha a caixa.
  useEffect(() => {
    if (!aberta) return undefined;
    opcoes.current.find((opcao) => opcao?.getAttribute('aria-checked') === 'true')?.focus();

    const fora = (event) => {
      if (!raiz.current.contains(event.target)) setAberta(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    botao.current.focus();
  };

  const escolher = (chave) => {
    fechar();
    if (chave !== atual) aoEscolher(chave);
  };

  const onKeyDownBotao = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    setAberta(true);
  };

  const onKeyDownCaixa = (event) => {
    if (event.key === 'Tab') {
      setAberta(false);
      return;
    }
    if (!TECLAS_DA_CAIXA.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      fechar();
      return;
    }

    const indice = opcoes.current.indexOf(document.activeElement);
    const ultimo = OPCOES.length - 1;
    const destino = {
      ArrowDown: indice === ultimo ? 0 : indice + 1,
      ArrowUp: indice <= 0 ? ultimo : indice - 1,
      Home: 0,
      End: ultimo,
    }[event.key];
    opcoes.current[destino]?.focus();
  };

  return (
    <div ref={raiz} className={styles.seletor}>
      <button
        ref={botao}
        type="button"
        className={styles.alterar}
        aria-haspopup="menu"
        aria-expanded={aberta}
        aria-controls={`${id}-caixa`}
        onClick={() => setAberta((estava) => !estava)}
        onKeyDown={onKeyDownBotao}
      >
        Alterar
      </button>

      {aberta && (
        <ul id={`${id}-caixa`} className={styles.caixa} role="menu" aria-label="Responsabilidade" onKeyDown={onKeyDownCaixa}>
          {OPCOES.map(({ chave, rotulo }, i) => (
            <li key={chave} role="none">
              <button
                ref={(elemento) => {
                  opcoes.current[i] = elemento;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={chave === atual}
                tabIndex={-1}
                style={{ '--ordem': i }}
                onClick={() => escolher(chave)}
              >
                {rotulo}
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

/**
 * "Responsabilidade atual": a palavra grande (Atualizações ou Projetos Novos), a
 * última troca e o "Alterar", que abre a caixa para trocar.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('../atuacao.js').atuacaoDe>} props.atuacao
 * @param {(chave: string) => void} props.escolher
 */
export default function Responsabilidade({ atuacao, escolher }) {
  const { responsabilidade, rotulo, alteradaEm } = atuacao;
  const letras = [...rotulo.toUpperCase()];

  return (
    <section className={`${base.surge} ${styles.responsabilidade}`} style={{ '--ordem': 1 }}>
      <div className={styles.linhaTitulo}>
        <h3 className={base.secao}>Responsabilidade Atual</h3>
        <Alterar atual={responsabilidade} aoEscolher={escolher} />
      </div>

      {/* A key refaz a entrada das letras quando a responsabilidade muda. */}
      <div aria-live="polite">
        <p key={responsabilidade} className={styles.palavra}>
          <span className="sr-only">{rotulo}</span>
          {letras.map((letra, i) => (
            <span key={i} className={styles.letra} style={{ '--i': i }} aria-hidden="true">
              {letra}
            </span>
          ))}
        </p>
      </div>
      <p key={rotuloDataHora(alteradaEm)} className={styles.alteracao}>
        Última Alteração: {rotuloDataHora(alteradaEm)}
      </p>
    </section>
  );
}
