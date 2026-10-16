import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../../utils/media.js';
import { girarAoPassar } from './giroDaEstrela.js';
import styles from './CardDesenvolvedor.module.css';

gsap.registerPlugin(useGSAP);

/*
 * Estrela de quatro pontas, com as pontas e os cantos de dentro arredondados.
 * Coordenadas de -100 a 100, com a origem no centro.
 */
const PONTA = 96;
const MIOLO = 27;
const VERTICES = [
  [0, -PONTA],
  [MIOLO, -MIOLO],
  [PONTA, 0],
  [MIOLO, MIOLO],
  [0, PONTA],
  [-MIOLO, MIOLO],
  [-PONTA, 0],
  [-MIOLO, -MIOLO],
];
// Quanto cada canto é aparado antes da curva: pontas mais redondas que os cantos de dentro.
const RAIO_PONTA = 16;
const RAIO_MIOLO = 9;

// Ponto a `distancia` do vértice, na direção do vizinho.
function rumo([x, y], [vx, vy], distancia) {
  const passo = distancia / Math.hypot(vx - x, vy - y);
  return `${(x + (vx - x) * passo).toFixed(2)} ${(y + (vy - y) * passo).toFixed(2)}`;
}

const CAMINHO = `${VERTICES.map((vertice, i) => {
  const raio = i % 2 === 0 ? RAIO_PONTA : RAIO_MIOLO;
  const anterior = VERTICES.at(i - 1);
  const seguinte = VERTICES[(i + 1) % VERTICES.length];
  return `${i === 0 ? 'M' : 'L'} ${rumo(vertice, anterior, raio)} Q ${vertice.join(' ')} ${rumo(vertice, seguinte, raio)}`;
}).join(' ')} Z`;

/**
 * A estrela no cruzamento dos quatro primeiros cards de status. Entra girando
 * um quarto de volta e gira ao passar o mouse (giroDaEstrela.js). Decorativa:
 * fora da árvore de acessibilidade e sem movimento com prefers-reduced-motion.
 */
export default function Estrela() {
  const raiz = useRef(null);
  const alvo = useRef(null);
  const desenho = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MEDIA.motion, () => {
        gsap.from(raiz.current, { scale: 0.4, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.8)', delay: 0.35 });
        gsap.from(desenho.current, { rotation: -90, duration: 1.1, ease: 'power3.out', delay: 0.35 });
        return girarAoPassar(alvo.current, desenho.current);
      });
    },
    { scope: raiz },
  );

  return (
    <div ref={raiz} className={styles.estrela} aria-hidden="true">
      <svg ref={desenho} viewBox="-100 -100 200 200" focusable="false">
        <path d={CAMINHO} />
      </svg>
      <span ref={alvo} className={styles.estrelaAlvo} />
    </div>
  );
}
