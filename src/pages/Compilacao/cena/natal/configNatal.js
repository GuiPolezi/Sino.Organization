/*
 * A árvore de /compilacao (formato de src/tema/natal/cenario.js). Em paisagem,
 * ao lado da mesa do café: o obstáculo encosta no dela e fecha um canto onde
 * ninguém passa. Em retrato, atrás da mesa do café, que fica de lado. Só dados,
 * lidos pela página e pelo teste (src/tema/natal/natal.test.mjs).
 */
export const NATAL_COMPILACAO = {
  arvore: {
    // Elipse da área menos 0,05 m: a margem do tapete é curta (0,55 m).
    angulo: -160,
    alemDaArea: -0.05,
    centroRetrato: { x: -4.6, z: -0.4 },
    escala: 1.05,
    obstaculo: { r: 1.15 },
    presentes: 'fora',
  },
};
