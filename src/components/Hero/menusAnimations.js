import gsap from 'gsap';

/*
 * Animações dos menus da home: a troca do nome por "EM BREVE" nos itens
 * ainda não desenvolvidos e a apresentação disparada pelo botão "Menus", que
 * percorre as colunas da esquerda para a direita.
 */

// Opacidade das colunas fora de destaque durante a apresentação.
const DIM = 0.18;
const TITLE_SCALE = 1.12;
const ITEM_SCALE = 1.1;

// Ritmo (s) de cada coluna na apresentação.
const FOCUS = 0.7; // a coluna acende e as outras apagam
const WAVE_START = 0.55; // a luz chega ao primeiro item
const STEP = 0.38; // intervalo entre um item e o próximo
const BEAM_MOVE = 0.45; // trajeto da luz até cada item
const SETTLE = 0.7; // pausa depois do último item, antes do título voltar
const SOON_HOLD = 1.1; // quanto tempo o "EM BREVE" fica à mostra
// Quanto a próxima coluna começa antes de a anterior terminar.
const OVERLAP = 0.6;

const pick = (el, name) => el.querySelector(`[data-menu="${name}"]`);
const pickAll = (el, name) => [...el.querySelectorAll(`[data-menu="${name}"]`)];

// Estado inicial do "EM BREVE": escondido embaixo do nome, dentro da máscara.
// Só opacidade (nunca `visibility`), para a troca não mexer na acessibilidade.
export function hideSoonLabels(scope) {
  gsap.set(scope.querySelectorAll('[data-menu="soon"]'), { yPercent: 100, opacity: 0 });
}

// Sobe o nome e traz o "EM BREVE" de baixo (ou o inverso, com `show` falso).
export function rollSoon(item, show, { reduced = false } = {}) {
  const name = pick(item, 'name');
  const soon = pick(item, 'soon');

  if (reduced) {
    return gsap
      .timeline({ defaults: { duration: 0.25, ease: 'none', overwrite: 'auto' } })
      .set([name, soon], { yPercent: 0 }, 0)
      .to(name, { opacity: show ? 0 : 1 }, 0)
      .to(soon, { opacity: show ? 1 : 0 }, 0);
  }

  return gsap
    .timeline({ defaults: { duration: 0.7, ease: 'expo.out', overwrite: 'auto' } })
    .to(name, { yPercent: show ? -100 : 0, opacity: show ? 0 : 1 }, 0)
    .to(soon, { yPercent: show ? 0 : 100, opacity: show ? 1 : 0 }, 0);
}

// Centro vertical do elemento, relativo ao topo da coluna.
const centerIn = (el, base) => {
  const rect = el.getBoundingClientRect();
  return rect.top + rect.height / 2 - base.top;
};

// A luz passa pelo item: ele cresce e volta; o "em breve" mostra o aviso.
function waveItem(item, reduced) {
  const tl = gsap.timeline();

  if (item.hasAttribute('data-soon')) {
    return tl
      .add(rollSoon(item, true, { reduced }), 0)
      .add(rollSoon(item, false, { reduced }), SOON_HOLD);
  }

  if (reduced) return tl;

  const label = pick(item, 'label');
  return tl
    .to(label, { scale: ITEM_SCALE, duration: 0.4, ease: 'power3.out' }, 0)
    .to(label, { scale: 1, duration: 0.8, ease: 'power3.inOut' }, 0.4);
}

function focusColumn(column, others, { reduced, titleRest }) {
  const title = pick(column, 'title');
  const beam = pick(column, 'beam');
  const items = pickAll(column, 'item');
  const base = column.getBoundingClientRect();
  const beamTop = (el) => centerIn(el, base) - beam.offsetHeight / 2;
  const end = WAVE_START + (items.length - 1) * STEP + SETTLE;

  const tl = gsap
    .timeline({ defaults: { ease: 'power2.inOut' } })
    .to(others, { opacity: DIM, duration: FOCUS }, 0)
    .to(column, { opacity: 1, duration: FOCUS }, 0)
    .to(
      title,
      { opacity: 1, scale: reduced ? 1 : TITLE_SCALE, duration: 0.9, ease: 'expo.out' },
      0,
    );

  if (!reduced) {
    tl.set(beam, { y: beamTop(title) }, 0)
      .to(beam, { autoAlpha: 1, duration: 0.4, ease: 'power1.out' }, 0.1)
      .to(beam, { autoAlpha: 0, duration: 0.6 }, end - 0.1);
  }

  items.forEach((item, index) => {
    const at = WAVE_START + index * STEP;
    if (!reduced) {
      tl.to(beam, { y: beamTop(item), duration: BEAM_MOVE }, at - BEAM_MOVE);
    }
    tl.add(waveItem(item, reduced), at - 0.08);
  });

  return tl.to(
    title,
    { opacity: titleRest, scale: 1, duration: 0.8, ease: 'power3.inOut' },
    end,
  );
}

/*
 * Apresentação dos menus. Uma coluna por vez, da esquerda para a direita: as
 * outras apagam, o título cresce e uma luz suave desce pelos itens; cada item
 * cresce quando ela passa. No fim, tudo volta ao normal.
 */
export function buildTour(root, { reduced = false, onComplete } = {}) {
  const columns = pickAll(root, 'column');
  const progress = pick(root, 'progress');
  const titleRest =
    parseFloat(getComputedStyle(root).getPropertyValue('--menu-title-opacity')) || 1;

  const tl = gsap.timeline({ paused: true, onComplete });

  columns.forEach((column, index) => {
    const others = columns.filter((other) => other !== column);
    tl.add(
      focusColumn(column, others, { reduced, titleRest }),
      index === 0 ? 0 : `>-${OVERLAP}`,
    );
  });

  tl.to(
    columns,
    {
      opacity: 1,
      duration: 0.9,
      ease: 'power2.out',
      stagger: 0.08,
      clearProps: 'opacity',
    },
    '>-0.3',
  );

  // O botão "Menus" se preenche como uma barra de progresso da apresentação.
  if (progress) {
    const total = tl.duration();
    tl.fromTo(progress, { scaleX: 0 }, { scaleX: 1, duration: total, ease: 'none' }, 0)
      .to(progress, { autoAlpha: 0, duration: 0.5, ease: 'power1.out' }, total)
      .set(progress, { scaleX: 0, autoAlpha: 1 });
  }

  return tl;
}
