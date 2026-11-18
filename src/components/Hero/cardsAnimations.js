import gsap from 'gsap';

/*
 * Hover dos cards da home (tudo em GSAP). O card em foco cresce e os bonecos
 * dele saltam para fora, maiores e com sombra; os outros encolhem e se afastam
 * um pouco, abrindo espaço. Os alvos são marcados com `data-card` (MenuCard.jsx).
 */

export const FOCO = Object.freeze({
  escala: 1.08,
  subida: -6,
  // Os bonecos crescem (mais para baixo, ver .arte no CSS) e passam da borda do card.
  arteEscala: 1.34,
  arteDescida: 0.09, // fração da altura da arte
  vizinhoEscala: 0.93,
  // Quanto (px) os outros cards se afastam do que está em foco.
  empurrao: 14,
});

const SOMBRA_REPOUSO = 'drop-shadow(0px 6px 6px rgba(20, 28, 10, 0.28))';
const SOMBRA_FOCO = 'drop-shadow(0px 22px 18px rgba(20, 28, 10, 0.45))';

/**
 * Deslocamento de um card vizinho: para longe do centro do card em foco, com
 * `distancia` px. Mesma posição (ou sem foco) não move.
 * @param {{ x: number, y: number }} origem centro do card em foco
 * @param {{ x: number, y: number }} alvo centro do vizinho
 * @param {number} distancia
 */
export function empurrao(origem, alvo, distancia) {
  const dx = alvo.x - origem.x;
  const dy = alvo.y - origem.y;
  const tamanho = Math.hypot(dx, dy);
  if (!tamanho) return { x: 0, y: 0 };
  return { x: (dx / tamanho) * distancia, y: (dy / tamanho) * distancia };
}

// Centro no layout, sem as transformações do GSAP (offset* ignora transform).
const centro = (el) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });

/**
 * Põe `ativo` em foco (ou ninguém, com null) dentro de `cards`.
 * @param {HTMLElement[]} cards os elementos `[data-card="card"]`, na ordem da grade
 * @param {HTMLElement | null} ativo
 * @param {{ reduzido?: boolean }} [opcoes]
 */
export function focarCard(cards, ativo, { reduzido = false } = {}) {
  const duracao = reduzido ? 0 : 0.65;
  const origem = ativo ? centro(ativo.parentElement) : null;

  cards.forEach((card) => {
    const arte = card.querySelector('[data-card="arte"]');
    const emFoco = card === ativo;
    const desvio = ativo && !emFoco ? empurrao(origem, centro(card.parentElement), FOCO.empurrao) : { x: 0, y: 0 };

    // O card em foco fica por cima dos vizinhos (de uma vez, sem interpolar).
    gsap.set(card.parentElement, { zIndex: emFoco ? 3 : 1 });
    gsap.to(card, {
      scale: emFoco ? FOCO.escala : ativo ? FOCO.vizinhoEscala : 1,
      x: desvio.x,
      y: emFoco ? FOCO.subida : desvio.y,
      duration: duracao,
      ease: emFoco ? 'back.out(1.5)' : 'power3.out',
      overwrite: 'auto',
    });
    // Vidro mais claro, borda e sombra mais fortes e o reflexo aceso (CSS lê a variável).
    gsap.to(card, { '--vidro-brilho': emFoco ? 1 : 0, duration: duracao, ease: 'power2.out', overwrite: 'auto' });
    if (arte) {
      gsap.to(arte, {
        scale: emFoco ? FOCO.arteEscala : 1,
        yPercent: emFoco ? FOCO.arteDescida * 100 : 0,
        filter: emFoco ? SOMBRA_FOCO : SOMBRA_REPOUSO,
        duration: reduzido ? 0 : emFoco ? 0.8 : 0.55,
        ease: emFoco ? 'back.out(1.7)' : 'power3.out',
        overwrite: 'auto',
      });
    }
  });
}

/** Card bloqueado: uma tremidinha de "não dá", sem sair do lugar. */
export function negar(card, { reduzido = false } = {}) {
  if (reduzido) return;
  gsap.fromTo(
    card,
    { x: 0 },
    { keyframes: { x: [0, -7, 6, -4, 3, 0] }, duration: 0.45, ease: 'power1.out', overwrite: 'auto' },
  );
}

export { SOMBRA_REPOUSO };
