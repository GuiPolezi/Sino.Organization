import base from '../../Suporte/card/CardTecnico.module.css';
import { atividadeDe, diaEMes } from '../atuacao.js';
import styles from './CardCompilador.module.css';

/**
 * "Atividade Recente": a última ação da pessoa no sistema Legislação Digital
 * (ação, cidade, módulo, data, hora e descrição), já filtrada pelo servidor.
 *
 * @param {{ pessoa: object }} props a pessoa da resposta do servidor
 */
export default function AtividadeRecente({ pessoa }) {
  const atividade = atividadeDe(pessoa);

  return (
    <section className={base.surge} style={{ '--ordem': 4 }}>
      <h3 className={`${base.secao} ${styles.centro}`}>Atividade Recente</h3>
      <div className={styles.atividade}>
        {atividade ? (
          <dl>
            {[
              ['Ação', atividade.acao],
              ['Cidade', atividade.cidade],
              ['Módulo', atividade.modulo],
              ['Data', diaEMes(atividade.data)],
              ['Hora', atividade.hora],
            ].map(([rotulo, valor], i) => (
              <div key={rotulo} style={{ '--i': i }}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
            <div className={styles.descricao} style={{ '--i': 5 }}>
              <dt>Descrição</dt>
              <dd>{atividade.descricao}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.semAtividade}>Sem atividade recente</p>
        )}
      </div>
    </section>
  );
}
