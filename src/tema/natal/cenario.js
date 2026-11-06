/*
 * Onde fica a árvore no tapete de /suporte, /desenvolvimento e /compilacao
 * (docs/tema-natal.md, 4.2). Só dados e contas, sem three nem React: lidos por
 * NatalCenario e pelos testes. Cada página troca o padrão com configurarNatal,
 * ao carregar e antes de a cena montar (como configurarCena).
 */
import { ARVORE, PRESENTES, raioDoPresente } from './pecas/medidas.js';

const GRAUS = Math.PI / 180;
// Posição aproximada da câmera na vista geral (como em quadro/posicao.js).
const CAMERA = { x: 0, z: 14 };

/**
 * @typedef {object} ConfigArvore
 * @property {number} angulo       na elipse, em graus (0 = direita, −90 = fundo, 180 = esquerda), em paisagem
 * @property {number} anguloRetrato o mesmo, em retrato
 * @property {number} alemDaArea   quanto a elipse da árvore passa da área de caminhada (m); positivo = no anel do tapete
 * @property {{ x: number, z: number }} [centro]        centro fixo em paisagem (no lugar de angulo/alemDaArea)
 * @property {{ x: number, z: number }} [centroRetrato] centro fixo em retrato
 * @property {number} escala       1 = 2,05 m
 * @property {{ r: number } | null} obstaculo quando a árvore entra na área de caminhada (r já soma o corpo)
 * @property {'frente' | 'fora'} presentes para a câmera ou para a borda do tapete
 */

/** Padrão (/suporte): fundo esquerdo, no anel creme, fora da área de caminhada. */
export const NATAL_CENA = Object.freeze({
  arvore: Object.freeze({
    angulo: -145,
    anguloRetrato: 180,
    // 1,05: a saia (0,65 m) fica fora do alcance do corpo de quem anda na borda da área.
    alemDaArea: 1.05,
    escala: 1.05,
    obstaculo: null,
    presentes: 'frente',
  }),
});

let atual = NATAL_CENA;

/** A configuração em uso. */
export const cenaNatal = () => atual;

/**
 * Troca partes da configuração da árvore (sobre o padrão, não sobre a última troca).
 * @param {{ arvore?: Partial<ConfigArvore> }} config
 */
export function configurarNatal(config) {
  atual = Object.freeze({ ...NATAL_CENA, arvore: Object.freeze({ ...NATAL_CENA.arvore, ...config?.arvore }) });
}

/**
 * Centro da árvore no tapete.
 * @param {ConfigArvore} arvore
 * @param {{ rx: number, rz: number }} area área de caminhada atual
 * @param {boolean} retrato
 */
export function centroDaArvore(arvore, area, retrato) {
  const fixo = retrato ? arvore.centroRetrato : arvore.centro;
  if (fixo) return { x: fixo.x, z: fixo.z };
  const a = GRAUS * (retrato ? arvore.anguloRetrato : arvore.angulo);
  return { x: (area.rx + arvore.alemDaArea) * Math.cos(a), z: (area.rz + arvore.alemDaArea) * Math.sin(a) };
}

// Os três presentes no pé da árvore: modelo, desvio (rad) da direção escolhida, distância (m, escala 1) e giro.
const PE_DA_ARVORE = {
  frente: [
    { modelo: 'A', desvio: -1.0, distancia: 0.48, giro: 0.25 },
    { modelo: 'C', desvio: -0.4, distancia: 0.52, giro: -0.3 },
    { modelo: 'B', desvio: 0.9, distancia: 0.48, giro: 0.2 },
  ],
  // Para a borda o tapete acaba logo: os presentes abrem para os lados e ficam mais perto.
  fora: [
    { modelo: 'A', desvio: -1.3, distancia: 0.45, giro: -0.2 },
    { modelo: 'C', desvio: 0.05, distancia: 0.3, giro: 0.3 },
    { modelo: 'B', desvio: 1.2, distancia: 0.5, giro: -0.15 },
  ],
};

/**
 * Tudo o que a cena precisa da árvore: centro, giro para a câmera, escala, o
 * obstáculo (ou null) e os presentes no mundo.
 * @param {ConfigArvore} arvore
 * @param {{ rx: number, rz: number }} area
 * @param {boolean} retrato
 */
export function arvoreNoTapete(arvore, area, retrato) {
  const { x, z } = centroDaArvore(arvore, area, retrato);
  const rot = Math.atan2(CAMERA.x - x, CAMERA.z - z);
  // 'frente': entre a árvore e a câmera; 'fora': do lado da borda do tapete.
  const base = arvore.presentes === 'fora' ? Math.atan2(x, z) : rot;
  const presentes = (PE_DA_ARVORE[arvore.presentes] ?? PE_DA_ARVORE.frente).map(({ modelo, desvio, distancia, giro }) => {
    const a = base + desvio;
    const d = distancia * arvore.escala;
    return { modelo, x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, rot: rot + giro, raio: raioDoPresente(PRESENTES[modelo]) };
  });
  return {
    x,
    z,
    rot,
    escala: arvore.escala,
    raioSaia: ARVORE.saia.raio * arvore.escala,
    obstaculo: arvore.obstaculo ? { x, z, r: arvore.obstaculo.r } : null,
    presentes,
  };
}
