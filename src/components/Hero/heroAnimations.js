import gsap from 'gsap';
import { getYearsSince } from '../../utils/getYearsSince.js';

const COUNT_DURATION = 2;
const CARD_POP_DURATION = 1.3;
// Espera máxima pela imagem do card antes de iniciar a entrada.
const IMAGE_WAIT_MS = 1000;
// Deslocamento extra do título: cobre a folga (padding) da máscara de cada linha.
const TITLE_OFFSET_PERCENT = 165;

// Momento (s) em que cada bloco entra na timeline.
const AT = {
  card: 0,
  title: 0.35,
  shape: 0.6,
  info: 0.8,
  counter: 0.9,
  sectors: 1.1,
};

// Parallax durante o scroll horizontal, em fração da largura da viewport.
// O anel anda o bastante para revelar, no painel seguinte, a metade escondida.
const PARALLAX = {
  shape: 0.045,
  counter: -0.04,
};

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

const addCounter = (tl, q, countEl) => {
  const counter = { value: 0 };
  return tl
    .from(
      [
        ...q('[data-intro="counter-number"]'),
        ...q('[data-intro="counter-text"]'),
      ],
      { autoAlpha: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.1 },
      AT.counter,
    )
    .to(
      counter,
      {
        value: getYearsSince(),
        duration: COUNT_DURATION,
        ease: 'power3.out',
        snap: { value: 1 },
        onUpdate: () => {
          countEl.textContent = counter.value;
        },
      },
      AT.counter,
    );
};

const addSectors = (tl, q) =>
  tl
    .from(
      q('[data-intro="sectors-label"]'),
      { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out' },
      AT.sectors,
    )
    .from(
      q('[data-intro="sector"]'),
      { autoAlpha: 0, y: 28, duration: 1, stagger: 0.1 },
      AT.sectors + 0.1,
    )
    .from(
      q('[data-intro="sector-line"]'),
      { scaleX: 0, stagger: 0.1 },
      AT.sectors + 0.1,
    );

export function playIntro(scope) {
  const q = gsap.utils.selector(scope);
  const countEl = q('[data-intro="count"]')[0];
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

  countEl.textContent = 0;
  addCard(tl, q);
  addCounter(tl, q, countEl);
  addSectors(tl, q);
  tl.from(
    q('[data-intro="shape"]'),
    { autoAlpha: 0, xPercent: 18, yPercent: 18, duration: 1.4, ease: 'power3.out' },
    AT.shape,
  );

  // O texto do contador é escrito fora do React: devolve o valor final no revert.
  return () => {
    reverted = true;
    countEl.textContent = getYearsSince();
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
      scrub: 1,
      start: 'top top',
      end: () => `+=${distance()}`,
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
