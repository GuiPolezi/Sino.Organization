/*
 * Material de cada peça do gorro, a partir da descrição de montagem.js. Os
 * lisos vêm de materialNatal; os com textura, o cetim e o logo nascem aqui no
 * 1º uso e ficam guardados. Todos são compartilhados: nunca descartar.
 */
import { LOGO, clay } from '../../../pages/Suporte/boneco/geometrias.js';
import { materialNatal } from '../materiais.js';
import { corNatal } from '../paleta.js';
import { texturaBengala, texturaListrasCaido, texturaPunho, texturaTrico } from './texturasGorro.js';

const TEXTURAS = {
  bengala: texturaBengala,
  listrasCaido: texturaListrasCaido,
  trico: texturaTrico,
  punho: texturaPunho,
};

const cache = new Map();
const guardado = (chave, criar) => {
  if (!cache.has(chave)) cache.set(chave, criar());
  return cache.get(chave);
};

/**
 * @param {{ cor?: string, acabamento?: string, textura?: string, logo?: boolean }} descricao
 * @returns {import('three').Material}
 */
export function materialGorro(descricao) {
  if (descricao.logo) return LOGO;
  if (descricao.textura) {
    const desenhar = TEXTURAS[descricao.textura];
    if (!desenhar) throw new Error(`Textura de gorro desconhecida: ${descricao.textura}`);
    // Pelúcia de tricô: fosca como a massinha, com a cor toda na textura.
    return guardado(`textura:${descricao.textura}`, () => Object.assign(clay('#FFFFFF'), { map: desenhar(), roughness: 0.9 }));
  }
  // Pompom do "luxo": acetinado, entre a massinha e o ouro.
  if (descricao.acabamento === 'cetim') {
    return guardado(`cetim:${descricao.cor}`, () => Object.assign(clay(corNatal(descricao.cor)), { roughness: 0.6 }));
  }
  return materialNatal(descricao.cor, descricao.acabamento);
}
