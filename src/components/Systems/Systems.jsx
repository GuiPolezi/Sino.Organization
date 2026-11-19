import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MEDIA, matches } from '../../utils/media.js';
import { entradaDaSecao } from './animacoes.js';
import Computador from './Computador.jsx';
import SlideNav from './SlideNav.jsx';
import { SLIDES } from './systems.js';
import styles from './Systems.module.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const TITULO_ID = 'sistemas-titulo';
const SUBTITULO =
  'Selecione o ícone no computador ou avance o slide para visualizar a descrição do sistema';

/*
 * Seção Sistemas: a água (WaterRipple, única para a home, em App.jsx) refrata o título, o subtítulo e o
 * rótulo "SLIDE" (data-ripple); o balão, a pílula de slides e o computador
 * ficam por cima, fora do efeito. O slide 0 é a área de trabalho; os outros
 * abrem a janela do aplicativo correspondente.
 */
export default function Systems() {
  const painel = useRef(null);
  const balao = useRef(null);
  const larguraDoBalao = useRef(null);
  const [indice, setIndice] = useState(0);
  const slide = SLIDES[indice];

  useGSAP(
    () => {
      gsap.matchMedia().add(MEDIA.motion, () => entradaDaSecao(painel.current));
    },
    { scope: painel },
  );

  // O balão troca de nome com o slide: a largura acompanha e o texto sobe.
  useLayoutEffect(() => {
    const el = balao.current;
    // Troca no meio da animação anterior: parte da largura que está na tela.
    const anterior = gsap.isTweening(el) ? el.offsetWidth : larguraDoBalao.current;
    gsap.killTweensOf([el, el.firstChild]);
    gsap.set(el, { clearProps: 'width' });
    gsap.set(el.firstChild, { clearProps: 'transform,opacity,visibility' });
    const largura = el.offsetWidth;
    larguraDoBalao.current = largura;
    if (anterior === null || matches(MEDIA.reducedMotion)) return;
    gsap.fromTo(el, { width: anterior }, { width: largura, duration: 0.45, ease: 'power3.out', clearProps: 'width' });
    gsap.from(el.firstChild, { yPercent: 70, autoAlpha: 0, duration: 0.4, ease: 'power3.out' });
  }, [indice]);

  const irPara = (i) => setIndice(Math.min(Math.max(i, 0), SLIDES.length - 1));
  const abrir = (id) => irPara(SLIDES.findIndex((s) => s.id === id));

  return (
    <section ref={painel} className={styles.painel} aria-labelledby={TITULO_ID}>
      <div className={styles.palco}>
        <header className={styles.cabecalho}>
          <h2 id={TITULO_ID} className={styles.titulo}>
            <span className={styles.mascara}>
              <span className={styles.tituloTexto} data-sys="titulo" data-ripple="texto">
                Sistemas
              </span>
            </span>
          </h2>
          <p className={styles.subtitulo} data-sys="subtitulo">
            {/* Uma palavra por span: a água redesenha cada uma e a frase quebra linha à vontade.
                O espaço fica fora do span, para a caixa de cada palavra ser só a palavra. */}
            {SUBTITULO.split(' ').map((palavra, i) => (
              <Fragment key={`${palavra}-${i}`}>
                {i > 0 && ' '}
                <span data-ripple="texto">{palavra}</span>
              </Fragment>
            ))}
          </p>
        </header>

        <div className={styles.barra} data-sys="barra">
          <p ref={balao} className={styles.balao} aria-live="polite">
            <span>{slide.nome}</span>
          </p>

          <div className={styles.navegacao}>
            <span className={styles.rotulo} data-ripple="texto" aria-hidden="true">
              Slide
            </span>
            <SlideNav slides={SLIDES} indice={indice} onIr={irPara} />
          </div>
        </div>

        <Computador appAtivo={slide.id} onAbrir={abrir} onFechar={() => irPara(0)} />
      </div>
    </section>
  );
}
