import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../utils/media.js';
import { montarCursor } from './montarCursor.js';
import styles from './Cursor.module.css';

/*
 * Cursor customizado do site inteiro (montado uma vez, em main.jsx).
 * Só liga com mouse/trackpad (MEDIA.hover); em touch o elemento fica oculto.
 * O gsap.matchMedia religa sozinho quando hover ou movimento reduzido mudam.
 *
 * Onde o cursor nativo volta (ver zonas.js e a regra em global.css):
 * - `[data-cursor="nativo"]` (tela do computador da seção Sistemas);
 * - <dialog> modal aberto: ele fica na top layer, acima de qualquer fixed. Em vez
 *   de enfiar este elemento dentro do dialog (que tem backdrop-filter, o que
 *   prenderia o `position: fixed` ao dialog, anima opacidade e pertence ao React
 *   de outro componente), o modal usa o cursor nativo, que sempre fica por cima;
 * - campos de texto, para o I-beam mostrar onde a digitação entra.
 */
export default function Cursor() {
  const raiz = useRef(null);
  const disco = useRef(null);
  const ponto = useRef(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ativo: MEDIA.hover, reduzido: MEDIA.reducedMotion }, ({ conditions }) => {
      if (!conditions.ativo) return undefined;
      return montarCursor({
        raiz: raiz.current,
        disco: disco.current,
        ponto: ponto.current,
        reduzido: conditions.reduzido,
      });
    });
    return () => mm.revert();
  });

  return (
    <div ref={raiz} className={styles.cursor} aria-hidden="true">
      <span ref={disco} className={styles.disco} />
      <span ref={ponto} className={styles.ponto} />
    </div>
  );
}
