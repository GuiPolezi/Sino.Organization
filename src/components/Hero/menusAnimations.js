import gsap from 'gsap';

/*
 * Animações dos menus da home: o banner com foto do hover, a troca do nome
 * por "EM BREVE" nos itens ainda não desenvolvidos e a apresentação disparada
 * pelo botão "Menus", que percorre as colunas da esquerda para a direita
 * abrindo o banner de cada item.
 */

// Opacidade das colunas fora de destaque durante a apresentação.
const DIM = 0.18;
const TITLE_SCALE = 1.12;

// Ritmo (s) de cada coluna na apresentação.
const FOCUS = 0.7; // a coluna acende e as outras apagam
const WAVE_START = 0.55; // a luz chega ao primeiro item
const STEP = 0.7; // intervalo entre um item e o próximo
const BEAM_MOVE = 0.45; // trajeto da luz até cada item
const BANNER_HOLD = 0.8; // o banner fecha logo depois de o próximo abrir por cima
const SETTLE = 1; // pausa depois do último item, antes do título voltar
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

/*
 * Banner com foto: abre a partir do centro do item, a foto dá um leve zoom
 * para trás e o nome desliza e encolhe até o canto superior esquerdo.
 * As medidas vêm do CSS do banner: `padding` = posição do nome dentro dele,
 * `font-size` = tamanho final do nome. O padding também é a distância mínima
 * entre o banner e a borda do painel.
 */
const bannerTimelines = new WeakMap();
// Abertura do recorte (0 = fechado, 1 = aberto), por banner.
const reveals = new WeakMap();

const revealOf = (banner) => {
  if (!reveals.has(banner)) reveals.set(banner, { value: 0 });
  return reveals.get(banner);
};

const applyReveal = (banner, value) => {
  const y = (1 - value) * 42;
  const x = (1 - value) * 50;
  banner.style.clipPath = `inset(${y}% ${x}% ${y}% ${x}%)`;
  banner.style.visibility = value > 0 ? 'visible' : 'hidden';
};

// Tween solto (não herda os `defaults` da timeline): a curva vem por parâmetro.
const revealTo = (banner, value, duration, ease) => {
  const state = revealOf(banner);
  return gsap.to(state, {
    value,
    duration,
    ease,
    onUpdate: () => applyReveal(banner, state.value),
  });
};

// Onde o banner e o nome terminam, a partir das posições sem transformação.
function measureBanner(item, banner, label) {
  const bannerStyle = getComputedStyle(banner);
  const padX = parseFloat(bannerStyle.paddingLeft);
  const padY = parseFloat(bannerStyle.paddingTop);
  const width = banner.offsetWidth;
  const height = banner.offsetHeight;
  const bounds = (item.closest('nav') ?? document.documentElement).getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  const labelRect = label.getBoundingClientRect();

  const centerX = itemRect.left + itemRect.width / 2;
  const centerY = itemRect.top + itemRect.height / 2;
  const naturalLeft = centerX - width / 2;
  const minLeft = bounds.left + padX;
  const maxLeft = bounds.right - padX - width;
  // Painel mais estreito que o banner com a margem: centraliza no painel.
  const left =
    maxLeft < minLeft
      ? bounds.left + (bounds.width - width) / 2
      : gsap.utils.clamp(minLeft, maxLeft, naturalLeft);

  // O nome pode estar no meio de outra animação: desconta o deslocamento atual.
  // (Com origem no canto superior esquerdo, a escala não mexe nesse canto.)
  const labelLeft = labelRect.left - gsap.getProperty(label, 'x');
  const labelTop = labelRect.top - gsap.getProperty(label, 'y');

  return {
    shift: left - naturalLeft,
    x: left + padX - labelLeft,
    y: centerY - height / 2 + padY - labelTop,
    scale: parseFloat(bannerStyle.fontSize) / parseFloat(getComputedStyle(label).fontSize),
  };
}

// Timeline de abertura do banner (sem tocar em nada até ser reproduzida).
function bannerOpening(item, time = 1) {
  const banner = pick(item, 'banner');
  const label = pick(item, 'label');
  if (!banner || !label) return null;

  const image = pick(item, 'banner-image');
  const { shift, x, y, scale } = measureBanner(item, banner, label);

  // O recorte abre na frente e o nome só desliza depois: assim ele não
  // aparece encolhido fora do banner no meio da animação.
  const tl = gsap
    .timeline({ defaults: { ease: 'expo.out' } })
    // Acima dos vizinhos: o banner é mais alto que o espaço entre os itens.
    .set(item, { zIndex: 2 }, 0)
    .set(banner, { x: shift }, 0)
    .add(revealTo(banner, 1, 0.7 * time, 'expo.out'), 0)
    .to(
      label,
      { x, y, scale, transformOrigin: '0 0', duration: 0.7 * time, ease: 'power4.inOut' },
      0.05 * time,
    );

  if (image) {
    tl.fromTo(
      image,
      { scale: 1.2 },
      { scale: 1, duration: 1.2 * time, immediateRender: false },
      0,
    );
  }
  return tl;
}

// Timeline de fechamento: o nome volta ao lugar e o recorte fecha logo atrás.
function bannerClosing(item, time = 1) {
  const banner = pick(item, 'banner');
  const label = pick(item, 'label');
  if (!banner || !label) return null;

  return gsap
    .timeline({ defaults: { ease: 'power3.inOut' } })
    .to(label, { x: 0, y: 0, scale: 1, duration: 0.5 * time }, 0)
    .add(revealTo(banner, 0, 0.5 * time, 'power3.inOut'), 0.12 * time)
    .set(item, { clearProps: 'zIndex' });
}

// Hover/foco: só a última animação de cada item vale.
const playBanner = (item, tl) => {
  if (!tl) return null;
  bannerTimelines.get(item)?.kill();
  bannerTimelines.set(item, tl);
  return tl;
};

export const openBanner = (item, { reduced = false } = {}) =>
  playBanner(item, bannerOpening(item, reduced ? 0 : 1));

export const closeBanner = (item, { reduced = false } = {}) =>
  playBanner(item, bannerClosing(item, reduced ? 0 : 1));

// Centro vertical do elemento, relativo ao topo da coluna.
const centerIn = (el, base) => {
  const rect = el.getBoundingClientRect();
  return rect.top + rect.height / 2 - base.top;
};

// A luz passa pelo item: o banner abre e fecha; o "em breve" mostra o aviso.
function waveItem(item, reduced) {
  const tl = gsap.timeline();

  if (item.hasAttribute('data-soon')) {
    return tl
      .add(rollSoon(item, true, { reduced }), 0)
      .add(rollSoon(item, false, { reduced }), SOON_HOLD);
  }

  if (reduced) return tl;

  const opening = bannerOpening(item);
  if (!opening) return tl;
  return tl.add(opening, 0).add(bannerClosing(item), BANNER_HOLD);
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
 * abre o seu banner quando ela passa. No fim, tudo volta ao normal.
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
