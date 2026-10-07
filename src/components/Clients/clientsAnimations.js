import gsap from 'gsap';

// Mesmo deslocamento usado nos outros títulos: cobre a folga da máscara.
const TITLE_OFFSET_PERCENT = 165;
// Tabuleiro: quanto sobe (fração da largura) e ritmo (s) da flutuação.
const BOARD_LIFT = 0.018;
const BOARD_FLOAT_DURATION = 3.6;
// Inclinação máxima (graus) seguindo o mouse.
const TILT = { x: 5, y: 7 };
// Onda dos pontos: até onde o anel cresce, de quanto em quanto tempo e em
// quanto tempo (s) todos os pontos entram no ritmo.
const RING_SCALE = 3.4;
const RING_DURATION = 2.4;
const RING_SPREAD = 2.4;
const VIEW_EXIT_DURATION = 0.35;
const COUNT_DURATION = 1.8;

const LOOP = { ease: 'sine.inOut', repeat: -1, yoyo: true };

const addCounters = (tl, counters, at) => {
  counters.forEach((element) => {
    const state = { value: 0 };
    const total = Number(element.dataset.total);

    tl.to(
      state,
      {
        value: total,
        duration: COUNT_DURATION,
        ease: 'power3.out',
        snap: { value: 1 },
        onUpdate: () => {
          element.textContent = state.value;
        },
      },
      at,
    );
  });

  // O texto é escrito fora do React: devolve o valor final no revert.
  return () => {
    counters.forEach((element) => {
      element.textContent = element.dataset.total;
    });
  };
};

export function playEntrance(scope) {
  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({
    defaults: { duration: 1.1, ease: 'expo.out' },
    scrollTrigger: { trigger: scope, start: 'top 65%' },
  });

  tl.from(q('[data-cli="title-line"]'), { yPercent: TITLE_OFFSET_PERCENT }, 0)
    .from(
      q('[data-cli="subtitle"]'),
      { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out' },
      0.2,
    )
    .from(
      q('[data-cli="map"]'),
      { autoAlpha: 0, y: 80, duration: 1.4, ease: 'power3.out' },
      0.25,
    )
    .from(
      q('[data-cli="state"]'),
      {
        opacity: 0,
        duration: 0.6,
        ease: 'power1.out',
        stagger: { each: 0.025, from: 'random' },
      },
      0.45,
    )
    .from(
      q('[data-cli="beam"]'),
      { scaleY: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 },
      1.1,
    )
    .from(
      q('[data-cli="dot"]'),
      { scale: 0, duration: 0.7, ease: 'back.out(2.4)', stagger: 0.05 },
      1.3,
    )
    .from(
      q('[data-cli="stat"]'),
      { autoAlpha: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.1 },
      0.5,
    )
    .from(
      q('[data-cli="place"]'),
      { autoAlpha: 0, x: 24, duration: 0.8, ease: 'power3.out', stagger: 0.04 },
      0.8,
    );

  return addCounters(tl, q('[data-cli="count"]'), 0.5);
}

// Movimento contínuo e leve: o tabuleiro flutua sobre a própria sombra.
export function playAmbient(scope) {
  const q = gsap.utils.selector(scope);
  const board = q('[data-cli="board"]')[0];

  gsap.to(board, {
    z: () => board.offsetWidth * BOARD_LIFT,
    duration: BOARD_FLOAT_DURATION,
    ...LOOP,
  });
  gsap.to(q('[data-cli="shadow"]'), {
    scale: 0.97,
    opacity: 0.4,
    duration: BOARD_FLOAT_DURATION,
    ...LOOP,
  });
}

// Ondas dos pinos. Fica à parte porque os pinos mudam a cada troca de recorte.
export function playPins(scope) {
  gsap.fromTo(
    scope.querySelectorAll('[data-cli="ring"]'),
    { scale: 1, opacity: 0.7 },
    {
      scale: RING_SCALE,
      opacity: 0,
      duration: RING_DURATION,
      ease: 'power1.out',
      repeat: -1,
      stagger: { amount: RING_SPREAD, from: 'random' },
    },
  );
}

// Troca de recorte (país ↔ estado): o mapa encolhe até sumir e o novo recorte
// cresce no lugar. Só escala, sem opacidade, para a cena 3D não ser achatada.
const viewTargets = (scope) =>
  scope.querySelectorAll('[data-cli="view"], [data-cli="shadow-view"]');

export function playViewExit(scope, onComplete) {
  gsap.to(viewTargets(scope), {
    scale: 0,
    duration: VIEW_EXIT_DURATION,
    ease: 'power2.in',
    onComplete,
  });
}

export function playViewEnter(scope) {
  const q = gsap.utils.selector(scope);
  const pins = { amount: 0.5, from: 'random' };

  gsap.fromTo(
    viewTargets(scope),
    { scale: 0 },
    { scale: 1, duration: 0.8, ease: 'back.out(1.3)' },
  );
  gsap.from(q('[data-cli="beam"]'), {
    scaleY: 0,
    duration: 0.5,
    ease: 'power3.out',
    stagger: pins,
    delay: 0.3,
  });
  gsap.from(q('[data-cli="dot"]'), {
    scale: 0,
    duration: 0.5,
    ease: 'back.out(2.4)',
    stagger: pins,
    delay: 0.45,
  });
}

// O mapa inclina em 3D acompanhando o mouse sobre a seção.
export function setupTilt(scope) {
  const tilt = scope.querySelector('[data-cli="tilt"]');
  const follow = { duration: 0.8, ease: 'power3' };
  const rotateX = gsap.quickTo(tilt, 'rotationX', follow);
  const rotateY = gsap.quickTo(tilt, 'rotationY', follow);

  const onMove = (event) => {
    const bounds = scope.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    rotateX(-y * TILT.x * 2);
    rotateY(x * TILT.y * 2);
  };
  const onLeave = () => {
    rotateX(0);
    rotateY(0);
  };

  scope.addEventListener('pointermove', onMove);
  scope.addEventListener('pointerleave', onLeave);

  return () => {
    scope.removeEventListener('pointermove', onMove);
    scope.removeEventListener('pointerleave', onLeave);
  };
}
