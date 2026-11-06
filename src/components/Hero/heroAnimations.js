import gsap from 'gsap';

const CARD_POP_DURATION = 1.3;
// Espera máxima pela imagem do card antes de iniciar a entrada.
const IMAGE_WAIT_MS = 1000;
// Deslocamento extra do título: cobre a folga (padding) da máscara de cada linha.
const TITLE_OFFSET_PERCENT = 165;

// Momento (s) em que cada bloco entra na timeline. Os menus abrem a cena de
// cima para baixo; o card e o anel chegam em seguida.
const AT = {
  menusButton: 0,
  menuTitles: 0.15,
  menuDividers: 0.3,
  menuItems: 0.4,
  card: 0.5,
  title: 0.85,
  shape: 1,
  info: 1.3,
};

// Scroll vertical gasto por pixel de deslocamento horizontal: abaixo de 1,
// a troca de seção pede menos rolagem.
const SCROLL_RATIO = 0.5;
// Atraso (s) com que o track alcança o scroll.
const SCROLL_SMOOTHING = 0.6;

// Parallax durante o scroll horizontal, em fração da largura da viewport.
// O anel anda o bastante para revelar, no painel seguinte, a metade escondida.
const PARALLAX = {
  shape: 0.045,
};

const addMenus = (tl, q) =>
  tl
    .from(
      q('[data-intro="menus-button"]'),
      { autoAlpha: 0, y: -12, scale: 0.9, duration: 1 },
      AT.menusButton,
    )
    .from(
      q('[data-intro="menu-title"]'),
      { autoAlpha: 0, yPercent: 45, duration: 1.1, stagger: 0.12 },
      AT.menuTitles,
    )
    // Um único "scale" serve à linha vertical (desktop) e à horizontal (celular).
    .from(
      q('[data-intro="menu-divider"]'),
      { scale: 0, duration: 1.4, ease: 'expo.inOut', stagger: 0.12 },
      AT.menuDividers,
    )
    .from(
      q('[data-intro="menu-item"]'),
      { autoAlpha: 0, y: 24, duration: 1, stagger: 0.06 },
      AT.menuItems,
    );

// O card surge inteiro (fundo, imagem e sombra juntos), com um "bounce" na escala.
const addCard = (tl, q) =>
  tl
    .from(
      q('[data-intro="card"]'),
      { scale: 0.6, duration: CARD_POP_DURATION, ease: 'elastic.out(1, 0.6)' },
      AT.card,
    )
    .from(
      q('[data-intro="card"]'),
      { autoAlpha: 0, duration: 0.25, ease: 'power1.out' },
      AT.card,
    )
    .from(
      q('[data-intro="title-line"]'),
      { yPercent: TITLE_OFFSET_PERCENT, stagger: 0.12 },
      AT.title,
    )
    .from(
      q('[data-intro="card-info"]'),
      { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out', stagger: 0.08 },
      AT.info,
    );

export function playIntro(scope) {
  const q = gsap.utils.selector(scope);
  const cardImage = q('[data-intro="card-image"]')[0];
  const tl = gsap.timeline({
    paused: true,
    defaults: { duration: 1.2, ease: 'expo.out' },
  });
  let reverted = false;

  // Só inicia com a imagem já decodificada, para ela surgir junto com o card.
  // O timeout garante a entrada mesmo se a imagem demorar ou falhar.
  const decoded = cardImage?.decode?.().catch(() => {}) ?? Promise.resolve();
  const timeout = new Promise((resolve) => {
    setTimeout(resolve, IMAGE_WAIT_MS);
  });

  Promise.race([decoded, timeout]).then(() => {
    if (!reverted) tl.play();
  });

  addMenus(tl, q);
  addCard(tl, q);
  tl.from(
    q('[data-intro="shape"]'),
    { autoAlpha: 0, xPercent: 18, yPercent: 18, duration: 1.4, ease: 'power3.out' },
    AT.shape,
  );

  return () => {
    reverted = true;
  };
}

export function playReducedIntro(scope) {
  gsap.from(scope, { autoAlpha: 0, duration: 0.4, ease: 'none' });
}

export function setupHorizontalScroll({ viewport, track, panel }) {
  // O anel decorativo se repete nos painéis seguintes: a busca é no track.
  const q = gsap.utils.selector(track);
  const distance = () => track.scrollWidth - viewport.clientWidth;

  const scrollTween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: viewport,
      pin: true,
      scrub: SCROLL_SMOOTHING,
      start: 'top top',
      end: () => `+=${distance() * SCROLL_RATIO}`,
      invalidateOnRefresh: true,
    },
  });

  Object.entries(PARALLAX).forEach(([name, factor]) => {
    gsap.to(q(`[data-parallax="${name}"]`), {
      x: () => viewport.clientWidth * factor,
      ease: 'none',
      scrollTrigger: {
        trigger: panel,
        containerAnimation: scrollTween,
        start: 'left left',
        end: 'right left',
        scrub: true,
        invalidateOnRefresh: true,
      },
    });
  });

  return scrollTween;
}
