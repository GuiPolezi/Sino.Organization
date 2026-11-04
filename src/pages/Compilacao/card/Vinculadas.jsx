import base from '../../Suporte/card/CardTecnico.module.css';
import { vinculadasDe } from '../atuacao.js';
import styles from './CardCompilador.module.css';
import Numero from './Numero.jsx';

/**
 * "Normas" de quem está finalizando um projeto: só as normas vinculadas da cidade,
 * num número grande que conta até o valor. As ações de quem finaliza não contam,
 * então não há períodos, tipos nem fila.
 *
 * @param {{ pessoa: object }} props
 */
export default function Vinculadas({ pessoa }) {
  const { valor, rotulo, legenda } = vinculadasDe(pessoa);

  return (
    <section className={base.surge} style={{ '--ordem': 3 }}>
      <h3 className={`${base.secao} ${styles.centro}`}>Normas</h3>
      <p className={styles.vinculadas}>
        <strong>
          <Numero valor={valor} />
        </strong>
        <span>{rotulo}</span>
      </p>
      {legenda && <p className={styles.legendaVinculadas}>{legenda}</p>}
    </section>
  );
}
