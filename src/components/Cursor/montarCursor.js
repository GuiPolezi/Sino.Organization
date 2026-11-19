import gsap from 'gsap';
import { ALVO_INTERATIVO, CLASSE_ATIVO, zonaNativa } from './zonas.js';

// Escala/opacidade de cada estado. Sobre algo clicável o disco recolhe e o
// ponto cresce; ao apertar, tudo encolhe um pouco.
const NORMAL = { disco: 1, discoOpacidade: 1, ponto: 1 };
const INTERATIVO = { disco: 0, discoOpacidade: 0, ponto: 2.2 };
const APERTO = 0.8;

// Inércia: o disco arrasta atrás; o ponto quase cola no ponteiro.
const ATRASO_DISCO = 0.6;
const ATRASO_PONTO = 0.12;

/*
 * Segue o ponteiro com quickTo (só transform). Com movimento reduzido, quickSetter
 * posiciona na hora. `salto` pula direto ao ponto, sem atravessar a tela.
 */
function criarMovimento(alvo, atraso, reduzido) {
  if (reduzido) {
    const x = gsap.quickSetter(alvo, 'x', 'px');
    const y = gsap.quickSetter(alvo, 'y', 'px');
    return (px, py) => {
      x(px);
      y(py);
    };
  }
  const x = gsap.quickTo(alvo, 'x', { duration: atraso, ease: 'power4.out' });
  const y = gsap.quickTo(alvo, 'y', { duration: atraso, ease: 'power4.out' });
  return (px, py, salto) => {
    if (salto) {
      x(px, px);
      y(py, py);
    } else {
      x(px);
      y(py);
    }
  };
}

// Anima escala/opacidade sem derrubar o quickTo de x/y (overwrite só nas mesmas props).
function criarAnimador(reduzido) {
  return (alvo, vars, duracao, ease) =>
    reduzido
      ? gsap.set(alvo, vars)
      : gsap.to(alvo, { ...vars, duration: duracao, ease, overwrite: 'auto' });
}

function criarEstado({ raiz, disco, ponto, reduzido }) {
  const animar = criarAnimador(reduzido);
  const seletorNativo = zonaNativa();
  const estado = { dentro: false, nativo: false, interativo: false, pressionado: false };
  let alvoAtual = null;
  let chave = '';

  // Descobre a zona só quando o alvo muda: nada de closest() a cada pixel.
  const avaliar = (alvo) => {
    if (alvo === alvoAtual) return;
    alvoAtual = alvo;
    const elemento = alvo instanceof Element ? alvo : null;
    estado.nativo = Boolean(elemento?.closest(seletorNativo));
    estado.interativo = !estado.nativo && Boolean(elemento?.closest(ALVO_INTERATIVO));
  };

  // Só cria tween quando o estado visual de fato muda.
  const aplicar = () => {
    const visivel = estado.dentro && !estado.nativo;
    const nova = `${visivel}|${estado.interativo}|${estado.pressionado}`;
    if (nova === chave) return;
    chave = nova;

    const alvo = estado.interativo ? INTERATIVO : NORMAL;
    const aperto = estado.pressionado ? APERTO : 1;
    animar(raiz, { opacity: visivel ? 1 : 0 }, visivel ? 0.3 : 0.15, 'power2.out');
    animar(
      disco,
      { scale: alvo.disco * aperto, opacity: alvo.discoOpacidade },
      0.34,
      estado.interativo ? 'power4.in' : 'power4.out',
    );
    animar(ponto, { scale: alvo.ponto * aperto }, 0.3, 'power3.out');
  };

  const esquecerAlvo = () => {
    alvoAtual = null;
  };

  return { estado, avaliar, aplicar, esquecerAlvo };
}

/*
 * Liga o cursor: um único pointermove move e avalia a zona; os demais eventos
 * só ajustam estado. Devolve a limpeza (chamada pelo gsap.matchMedia).
 */
export function montarCursor({ raiz, disco, ponto, reduzido }) {
  const html = document.documentElement;
  const moverDisco = criarMovimento(disco, ATRASO_DISCO, reduzido);
  const moverPonto = criarMovimento(ponto, ATRASO_PONTO, reduzido);
  const { estado, avaliar, aplicar, esquecerAlvo } = criarEstado({ raiz, disco, ponto, reduzido });
  const posicao = { x: 0, y: 0 };
  let quadro = 0;

  const aoMover = (evento) => {
    if (evento.pointerType === 'touch') return;
    posicao.x = evento.clientX;
    posicao.y = evento.clientY;
    // Ao entrar (ou voltar) na janela, aparece já no lugar certo.
    const salto = !estado.dentro;
    moverDisco(posicao.x, posicao.y, salto);
    moverPonto(posicao.x, posicao.y, salto);
    estado.dentro = true;
    avaliar(evento.target);
    aplicar();
  };

  // relatedTarget nulo: o ponteiro saiu da janela (ou entrou num iframe).
  const aoSair = (evento) => {
    if (evento.pointerType === 'touch' || evento.relatedTarget) return;
    estado.dentro = false;
    esquecerAlvo();
    aplicar();
  };

  const aoApertar = (evento) => {
    if (evento.pointerType === 'touch') return;
    estado.pressionado = evento.type === 'pointerdown';
    aplicar();
  };

  /*
   * Rolagem, clique (que pode abrir um modal) e fechamento de <dialog> trocam o
   * que está sob um ponteiro parado; reavalia uma vez no próximo quadro.
   */
  const reavaliar = () => {
    quadro = 0;
    if (!estado.dentro) return;
    avaliar(document.elementFromPoint(posicao.x, posicao.y));
    aplicar();
  };
  const agendar = () => {
    if (!quadro) quadro = requestAnimationFrame(reavaliar);
  };

  const passivo = { passive: true };
  const ouvintes = [
    [window, 'pointermove', aoMover, passivo],
    [document, 'pointerout', aoSair, passivo],
    [window, 'pointerdown', aoApertar, passivo],
    [window, 'pointerup', aoApertar, passivo],
    [window, 'pointercancel', aoApertar, passivo],
    [window, 'scroll', agendar, passivo],
    [document, 'click', agendar, { capture: true, passive: true }],
    // `close` do <dialog> não borbulha: só a captura o vê no document.
    [document, 'close', agendar, { capture: true, passive: true }],
  ];

  html.classList.add(CLASSE_ATIVO);
  ouvintes.forEach(([alvo, tipo, fn, opcoes]) => alvo.addEventListener(tipo, fn, opcoes));

  return () => {
    ouvintes.forEach(([alvo, tipo, fn, opcoes]) => alvo.removeEventListener(tipo, fn, opcoes));
    cancelAnimationFrame(quadro);
    html.classList.remove(CLASSE_ATIVO);
    gsap.killTweensOf([raiz, disco, ponto]);
    gsap.set([raiz, disco, ponto], { clearProps: 'all' });
  };
}
