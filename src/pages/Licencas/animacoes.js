import gsap from 'gsap';

// Contagem de 0 até `total`, escrita direto no elemento (sem re-render do React).
const contar = (tl, el, total, duracao, posicao) => {
  const valor = { n: 0 };
  return tl.to(
    valor,
    {
      n: total,
      duration: duracao,
      ease: 'power3.out',
      snap: { n: 1 },
      onUpdate: () => {
        el.textContent = valor.n;
      },
    },
    posicao,
  );
};

// Contagem do "+229 Clientes Registrados", quando o total chega da API.
export const animarContador = (el, total) => contar(gsap.timeline(), el, total, 2.2, 0);

// Entrada do topo da página, ao carregar (o número do contador vem depois).
export function animarCabecalho(q) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from(q('[data-anim="titulo-palavra"]'), {
    yPercent: 115,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.1,
  })
    .from(q('[data-anim="linha"]'), {
      scaleX: 0,
      duration: 1.2,
      ease: 'expo.inOut',
      stagger: 0.12,
    }, 0.3)
    .from(q('[data-anim="sobe"]'), {
      autoAlpha: 0,
      y: 18,
      duration: 0.9,
      stagger: 0.1,
    }, 0.45)
    .from(q('[data-anim="contador"]'), {
      autoAlpha: 0,
      y: 24,
      duration: 1,
      stagger: 0.1,
    }, 0.6);

  return tl;
}

// Entrada de uma seção (título, selo, colunas e cards) quando ela chega na tela.
export function animarSecao(q, gatilho, badgeNumeroEl, total) {
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: gatilho, start: 'top 80%', once: true },
  });

  tl.from(q('[data-anim="titulo-palavra"]'), {
    yPercent: 115,
    duration: 1.1,
    ease: 'expo.out',
    stagger: 0.08,
  })
    .from(q('[data-anim="selo"]'), {
      scale: 0,
      rotate: -120,
      duration: 1.1,
      ease: 'elastic.out(1, 0.55)',
    }, 0.15)
    .from(q('[data-anim="coluna"]'), {
      autoAlpha: 0,
      y: 10,
      duration: 0.6,
      stagger: 0.06,
    }, 0.3)
    // fromTo com destino explícito: o card tem transição CSS em transform, e um
    // .from() poderia ler um valor no meio dessa transição como destino.
    .fromTo(q('[data-anim="card"]'), { autoAlpha: 0, y: 48, scale: 0.98 }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.9,
      stagger: 0.1,
      // Devolve o transform ao CSS, para o hover funcionar.
      clearProps: 'transform,opacity,visibility',
    }, 0.35)
    .from(q('[data-anim="sistema"]'), {
      autoAlpha: 0,
      x: -10,
      duration: 0.45,
      stagger: 0.025,
    }, 0.6)
    .from(q('[data-anim="mais"]'), { autoAlpha: 0, y: 10, duration: 0.6 }, '>-0.4');

  return contar(tl, badgeNumeroEl, total, 1.4, 0.2);
}

// Cards que surgem pelo "Mostrar mais".
export const animarEntradaCards = (cards) =>
  gsap.from(cards, {
    autoAlpha: 0,
    y: 32,
    duration: 0.7,
    ease: 'power3.out',
    stagger: 0.07,
    clearProps: 'transform,opacity,visibility',
  });

// Cards que saem pelo "Mostrar menos" (os de baixo saem primeiro).
export const animarSaidaCards = (cards, aoTerminar) =>
  gsap.to(cards, {
    autoAlpha: 0,
    y: 16,
    duration: 0.3,
    ease: 'power2.in',
    stagger: { each: 0.04, from: 'end' },
    onComplete: aoTerminar,
  });

// Troca de página: os cards saem para o lado oposto ao da navegação...
export const animarSaidaPagina = (cards, direcao, aoTerminar) =>
  gsap.to(cards, {
    autoAlpha: 0,
    x: -28 * direcao,
    duration: 0.28,
    ease: 'power2.in',
    stagger: 0.03,
    onComplete: aoTerminar,
  });

// ...e os novos entram vindo do lado para onde se navegou.
export const animarEntradaPagina = (cards, direcao, aoTerminar) =>
  gsap.fromTo(
    cards,
    { autoAlpha: 0, x: 36 * direcao },
    {
      autoAlpha: 1,
      x: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.06,
      clearProps: 'transform,opacity,visibility',
      onComplete: aoTerminar,
    },
  );
