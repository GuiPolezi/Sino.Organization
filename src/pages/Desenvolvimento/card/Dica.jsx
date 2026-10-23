import styles from './Dica.module.css';

// Meia largura máxima da dica: o centro dela não chega mais perto da borda que isso.
const MEIA_LARGURA = 84;

/**
 * Dica que acompanha o mouse sobre um gráfico, acima do ponteiro e sem sair da
 * largura dele. Só para o mouse: os mesmos números estão na tabela de cada
 * gráfico, para leitores de tela.
 *
 * @param {object} props
 * @param {number} props.x posição do ponteiro na área do gráfico, em px
 * @param {number} props.y
 * @param {number} props.largura largura da área do gráfico, em px
 * @param {string} [props.className] estilo a mais, de quem usa a dica
 * @param {import('react').ReactNode} props.children
 */
export default function Dica({ x, y, largura, className, children }) {
  const centro = Math.min(Math.max(x, MEIA_LARGURA), Math.max(largura - MEIA_LARGURA, MEIA_LARGURA));
  return (
    <div className={className ? `${styles.dica} ${className}` : styles.dica} style={{ left: centro, top: y }} aria-hidden="true">
      {children}
    </div>
  );
}
