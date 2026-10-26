import { useEquipe } from '../store.js';
import styles from './CardTecnico.module.css';

/*
 * Aviso no lugar dos dados enquanto eles não chegam ou quando a busca falhou:
 * atendimentos em /suporte, chamados em /desenvolvimento (situação em
 * api/acompanharComplementos.js). Com os dados prontos, ou numa página que não
 * busca nada (reuniões), some.
 *
 * @param {{ dados: string, ordem?: number }} props
 *   dados: o que está carregando, no plural ("atendimentos", "chamados")
 */
export default function EstadoCarregamento({ dados, ordem = 1 }) {
  const situacao = useEquipe((s) => s.situacaoComplementos);
  const recarregar = useEquipe((s) => s.recarregarComplementos);

  if (situacao === 'carregando') {
    return (
      <p className={`${styles.estado} ${styles.surge}`} style={{ '--ordem': ordem }} role="status">
        Carregando {dados}…
      </p>
    );
  }

  if (situacao === 'erro') {
    return (
      <div className={`${styles.estado} ${styles.surge}`} style={{ '--ordem': ordem }} role="alert">
        <p>Não foi possível carregar os {dados}.</p>
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

/** Os dados ainda não chegaram (carregando, ou a primeira busca falhou). */
export const useEsperandoDados = () =>
  useEquipe((s) => s.situacaoComplementos === 'carregando' || s.situacaoComplementos === 'erro');
