import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { MEDIA } from '../../../utils/media.js';
import { criarMotor } from './motor.js';
import styles from './WaterRipple.module.css';

gsap.registerPlugin(useGSAP);

/*
 * Água sobre o fundo do painel (técnica do jquery.ripples, em WebGL puro).
 * Vai como primeiro filho do painel (position: relative; overflow: hidden).
 * Elementos do painel marcados com data-ripple="texto" | "svg" | "linha" são
 * redesenhados na textura refratada; enquanto a água está ligada o painel
 * ganha `data-ripple-ativo` e os originais ficam invisíveis (seguem no DOM).
 * Sem WebGL, com falha ou com movimento reduzido: não renderiza nada e o DOM
 * aparece como sempre.
 *
 * `painel` (ref) é opcional: sem ele, usa o elemento pai. As opções são lidas
 * só na montagem.
 */
export default function WaterRipple({ painel, raio, perturbacao, gotasOciosas }) {
  const camada = useRef(null);
  const opcoes = useRef({ raio, perturbacao, gotasOciosas });

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MEDIA.motion, () => {
      // No 1º layout effect o ref do pai pode ainda estar vazio: cai no pai do DOM.
      const alvo = painel?.current ?? camada.current?.parentElement;
      if (!alvo || !camada.current) return undefined;
      const motor = criarMotor({ painel: alvo, camada: camada.current, opcoes: opcoes.current });
      return () => motor?.destruir();
    });
  });

  return <div ref={camada} className={styles.camada} aria-hidden="true" />;
}
