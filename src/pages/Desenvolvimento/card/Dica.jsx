import { useLayoutEffect, useRef } from 'react';
import styles from './Dica.module.css';

// Meia largura máxima da dica: o centro dela não chega mais perto da borda que isso.
const MEIA_LARGURA = 84;

// O primeiro ancestral que rola na vertical (o card); o que passar do topo dele fica escondido.
function quemRola(elemento) {
  for (let pai = elemento.parentElement; pai; pai = pai.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(pai).overflowY)) return pai;
  }
  return null;
}

/**
 * Dica que acompanha o ponteiro sobre um gráfico, acima dele e sem sair da
 * largura do gráfico. Os mesmos números estão na tabela de cada gráfico, para
 * leitores de tela.
 *
 * Com `cabeNaTela`, a dica mede o próprio tamanho antes de aparecer: o centro
 * fica a meia largura real da borda e, se não houver espaço acima do ponteiro
 * no card, ela abre abaixo dele (no celular, as dicas altas das primeiras
 * linhas sumiam pelo topo).
 *
 * @param {object} props
 * @param {number} props.x posição do ponteiro na área do gráfico, em px
 * @param {number} props.y
 * @param {number} props.largura largura da área do gráfico, em px
 * @param {string} [props.className] estilo a mais, de quem usa a dica
 * @param {boolean} [props.cabeNaTela]
 * @param {import('react').ReactNode} props.children
 */
export default function Dica({ x, y, largura, className, cabeNaTela = false, children }) {
  const raiz = useRef(null);
  const meia = (valor) => Math.min(Math.max(x, valor), Math.max(largura - valor, valor));

  // Antes de pintar: nada de piscar na posição errada.
  useLayoutEffect(() => {
    const dica = raiz.current;
    if (!cabeNaTela || !dica) return;
    dica.style.left = `${meia(Math.min(dica.offsetWidth / 2, largura / 2))}px`;
    // Onde o ponteiro está na tela e quanto do card se vê acima e abaixo dele.
    const ponteiro = (dica.offsetParent?.getBoundingClientRect().top ?? 0) + y;
    const card = quemRola(dica)?.getBoundingClientRect();
    const espacoAcima = ponteiro - Math.max(card?.top ?? 0, 0);
    const espacoAbaixo = Math.min(card?.bottom ?? window.innerHeight, window.innerHeight) - ponteiro;
    const precisa = dica.offsetHeight + 14;
    // Acima, como sempre; abaixo só se acima não couber e abaixo houver mais espaço.
    if (espacoAcima < precisa && espacoAbaixo > espacoAcima) dica.dataset.abaixo = '';
    else delete dica.dataset.abaixo;
  });

  return (
    <div
      ref={raiz}
      className={className ? `${styles.dica} ${className}` : styles.dica}
      style={{ left: meia(MEIA_LARGURA), top: y }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
