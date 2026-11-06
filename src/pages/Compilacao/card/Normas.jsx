import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import base from '../../Suporte/card/CardTecnico.module.css';
import { rotuloAtualizacao } from '../../Suporte/card/rotuloAtualizacao.js';
import { PERIODOS, PERIODO_INICIAL, normasDoPeriodo, numeroOuTraco } from '../atuacao.js';
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

/*
 * Por cima da seção desativada (Projetos Novos - Sem normas): o aviso, num véu
 * claro. Fica sempre na página para entrar e sair com animação; escondido, não
 * chega ao leitor de tela.
 */
function Desativado({ ativo }) {
  return (
    <div className={styles.desativado} data-ativo={ativo} aria-hidden={!ativo}>
      <div>
        <p className={styles.carimbo}>Desativado</p>
        <p className={styles.motivo}>Profissionais com a situação “Sem Normas” possuem essa seção Desativada.</p>
      </div>
    </div>
  );
}

/**
 * "Normas": o total compilado no período escolhido (com a fonte do número), os
 * tipos (os seis da grade e "Outros"). Os números contam até o valor novo ao trocar de período.
 * Desativada (Sem normas), tudo fica desfocado e sem clique, com o aviso por cima.
 *
 * @param {{
 *   pessoa: object,
 *   referencia: string | undefined,
 *   hoje: string,
 *   geradoEm: string | null,
 *   desativada?: boolean,
 * }} props
 */
export default function Normas({ pessoa, referencia, hoje, geradoEm, desativada = false }) {
  const [periodo, setPeriodo] = useState(PERIODO_INICIAL);
  const { total, legenda, porTipo } = useMemo(
    () => normasDoPeriodo(pessoa, periodo, { referencia, hoje }),
    [pessoa, periodo, referencia, hoje],
  );
  const grade = porTipo.filter(({ chave }) => chave !== 'outros');
  const outros = porTipo.find(({ chave }) => chave === 'outros');

  return (
    <section className={`${base.surge} ${styles.normas}`} style={{ '--ordem': 3 }} aria-label="Normas">
      <div className={styles.conteudoNormas} data-desativada={desativada} inert={desativada}>
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

        {geradoEm && <p className={styles.selo}>{rotuloAtualizacao(geradoEm)}</p>}
      </div>
      <Desativado ativo={desativada} />
    </section>
  );
}
