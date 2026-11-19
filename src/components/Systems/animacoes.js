import gsap from 'gsap';

/*
 * Animações da seção Sistemas: a entrada no scroll e a abertura/fechamento
 * dos aplicativos à moda do iOS — a janela nasce do ícone, cresce até ocupar
 * a tela e volta encolhendo para ele, enquanto a área de trabalho dá um leve
 * zoom para trás (como a tela inicial do iPhone).
 */

const ABRIR = { duration: 0.62, ease: 'expo.out' };
const FECHAR = { duration: 0.48, ease: 'power3.inOut' };
// Zoom da área de trabalho com um app aberto por cima.
const ZOOM_FUNDO = 1.07;
const BRILHO_FUNDO = 0.82;
// Raio (px de tela) da janela quando ainda tem o tamanho do ícone.
const RAIO_ICONE = 14;
// Recorte da área clicável que é o ícone em si (o resto é o nome embaixo).
const ICONE = { altura: 0.62, largura: 0.68 };

const TITULO_DESLOCAMENTO = 120;

// Retângulo do ícone (sem o nome), relativo à tela.
function retanguloDoIcone(tela, botao) {
  const t = tela.getBoundingClientRect();
  const b = botao.getBoundingClientRect();
  const largura = b.width * ICONE.largura;
  const altura = Math.min(b.height * ICONE.altura, largura);
  return {
    cx: b.left - t.left + b.width / 2,
    cy: b.top - t.top + altura / 2 + b.height * 0.04,
    largura,
    altura,
  };
}

// Transformação que leva a janela (no lugar atual dela) até o ícone.
function rumoAoIcone(tela, janela, botao) {
  const t = tela.getBoundingClientRect();
  const j = janela.getBoundingClientRect();
  const icone = retanguloDoIcone(tela, botao);
  const escalaX = icone.largura / j.width;
  const escalaY = icone.altura / j.height;
  return {
    x: gsap.getProperty(janela, 'x') + icone.cx - (j.left - t.left + j.width / 2),
    y: gsap.getProperty(janela, 'y') + icone.cy - (j.top - t.top + j.height / 2),
    scaleX: escalaX,
    scaleY: escalaY,
    // Raio elíptico compensando a escala: no tamanho do ícone ele parece redondo.
    borderRadius: `${RAIO_ICONE / escalaX}px / ${RAIO_ICONE / escalaY}px`,
  };
}

export function abrirApp({ tela, janela, botao, fundo, reduzido, aoTerminar }) {
  const conteudo = janela.querySelectorAll('[data-janela="parte"]');
  if (reduzido || !botao) {
    gsap.set(janela, { autoAlpha: 1 });
    aoTerminar();
    return null;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      // A janela já cobre a tela: o fundo volta ao normal sem ninguém ver.
      gsap.set(fundo, { clearProps: 'transform,filter' });
      aoTerminar();
    },
  });
  tl.fromTo(
    janela,
    { ...rumoAoIcone(tela, janela, botao), autoAlpha: 0.35 },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, ...ABRIR, clearProps: 'transform,borderRadius' },
    0,
  )
    .fromTo(conteudo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 0.12)
    .to(fundo, { scale: ZOOM_FUNDO, filter: `brightness(${BRILHO_FUNDO})`, ...ABRIR }, 0);
  return tl;
}

// `cobreTela`: a janela estava maximizada (o fundo, escondido, começa com zoom).
export function fecharApp({ tela, janela, botao, fundo, cobreTela, reduzido, aoTerminar }) {
  const conteudo = janela.querySelectorAll('[data-janela="parte"]');
  if (reduzido || !botao) {
    aoTerminar();
    return null;
  }

  const tl = gsap.timeline({ onComplete: aoTerminar });
  tl.to(conteudo, { autoAlpha: 0, duration: 0.18, ease: 'power1.in' }, 0)
    .to(janela, { ...rumoAoIcone(tela, janela, botao), ...FECHAR }, 0)
    .to(janela, { autoAlpha: 0, duration: 0.16, ease: 'power1.in' }, FECHAR.duration - 0.16);
  if (cobreTela) {
    tl.fromTo(
      fundo,
      { scale: ZOOM_FUNDO, filter: `brightness(${BRILHO_FUNDO})` },
      { scale: 1, filter: 'brightness(1)', ...FECHAR, clearProps: 'transform,filter' },
      0,
    );
  }
  return tl;
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
