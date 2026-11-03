import base from '../../Suporte/card/CardTecnico.module.css';
import styles from './CardCompilador.module.css';

/**
 * "Responsabilidade atual": a palavra grande (Atualizações ou Projetos Novos) e,
 * embaixo, desde quando a pessoa está no projeto (Projetos) ou de que mês é a
 * planilha (Atualizações). A função é fixa por configuração: não muda pelo site.
 *
 * @param {{ atuacao: NonNullable<ReturnType<typeof import('../atuacao.js').atuacaoDe>> }} props
 */
export default function Responsabilidade({ atuacao }) {
  const { responsabilidade, rotulo, linha } = atuacao;
  const letras = [...rotulo.toUpperCase()];

  return (
    <section className={`${base.surge} ${styles.responsabilidade}`} style={{ '--ordem': 1 }}>
      <div className={styles.linhaTitulo}>
        <h3 className={base.secao}>Responsabilidade Atual</h3>
      </div>

      {/* A key refaz a entrada das letras ao trocar de pessoa com outra responsabilidade. */}
      <p key={responsabilidade} className={styles.palavra}>
        <span className="sr-only">{rotulo}</span>
        {letras.map((letra, i) => (
          <span key={i} className={styles.letra} style={{ '--i': i }} aria-hidden="true">
            {letra}
          </span>
        ))}
      </p>
      <p className={styles.alteracao}>{linha}</p>
    </section>
  );
}
