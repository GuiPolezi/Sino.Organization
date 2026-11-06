/*
 * Movimento reduzido para o Natal. MOVIMENTO.reduzido é mantido pela Cena
 * (Suporte/cena/Cena.jsx); onde ela não existe (o holograma da home), vale a
 * media query, consultada uma vez e acompanhada por um listener preguiçoso.
 */
import { MOVIMENTO } from '../../pages/Suporte/store.js';
import { MEDIA } from '../../utils/media.js';

let consulta = null;
let reduzidoNoSistema = false;

function acompanhar() {
  if (consulta || typeof window === 'undefined' || !window.matchMedia) return;
  consulta = window.matchMedia(MEDIA.reducedMotion);
  reduzidoNoSistema = consulta.matches;
  consulta.addEventListener('change', (evento) => {
    reduzidoNoSistema = evento.matches;
  });
}

/** Barato o bastante para chamar a cada frame. */
export function movimentoReduzido() {
  acompanhar();
  return MOVIMENTO.reduzido || reduzidoNoSistema;
}
