import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MEDIA, matches } from '../../../utils/media.js';
import styles from './CardCompilador.module.css';

// O tempo da troca de altura; a saída do conteúdo velho (CSS) é um pouco mais curta.
const DURACAO_MS = 520;

/**
 * Troca um conteúdo por outro quando a `chave` muda: o velho se apaga por cima
 * (sem empurrar nada) enquanto o novo entra, e a altura vai de um ao outro sem
 * pulo, levando junto as seções de baixo. Com a mesma chave, é só o conteúdo.
 * Com movimento reduzido, troca na hora.
 *
 * @param {{ chave: string, children: import('react').ReactNode }} props
 */
export default function Troca({ chave, children }) {
  const [vista, setVista] = useState(chave);
  const [saindo, setSaindo] = useState(null);
  // Depois da primeira troca, todo conteúdo que entra usa a entrada curta (e não a do card abrindo).
  const [trocou, setTrocou] = useState(false);
  // O conteúdo da última vez que apareceu na tela: é ele que sai.
  const ultimo = useRef(children);
  const caixa = useRef(null);
  const velho = useRef(null);
  const novo = useRef(null);

  // Estado derivado: a chave mudou neste render.
  if (chave !== vista) {
    setVista(chave);
    setTrocou(true);
    setSaindo(matches(MEDIA.reducedMotion) ? null : { chave: vista, conteudo: ultimo.current });
  }

  useEffect(() => {
    ultimo.current = children;
  });

  // A altura sai da do velho e vai até a do novo; no fim, volta a ser a natural.
  useLayoutEffect(() => {
    const elemento = caixa.current;
    if (!saindo || !elemento || !velho.current || !novo.current) return undefined;
    const de = velho.current.offsetHeight;
    const para = novo.current.offsetHeight;
    if (de === para) return undefined;

    elemento.style.height = `${de}px`;
    // Lê a altura para o navegador registrar o ponto de partida antes de mudar.
    void elemento.offsetHeight;
    elemento.dataset.altura = 'true';
    elemento.style.height = `${para}px`;
    const soltar = () => {
      delete elemento.dataset.altura;
      elemento.style.height = '';
    };
    const timer = setTimeout(soltar, DURACAO_MS + 80);
    return () => {
      clearTimeout(timer);
      soltar();
    };
  }, [saindo]);

  // Garantia: se a animação de saída não terminar (aba em segundo plano), o velho sai mesmo assim.
  useEffect(() => {
    if (!saindo) return undefined;
    const timer = setTimeout(() => setSaindo(null), DURACAO_MS + 400);
    return () => clearTimeout(timer);
  }, [saindo]);

  const terminouDeSair = (event) => {
    if (event.target === event.currentTarget) setSaindo(null);
  };

  return (
    <div ref={caixa} className={styles.troca} data-trocando={saindo !== null} style={{ '--duracao-troca': `${DURACAO_MS}ms` }}>
      {saindo && (
        <div key={saindo.chave} ref={velho} className={styles.sai} aria-hidden="true" inert onAnimationEnd={terminouDeSair}>
          {saindo.conteudo}
        </div>
      )}
      <div key={chave} ref={novo} className={trocou ? styles.entra : undefined}>
        {children}
      </div>
    </div>
  );
}
