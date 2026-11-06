/*
 * Materiais do Natal, compartilhados e preguiçosos: cada um nasce na 1ª chamada,
 * fica guardado e nunca é descartado (como ESCURO e CORDAO em geometrias.js).
 * Nada é criado ao importar o módulo.
 */
import * as THREE from 'three';
import { clay } from '../../pages/Suporte/boneco/geometrias.js';
import { corNatal } from './paleta.js';

// Acabamentos (docs/tema-natal.md, 2.2). `brilho` não apaga com o NeutralToneMapping.
const ACABAMENTOS = {
  massinha: (cor) => clay(cor),
  pelucia: (cor) => Object.assign(clay(cor), { roughness: 1 }),
  veludo: (cor) => Object.assign(clay(cor), { roughness: 0.95 }),
  ouro: (cor) => Object.assign(clay(cor), { roughness: 0.45, metalness: 0.15 }),
  brilho: (cor) => new THREE.MeshBasicMaterial({ color: cor, toneMapped: false }),
};

const cache = new Map();

/**
 * Material compartilhado. Não descarte nem altere: é o mesmo para todas as peças.
 * @param {string} chave chave de PALETA_NATAL ou um hex
 * @param {'massinha' | 'pelucia' | 'veludo' | 'ouro' | 'brilho'} [acabamento]
 * @returns {THREE.Material}
 */
export function materialNatal(chave, acabamento = 'massinha') {
  const criar = ACABAMENTOS[acabamento];
  if (!criar) throw new Error(`Acabamento de Natal desconhecido: ${acabamento}`);
  const id = `${acabamento}:${chave}`;
  if (!cache.has(id)) cache.set(id, criar(corNatal(chave)));
  return cache.get(id);
}
