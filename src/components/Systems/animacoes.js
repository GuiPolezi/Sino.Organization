import gsap from 'gsap';

/*
 * Animações da seção Sistemas: a entrada no scroll e a abertura/fechamento
 * dos aplicativos. A janela abre como no macOS: aparece em fade, crescendo
 * de leve (96% → 100%) e subindo poucos px; o conteúdo vem logo atrás. O
 * fechamento é o caminho inverso, mais curto.
 */

const ABRIR = { duration: 0.5, ease: 'power3.out' };
const FECHAR = { duration: 0.28, ease: 'power2.in' };
const DE_LONGE = { scale: 0.96, y: 10 };
const CONTEUDO = { y: 8, duration: 0.45, ease: 'power3.out', stagger: 0.05 };

const TITULO_DESLOCAMENTO = 120;

export function abrirApp({ janela, reduzido, aoTerminar }) {
  if (reduzido) {
    gsap.set(janela, { autoAlpha: 1 });
    aoTerminar();
    return null;
  }
  return gsap
    .timeline({ onComplete: aoTerminar })
    .fromTo(
      janela,
      { autoAlpha: 0, ...DE_LONGE },
      { autoAlpha: 1, scale: 1, y: 0, ...ABRIR, clearProps: 'transform' },
    )
    .from(janela.querySelectorAll('[data-janela="parte"]'), { autoAlpha: 0, ...CONTEUDO }, 0.12);
}

export function fecharApp({ janela, reduzido, aoTerminar }) {
  if (reduzido) {
    aoTerminar();
    return null;
  }
  // Mantém o x/y do arrasto (modo janela): só some e encolhe de leve.
  return gsap.to(janela, { autoAlpha: 0, scale: DE_LONGE.scale, ...FECHAR, onComplete: aoTerminar });
}

// Entrada da seção quando ela chega na tela.
export function entradaDaSecao(escopo) {
  const q = gsap.utils.selector(escopo);
  gsap
    .timeline({
      defaults: { duration: 1.1, ease: 'expo.out' },
      scrollTrigger: { trigger: escopo, start: 'top 65%', once: true },
    })
    .from(q('[data-sys="titulo"]'), { yPercent: TITULO_DESLOCAMENTO }, 0)
    .from(q('[data-sys="subtitulo"]'), { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out' }, 0.15)
    .from(q('[data-sys="barra"]'), { autoAlpha: 0, y: -12, duration: 0.8, ease: 'power3.out' }, 0.3)
    .from(q('[data-sys="monitor"]'), { autoAlpha: 0, y: 70, duration: 1.3, ease: 'power3.out' }, 0.3)
    .from(
      q('[data-sys="periferico"]'),
      { autoAlpha: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.1 },
      0.55,
    );
}
