import { partesDataHora } from './periodos.js';
import styles from './ResumoQuando.module.css';

// Um pedaço de texto que "rola" para o valor novo quando muda.
function Troca({ valor }) {
  return (
    <span className={styles.troca}>
      <span key={valor} className={styles.trocaTexto}>
        {valor}
      </span>
    </span>
  );
}

/**
 * Resumo ao lado da data e da hora: ano, dia da semana / data e o horário,
 * atualizados enquanto o usuário escolhe. Só visual; leitores de tela ouvem
 * uma frase única (aria-live educado).
 *
 * @param {object} props
 * @param {string} props.data 'YYYY-MM-DD' ou ''
 * @param {string} props.inicio 'HH:mm'
 * @param {string} props.fim 'HH:mm'
 */
export default function ResumoQuando({ data, inicio, fim }) {
  const { diaSemana, data: dataBr } = data
    ? partesDataHora({ dataHora: `${data}T${inicio}`, horaFim: fim })
    : { diaSemana: '', data: '' };
  const ano = data ? data.slice(0, 4) : '';

  return (
    <div className={styles.resumo}>
      <p className="sr-only" aria-live="polite">
        {data ? `${diaSemana}, ${dataBr}, das ${inicio} às ${fim}` : 'Escolha a data no calendário'}
      </p>

      <div aria-hidden="true">
        <p className={`${styles.linha} ${styles.ano}`}>
          {ano ? <Troca valor={ano} /> : <span className={styles.vazio}>----</span>}
        </p>
        <p className={styles.linha}>
          {data ? (
            <>
              <Troca valor={diaSemana} />
              <span className={styles.barra}>/</span>
              <Troca valor={dataBr} />
            </>
          ) : (
            <span className={styles.vazio}>Escolha a data no calendário</span>
          )}
        </p>
        <p className={styles.linha}>
          Hora: <Troca valor={inicio} /> às <Troca valor={fim} />
        </p>
      </div>
    </div>
  );
}
