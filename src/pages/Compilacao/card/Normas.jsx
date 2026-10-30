import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import Contagem from '../../Suporte/card/Contagem.jsx';
import { PERIODOS, normasDoPeriodo } from '../atuacao.js';
import styles from './CardCompilador.module.css';

// As duas linhas em pé da grade 3 × 2 (a deitada passa no meio).
const LINHAS_EM_PE = ['33.333%', '66.667%'];

/*
 * Os botões de período, com a pílula escura que desliza até o escolhido. A
 * posição sai do botão marcado (offsetLeft, que não sente a animação de entrada
 * do card) e é medida de novo se o card muda de largura.
 */
function Periodos({ valor, aoMudar }) {
  const grupo = useRef(null);
  const [pilula, setPilula] = useState(null);

  useLayoutEffect(() => {
    const medir = () => {
      const marcado = grupo.current?.querySelector('[aria-pressed="true"]');
      if (marcado) setPilula({ x: marcado.offsetLeft, w: marcado.offsetWidth });
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(grupo.current);
    return () => observador.disconnect();
  }, [valor]);

  return (
    <div ref={grupo} className={styles.periodos} role="group" aria-label="Período">
      <span
        className={styles.pilula}
        aria-hidden="true"
        style={pilula ? { '--x': `${pilula.x}px`, '--w': `${pilula.w}px` } : { opacity: 0 }}
      />
      {PERIODOS.map(({ chave, rotulo }) => (
        <button key={chave} type="button" aria-pressed={chave === valor} onClick={() => aoMudar(chave)}>
          {rotulo}
        </button>
      ))}
    </div>
  );
}

/**
 * "Normas": o total compilado no período escolhido, os seis tipos e quantas
 * esperam na fila. Os números contam até o valor novo ao trocar de período.
 *
 * @param {{ id: string, hoje: string, emFila: number }} props
 */
export default function Normas({ id, hoje, emFila }) {
  const [periodo, setPeriodo] = useState(PERIODOS[0].chave);
  const { total, porTipo } = useMemo(
    () => normasDoPeriodo(id, hoje, PERIODOS.find(({ chave }) => chave === periodo).dias),
    [id, hoje, periodo],
  );

  return (
    <section className={base.surge} style={{ '--ordem': 3 }}>
      <h3 className={`${base.secao} ${styles.centro}`}>Normas</h3>
      <Periodos valor={periodo} aoMudar={setPeriodo} />

      <p className={styles.total}>
        <strong>
          +<Contagem valor={total} />
        </strong>
        <span>
          {total === 1 ? 'Norma' : 'Normas'}
          <br />
          {total === 1 ? 'Compilada' : 'Compiladas'}
        </span>
      </p>

      <div className={styles.grade}>
        <span className={`${styles.linha} ${styles.linhaDeitada}`} aria-hidden="true" />
        {LINHAS_EM_PE.map((x) => (
          <span key={x} className={`${styles.linha} ${styles.linhaEmPe}`} style={{ '--x': x }} aria-hidden="true" />
        ))}
        <dl>
          {porTipo.map(({ chave, rotulo, valor }) => (
            <div key={chave}>
              <dt>{rotulo}</dt>
              <dd>
                +<Contagem valor={valor} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className={styles.fila}>
        <strong>
          +<Contagem valor={emFila} />
        </strong>
        <span>Aguardando Compilação</span>
      </p>
    </section>
  );
}
