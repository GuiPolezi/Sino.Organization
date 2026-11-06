/*
 * Cores do Natal (docs/tema-natal.md, 2.1). Só dados: nada de THREE nem de DOM,
 * para rodar nos testes em Node. Oliva, creme e menta repetem os tokens de
 * src/styles/tokens.css (Suporte/cena/paleta.js lê o CSS ao importar, por isso
 * não entra aqui).
 */
export const PALETA_NATAL = Object.freeze({
  vermelho: '#C8423B',
  vermelhoSombra: '#9E2F2B',
  vinho: '#7A1F2B',
  pinheiro: '#2F5D3A',
  pinheiroClaro: '#4E7F45',
  oliva: '#606C38',
  elfo: '#4FA46B',
  creme: '#FEFAE0',
  neve: '#F7F9F6',
  ouro: '#F2B632',
  ouroBrilho: '#FFC23D',
  ouroAntigo: '#C9A04E',
  verdeAgua: '#2E9C93',
  menta: '#B0DAC9',
  // Ouropel prateado do festão de monitor (4.3).
  prata: '#DCE8EC',
  madeira: '#7A4E2D',
  luzQuente: '#FFD27A',
  luzAmbar: '#FF9F5A',
  // pointLight quente da árvore (4.1).
  luzArvore: '#FFC98A',
  panetone: '#B5733A',
  panetonePapel: '#C98B4E',
});

// Lâmpadas coloridas: só tempero (~15%).
export const LUZ_CORES = Object.freeze(['#FF6F61', '#7FD3A8', '#7FB8F0']);

/**
 * Hex de uma chave da paleta; o que não for chave (um hex, por exemplo) volta igual.
 * @param {string} chave
 * @returns {string}
 */
export const corNatal = (chave) => (Object.hasOwn(PALETA_NATAL, chave) ? PALETA_NATAL[chave] : chave);

// Razão áurea: espalha as cores sem formar blocos da mesma cor.
const AUREA = 0.6180339887;

/**
 * Cores de n lâmpadas: ~70% quentes, ~15% âmbar e ~15% coloridas, sempre as mesmas.
 * @param {number} n
 * @returns {string[]} um hex por lâmpada
 */
export function coresLuzinhas(n) {
  return Array.from({ length: n }, (_, i) => {
    const u = (i * AUREA + 0.13) % 1;
    if (u < 0.7) return PALETA_NATAL.luzQuente;
    if (u < 0.85) return PALETA_NATAL.luzAmbar;
    return LUZ_CORES[i % LUZ_CORES.length];
  });
}
