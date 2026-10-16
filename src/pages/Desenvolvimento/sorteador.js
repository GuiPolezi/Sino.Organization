/**
 * Sequência pseudoaleatória fixa por texto (FNV-1a semeando um mulberry32): o
 * mesmo texto dá sempre os mesmos números, entre 0 (inclusive) e 1. Usada nos
 * chamados de demonstração e no traço dos rabiscos dos gráficos.
 * @param {string} texto
 * @returns {() => number}
 */
export function sorteador(texto) {
  let estado = 2166136261;
  for (const letra of texto) estado = Math.imul(estado ^ letra.codePointAt(0), 16777619);
  return () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), estado | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
