import { useEffect, useId, useRef, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { OPCOES_DE_RESPONSABILIDADE } from '../atuacao.js';
import styles from './CardCompilador.module.css';

// Teclas que a caixa usa e que não podem chegar aos atalhos do card (Esc fecha o card, ← → troca de pessoa).
const TECLAS_DA_CAIXA = ['Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

/**
 * O "Alterar" e a caixa com as responsabilidades, logo abaixo dele: ↑ ↓ Home End
 * andam entre as opções, Enter ou espaço escolhe, Esc fecha e devolve o foco ao
 * botão, Tab fecha, e um clique fora também fecha. Enquanto a troca vai ao
 * servidor, o botão diz "Salvando…" e não abre.
 *
 * @param {{ atual: string, salvando: boolean, aoEscolher: (chave: string) => void }} props
 */
function Alterar({ atual, salvando, aoEscolher }) {
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
      if (!raiz.current?.contains(event.target)) setAberta(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    botao.current?.focus();
  };

  const escolher = (chave) => {
    fechar();
    if (chave !== atual) aoEscolher(chave);
  };

  const onKeyDownBotao = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    event.stopPropagation();
    if (!salvando) setAberta(true);
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
    const ultimo = OPCOES_DE_RESPONSABILIDADE.length - 1;
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
        aria-disabled={salvando || undefined}
        onClick={() => !salvando && setAberta((estava) => !estava)}
        onKeyDown={onKeyDownBotao}
      >
        {/* A key refaz a entrada do texto ao trocar; a largura é sempre a de "Salvando…" (CSS). */}
        <span key={salvando ? 'salvando' : 'alterar'}>{salvando ? 'Salvando…' : 'Alterar'}</span>
      </button>

      {/* Sempre na página, para abrir e fechar com animação; fechada, não recebe foco nem leitor de tela. */}
      <ul
        id={`${id}-caixa`}
        className={styles.caixa}
        data-aberta={aberta}
        inert={!aberta}
        role="menu"
        aria-label="Responsabilidade"
        onKeyDown={onKeyDownCaixa}
      >
        {OPCOES_DE_RESPONSABILIDADE.map(({ chave, palavra, situacao }, i) => (
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
              <span className={styles.opcao}>
                {palavra}
                {situacao && (
                  <span className={styles.detalhe} data-tom={situacao.tom}>
                    <span className="sr-only"> - </span>
                    {situacao.texto}
                  </span>
                )}
              </span>
              <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Responsabilidade Atual": a palavra grande (Atualizações ou Projetos Novos), a
 * situação nos Projetos que têm uma (Finalizando, Sem normas), a linha da direita
 * (última alteração, ou desde quando / de que planilha) e o "Alterar".
 *
 * @param {{
 *   atuacao: NonNullable<ReturnType<typeof import('../atuacao.js').atuacaoDe>>,
 *   salvando: boolean,
 *   falha: string | null,
 *   aoEscolher: (chave: string) => void,
 * }} props
 */
export default function Responsabilidade({ atuacao, salvando, falha, aoEscolher }) {
  const { responsabilidade, rotulo, situacao, linha } = atuacao;
  const letras = [...rotulo.toUpperCase()];

  return (
    <section className={`${base.surge} ${styles.responsabilidade}`} style={{ '--ordem': 1 }} aria-busy={salvando || undefined}>
      <div className={styles.linhaTitulo}>
        <h3 className={base.secao}>Responsabilidade Atual</h3>
        <Alterar atual={responsabilidade} salvando={salvando} aoEscolher={aoEscolher} />
      </div>

      {/* As keys refazem as entradas quando a responsabilidade muda (aqui ou por outra pessoa). */}
      <div aria-live="polite">
        <p key={responsabilidade} className={styles.palavra}>
          <span className="sr-only">{rotulo}</span>
          {letras.map((letra, i) => (
            <span key={i} className={styles.letra} style={{ '--i': i }} aria-hidden="true">
              {letra}
            </span>
          ))}
        </p>
        <div className={styles.rodapeResponsabilidade}>
          {situacao && (
            <p key={situacao.tom} className={styles.situacao} data-tom={situacao.tom}>
              <b>Situação:</b> <span>{situacao.texto}</span>
            </p>
          )}
          <p key={linha} className={styles.alteracao}>
            {linha}
          </p>
        </div>
      </div>

      {falha && (
        <p className={styles.falha} role="alert">
          {falha}
        </p>
      )}
    </section>
  );
}
