/*
 * A árvore de /desenvolvimento (formato de src/tema/natal/cenario.js). A margem
 * do tapete é curta (0,55 m), então a árvore entra na borda da área e vira
 * obstáculo. Em paisagem fica no fundo esquerdo, atrás da mesa dev-fundo; em
 * retrato, na lateral esquerda. Só dados, lidos pela página e pelo teste.
 */
export const NATAL_DEV = {
  arvore: {
    // Na elipse (rx + margem − 0,6; rz + margem − 0,6): (−7,53; −2,65) e, em retrato, (−5,00; 0).
    angulo: -150,
    anguloRetrato: 180,
    alemDaArea: -0.05,
    escala: 1.05,
    obstaculo: { r: 1.15 },
    presentes: 'fora',
  },
};
