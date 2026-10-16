import { useLayoutEffect, useRef } from 'react';
import { MEDIA, matches } from '../../../utils/media.js';

const formato = new Intl.NumberFormat('pt-BR');
const DURACAO_MS = 900;
// Desacelera no fim, para o número "pousar" no valor.
const suavizar = (t) => 1 - (1 - t) ** 4;

/*
 * Número que conta de zero até o valor quando aparece e, quando o valor muda,
 * do número da tela até o novo. O texto é escrito direto no elemento, sem
 * re-render por frame; com movimento reduzido, já nasce no valor.
 */
export default function Contagem({ valor }) {
  const elemento = useRef(null);
  // O número na tela agora, de onde parte a próxima contagem.
  const mostrado = useRef(0);

  useLayoutEffect(() => {
    const span = elemento.current;
    const final = formato.format(valor);
    if (matches(MEDIA.reducedMotion)) {
      span.textContent = final;
      mostrado.current = valor;
      return undefined;
    }

    const partida = mostrado.current;
    span.textContent = formato.format(partida);
    const inicio = performance.now();
    let quadro = requestAnimationFrame(function avancar(agora) {
      const t = Math.min((agora - inicio) / DURACAO_MS, 1);
      mostrado.current = t < 1 ? Math.round(partida + (valor - partida) * suavizar(t)) : valor;
      span.textContent = t < 1 ? formato.format(mostrado.current) : final;
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
