import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useEffect, useId, useRef } from 'react';
import { MEDIA, matches } from '../../../utils/media.js';
import { PERIODOS } from '../mappers/chamados.js';
import styles from './CardQuadro.module.css';

gsap.registerPlugin(useGSAP);

// Como no design do quadro: "07 Dias", com o zero. No card da categoria, sem ele.
const rotuloDe = ({ id, rotulo }, emLinha) => (id === '7d' && !emLinha ? '07 Dias' : rotulo);

/**
 * Período do painel do quadro: uma pílula por opção, todas à vista. A escolhida
 * fica sob um marcador oliva que desliza de uma pílula à outra; dentro dele vai
 * uma cópia clara dos rótulos, que anda ao contrário do marcador para ficar
 * sempre alinhada às pílulas de baixo. Assim, o texto clareia por onde o
 * marcador passa.
 *
 * @param {object} props
 * @param {import('../mappers/chamados.js').Periodo} props.periodo
 * @param {(periodo: import('../mappers/chamados.js').Periodo) => void} props.onMudar
 * @param {boolean} [props.emLinha] rótulo à esquerda das pílulas, numa linha só (card da categoria)
 */
export default function PeriodoEmPilulas({ periodo, onMudar, emLinha = false }) {
  const grupo = useRef(null);
  const marcador = useRef(null);
  const copia = useRef(null);
  const posicionado = useRef(false);
  const id = useId();

  const posicionar = (animar) => {
    // Um aviso de tamanho pode chegar depois de o painel fechar.
    if (!grupo.current) return;
    const escolhida = grupo.current.querySelector('[aria-pressed="true"]');
    const { offsetLeft: x, offsetTop: y, offsetWidth: width, offsetHeight: height } = escolhida;
    const movimento = animar ? { duration: 0.55, ease: 'power3.inOut' } : { duration: 0 };
    gsap.to(marcador.current, { x, y, width, height, ...movimento, overwrite: true });
    gsap.to(copia.current, { x: -x, y: -y, width: grupo.current.clientWidth, ...movimento, overwrite: true });
  };

  useGSAP(
    () => {
      posicionar(posicionado.current && matches(MEDIA.motion));
      posicionado.current = true;
    },
    { dependencies: [periodo], scope: grupo },
  );

  // As pílulas mudam de tamanho quando a fonte carrega ou a tela muda: o marcador vai junto, sem animar.
  useEffect(() => {
    const observador = new ResizeObserver(() => posicionar(false));
    observador.observe(grupo.current);
    grupo.current.querySelectorAll('button').forEach((botao) => observador.observe(botao));
    return () => observador.disconnect();
    // posicionar só lê as refs, então a primeira versão serve para sempre.
  }, []);

  return (
    <div className={styles.periodo} data-em-linha={emLinha || undefined}>
      <h3 id={`${id}-rotulo`} className={styles.periodoRotulo}>
        Período
      </h3>
      <div ref={grupo} className={styles.pilulas} role="group" aria-labelledby={`${id}-rotulo`}>
        {PERIODOS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            className={styles.pilula}
            aria-pressed={opcao.id === periodo}
            onClick={() => onMudar(opcao.id)}
          >
            {rotuloDe(opcao, emLinha)}
          </button>
        ))}
        <span ref={marcador} className={styles.marcador} aria-hidden="true">
          <span ref={copia} className={styles.copia}>
            {PERIODOS.map((opcao) => (
              <span key={opcao.id} className={styles.pilula}>
                {rotuloDe(opcao, emLinha)}
              </span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}
