import { useEquipe } from '../store.js';
import styles from './CardTecnico.module.css';

/*
 * Aviso no lugar dos atendimentos enquanto eles não chegam ou quando a busca
 * falhou, no card do técnico e no painel do quadro. Com os dados prontos, some.
 */
export default function EstadoAtendimentos() {
  const situacao = useEquipe((s) => s.situacaoAtendimentos);
  const recarregar = useEquipe((s) => s.recarregarAtendimentos);

  if (situacao === 'carregando') {
    return (
      <p className={`${styles.estado} ${styles.surge}`} style={{ '--ordem': 1 }} role="status">
        Carregando atendimentos…
      </p>
    );
  }

  if (situacao === 'erro') {
    return (
      <div className={`${styles.estado} ${styles.surge}`} style={{ '--ordem': 1 }} role="alert">
        <p>Não foi possível carregar os atendimentos.</p>
        {recarregar && (
          <button type="button" onClick={recarregar}>
            Tentar de novo
          </button>
        )}
      </div>
    );
  }

  return null;
}
