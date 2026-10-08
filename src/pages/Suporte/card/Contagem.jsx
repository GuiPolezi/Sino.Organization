import { useLayoutEffect, useRef } from 'react';
import { MEDIA, matches } from '../../../utils/media.js';

const formato = new Intl.NumberFormat('pt-BR');
const DURACAO_MS = 900;
// Desacelera no fim, para o número "pousar" no valor.
const suavizar = (t) => 1 - (1 - t) ** 4;

/*
 * Número que conta de zero até o valor quando aparece. O texto é escrito direto
 * no elemento, sem re-render por frame; com movimento reduzido, já nasce no valor.
 */
export default function Contagem({ valor }) {
  const elemento = useRef(null);

  useLayoutEffect(() => {
    const span = elemento.current;
    const final = formato.format(valor);
    if (matches(MEDIA.reducedMotion)) {
      span.textContent = final;
      return undefined;
    }

    span.textContent = '0';
    const inicio = performance.now();
    let quadro = requestAnimationFrame(function avancar(agora) {
      const t = Math.min((agora - inicio) / DURACAO_MS, 1);
      span.textContent = t < 1 ? formato.format(Math.round(valor * suavizar(t))) : final;
      if (t < 1) quadro = requestAnimationFrame(avancar);
    });

    return () => cancelAnimationFrame(quadro);
  }, [valor]);

  // Leitores de tela recebem o valor final, não a contagem.
  return (
    <>
      <span ref={elemento} aria-hidden="true" />
      <span className="sr-only">{formato.format(valor)}</span>
    </>
  );
}
