import gsap from 'gsap';

// Deslocamento do título: cobre a folga (padding) da máscara de cada linha.
const TITLE_OFFSET_PERCENT = 120;

// Momento (s) em que cada bloco entra na timeline: o título abre a cena, o
// divisor se desenha a partir do centro e os cards chegam em onda.
const AT = {
  title: 0,
  divider: 0.45,
  cards: 0.6,
  art: 0.85,
  shape: 0.7,
};

const addHeader = (tl, q) =>
  tl
    .from(
      q('[data-intro="title-line"]'),
      { yPercent: TITLE_OFFSET_PERCENT, duration: 1.3, stagger: 0.14 },
      AT.title,
    )
    .from(
      q('[data-intro="divider-line"]'),
      { scaleX: 0, duration: 1.4, ease: 'expo.inOut' },
      AT.divider,
    )
    .from(
      q('[data-intro="divider-mark"]'),
      { scaleY: 0, duration: 0.8, ease: 'back.out(2)', stagger: 0.08 },
      AT.divider + 0.2,
    );

// Os cards sobem em onda (da esquerda para a direita, linha a linha) e os
// bonecos de cada um brotam logo depois, com um leve "bounce".
const addCards = (tl, q) =>
  tl
    .from(
      q('[data-intro="card"]'),
      {
        autoAlpha: 0,
        y: 48,
        scale: 0.94,
        duration: 1.1,
        ease: 'power3.out',
        stagger: { each: 0.08, grid: 'auto', from: 'start' },
      },
      AT.cards,
    )
    .from(
      q('[data-intro="card-art"]'),
      {
        autoAlpha: 0,
        scale: 0.7,
        y: 24,
        duration: 1,
        ease: 'back.out(1.6)',
        stagger: { each: 0.08, grid: 'auto', from: 'start' },
      },
      AT.art,
    );

export function playIntro(scope) {
  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({ defaults: { duration: 1.2, ease: 'expo.out' } });

  addHeader(tl, q);
  addCards(tl, q);
  tl.from(
    q('[data-intro="shape"]'),
    { autoAlpha: 0, xPercent: 18, yPercent: 18, duration: 1.4, ease: 'power3.out' },
    AT.shape,
  );
}

export function playReducedIntro(scope) {
  gsap.from(scope, { autoAlpha: 0, duration: 0.4, ease: 'none' });
}
