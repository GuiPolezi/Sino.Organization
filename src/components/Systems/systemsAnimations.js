import gsap from 'gsap';
import { LINE_DASH } from './systems.js';

// Ângulos da tampa (graus). LID_OPEN espelha o `rotateX` de .lid no CSS.
const LID_OPEN = -62;
const LID_CLOSED = -176;
// Mesmo deslocamento usado no título do Hero: cobre a folga da máscara.
const TITLE_OFFSET_PERCENT = 165;

// Flutuação de cada balão (px e segundos); os valores se repetem em ciclo.
const BALLOON_FLOAT = [
  { x: 3, y: -7, duration: 3.1 },
  { x: -4, y: 6, duration: 3.7 },
  { x: 4, y: 5, duration: 2.9 },
  { x: -3, y: -6, duration: 3.4 },
];
const FLOAT_PHASE = 0.7;

// Notebook: quanto sobe (fração da largura), balanço (graus) e ritmo (s).
const NOTEBOOK_LIFT = 0.035;
const NOTEBOOK_SWAY = 1.4;
const NOTEBOOK_FLOAT_DURATION = 3.2;
const NOTEBOOK_SWAY_DURATION = 4.7;
// Inclinação máxima (graus) seguindo o mouse.
const TILT = { x: 7, y: 10 };

const LOOP = { ease: 'sine.inOut', repeat: -1, yoyo: true };

export function playEntrance(scope, scrollTrigger) {
  const q = gsap.utils.selector(scope);
  const tl = gsap.timeline({
    defaults: { duration: 1.1, ease: 'expo.out' },
    scrollTrigger: { trigger: scope, ...scrollTrigger },
  });

  tl.from(q('[data-sys="title-line"]'), { yPercent: TITLE_OFFSET_PERCENT }, 0)
    .from(
      q('[data-sys="subtitle"]'),
      { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out' },
      0.2,
    )
    .from(
      q('[data-sys="hub"]'),
      { autoAlpha: 0, scale: 0, duration: 1.2, ease: 'back.out(1.6)' },
      0.3,
    )
    .from(
      q('[data-sys="notebook"]'),
      { autoAlpha: 0, y: 60, duration: 1.2, ease: 'power3.out' },
      0.3,
    )
    .fromTo(
      q('[data-sys="lid"]'),
      { rotationX: LID_CLOSED },
      { rotationX: LID_OPEN, duration: 1.6, ease: 'power3.out' },
      0.45,
    )
    .from(
      q('[data-sys="line"]'),
      { autoAlpha: 0, duration: 0.6, ease: 'power1.out', stagger: 0.08 },
      0.9,
    )
    .from(
      q('[data-sys="balloon"]'),
      { autoAlpha: 0, scale: 0.6, duration: 0.9, ease: 'back.out(2)', stagger: 0.08 },
      1,
    );
}

// Movimento contínuo e leve: balões, notebook, sombra, círculo e tracejado.
export function playAmbient(scope) {
  const q = gsap.utils.selector(scope);
  const laptop = q('[data-sys="laptop"]')[0];

  q('[data-sys="balloon-float"]').forEach((balloon, index) => {
    const { x, y, duration } = BALLOON_FLOAT[index % BALLOON_FLOAT.length];
    gsap.to(balloon, { x, y, duration, delay: -index * FLOAT_PHASE, ...LOOP });
  });

  gsap.to(laptop, {
    z: () => laptop.offsetWidth * NOTEBOOK_LIFT,
    duration: NOTEBOOK_FLOAT_DURATION,
    ...LOOP,
  });
  gsap.fromTo(
    laptop,
    { rotationZ: -NOTEBOOK_SWAY },
    { rotationZ: NOTEBOOK_SWAY, duration: NOTEBOOK_SWAY_DURATION, ...LOOP },
  );
  gsap.to(q('[data-sys="shadow"]'), {
    scale: 0.92,
    opacity: 0.65,
    duration: NOTEBOOK_FLOAT_DURATION,
    ...LOOP,
  });
  gsap.to(q('[data-sys="hub-pulse"]'), { scale: 1.08, duration: 2.6, ...LOOP });
  gsap.to(q('[data-sys="line"]'), {
    strokeDashoffset: -(LINE_DASH[0] + LINE_DASH[1]),
    duration: 1.6,
    ease: 'none',
    repeat: -1,
  });
}

// Notebook inclina em 3D acompanhando o mouse sobre a seção.
export function setupTilt(scope) {
  const tilt = scope.querySelector('[data-sys="tilt"]');
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
