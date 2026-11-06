/*
 * Medidas da árvore e dos presentes (docs/tema-natal.md, 4.1). Só dados: lidos
 * pelo desenho (ArvoreNatal, Presente), pela disposição no tapete (cenario.js)
 * e pelos testes em Node.
 */

/** Árvore na escala 1, pé em y = 0 (m). */
export const ARVORE = Object.freeze({
  // Saia de algodão: o raio total e a altura do volume.
  saia: Object.freeze({ raio: 0.62, altura: 0.06 }),
  tronco: Object.freeze({ raio: 0.08, altura: 0.28 }),
  // Camadas de baixo para cima: raio da base, altura e y do centro; dentes da borda ondulada.
  camadas: Object.freeze([
    Object.freeze({ r: 0.62, h: 0.62, y: 0.55, dentes: 9 }),
    Object.freeze({ r: 0.5, h: 0.55, y: 0.95, dentes: 8 }),
    Object.freeze({ r: 0.38, h: 0.48, y: 1.3, dentes: 7 }),
    Object.freeze({ r: 0.25, h: 0.4, y: 1.62, dentes: 6 }),
  ]),
  bolas: Object.freeze({ quantas: 16, raio: 0.055 }),
  luzes: Object.freeze({ quantas: 34, raio: 0.022, voltas: 3 }),
  estrela: Object.freeze({ raio: 0.13, profundidade: 0.04, bisel: 0.015, y: 1.93 }),
  // pointLight quente: posição local, alcance e intensidade com luzAcesa = 1. A 0,95 m da frente
  // (e não 0,6) para não fazer uma mancha clara nas camadas.
  luz: Object.freeze({ posicao: Object.freeze([0, 1.1, 0.95]), distancia: 3.2, intensidade: 0.9 }),
});

/** Os quatro presentes fixos (m): caixa e cor da fita. */
export const PRESENTES = Object.freeze({
  A: Object.freeze({ largura: 0.34, altura: 0.34, profundidade: 0.34, cor: 'vermelho', fita: 'creme' }),
  B: Object.freeze({ largura: 0.26, altura: 0.22, profundidade: 0.26, cor: 'oliva', fita: 'ouro' }),
  C: Object.freeze({ largura: 0.4, altura: 0.18, profundidade: 0.3, cor: 'creme', fita: 'vermelho' }),
  D: Object.freeze({ largura: 0.22, altura: 0.32, profundidade: 0.22, cor: 'verdeAgua', fita: 'creme' }),
});

/** Meia diagonal da base de um presente: o raio do círculo que o cobre no chão. */
export const raioDoPresente = ({ largura, profundidade }) => Math.hypot(largura, profundidade) / 2;
