// Cores do site (src/styles/tokens.css) para uso no three.js, que não lê CSS.
const token = (nome) =>
  getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

export const PALETA = {
  oliva: token('--color-olive'),
  olivaEscuro: token('--color-olive-dark'),
  creme: token('--color-cream'),
};
