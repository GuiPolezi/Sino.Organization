import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { rotuloAtualizacao } from '../../Suporte/card/rotuloAtualizacao.js';
import { PERIODOS, PERIODO_INICIAL, aguardandoDe, barraDoProjeto, normasDoPeriodo, numeroOuTraco } from '../atuacao.js';
import styles from './CardCompilador.module.css';
import Numero from './Numero.jsx';

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
 * "Normas": o total compilado no período escolhido (com a fonte do número), os
 * tipos (os seis da grade e "Outros"), o que aguarda compilação e, em Projetos
 * Novos, a barra do projeto. Os números contam até o valor novo ao trocar de período.
 *
 * @param {{
 *   pessoa: object,
 *   referencia: string | undefined,
 *   hoje: string,
 *   geradoEm: string | null,
 *   nomeDe: (id: string) => string,
 * }} props
 */
export default function Normas({ pessoa, referencia, hoje, geradoEm, nomeDe }) {
  const [periodo, setPeriodo] = useState(PERIODO_INICIAL);
  const { total, legenda, porTipo } = useMemo(
    () => normasDoPeriodo(pessoa, periodo, { referencia, hoje }),
    [pessoa, periodo, referencia, hoje],
  );
  const grade = porTipo.filter(({ chave }) => chave !== 'outros');
  const outros = porTipo.find(({ chave }) => chave === 'outros');
  const aguardando = aguardandoDe(pessoa);
  const barra = barraDoProjeto(pessoa);

  return (
    <section className={base.surge} style={{ '--ordem': 3 }}>
      <h3 className={`${base.secao} ${styles.centro}`}>Normas</h3>
      <Periodos valor={periodo} aoMudar={setPeriodo} />

      <p className={styles.total}>
        <strong>
          <Numero valor={total} mais />
        </strong>
        <span>
          {total === 1 ? 'Norma' : 'Normas'}
          <br />
          {total === 1 ? 'Compilada' : 'Compiladas'}
        </span>
      </p>
      {legenda && <p className={styles.legenda}>{legenda}</p>}

      <div className={styles.grade}>
        <span className={`${styles.linha} ${styles.linhaDeitada}`} aria-hidden="true" />
        {LINHAS_EM_PE.map((x) => (
          <span key={x} className={`${styles.linha} ${styles.linhaEmPe}`} style={{ '--x': x }} aria-hidden="true" />
        ))}
        <dl>
          {grade.map(({ chave, rotulo, valor }) => (
            <div key={chave}>
              <dt>{rotulo}</dt>
              <dd>
                <Numero valor={valor} mais />
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {outros && (
        <p className={styles.outros}>
          Outros <b>{typeof outros.valor === 'number' ? `+${numeroOuTraco(outros.valor)}` : '—'}</b>
        </p>
      )}

      <p className={styles.fila}>
        <strong>
          <Numero valor={aguardando.valor} />
        </strong>
        <span>Aguardando Compilação</span>
      </p>
      <p className={styles.legenda}>
        {aguardando.legenda}
        {aguardando.divididaCom.length > 0 && ` · dividida com ${aguardando.divididaCom.map(nomeDe).join(' e ')}`}
      </p>

      {barra && (
        <div className={styles.barra}>
          <p>
            <span>
              {numeroOuTraco(barra.compiladas)} de {numeroOuTraco(barra.total)} compiladas
            </span>
            <span>{barra.parte.toLocaleString('pt-BR')}%</span>
          </p>
          <div
            role="progressbar"
            aria-label="Normas do projeto já compiladas"
            aria-valuemin={0}
            aria-valuemax={barra.total}
            aria-valuenow={barra.compiladas}
            style={{ '--parte': barra.parte }}
          >
            <i />
          </div>
        </div>
      )}

      {geradoEm && <p className={styles.selo}>{rotuloAtualizacao(geradoEm)}</p>}
    </section>
  );
}
