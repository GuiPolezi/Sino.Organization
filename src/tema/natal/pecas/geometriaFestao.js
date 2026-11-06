/*
 * Conta do festão, sem React nem DOM (roda nos testes em Node): o tubo de
 * pinheiro numa ou mais curvas, mesclado numa geometria só, e os pontos ao
 * longo dele para as lâmpadas e as bolinhas.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Comprimento (m) de uma repetição da textura de agulhas ao longo do tubo.
const PASSO_AGULHAS = 0.06;
// Segmentos do tubo por metro (mínimo 8 por curva).
const SEGMENTOS_POR_METRO = 24;

const vetor = (p) => (Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : new THREE.Vector3(p.x, p.y, p.z));

/**
 * Curva suave pelos pontos ('centripetal' não dá laçadas nem passa do ponto).
 * @param {Array<[number, number, number] | { x: number, y: number, z: number }>} pontos
 * @param {boolean} [fechada]
 */
export const curvaDe = (pontos, fechada = false) => new THREE.CatmullRomCurve3(pontos.map(vetor), fechada, 'centripetal');

/**
 * Tubo de todas as curvas numa geometria só. O `u` da UV vai em metros/PASSO_AGULHAS,
 * para as agulhas terem o mesmo tamanho em festões curtos e longos.
 * @param {THREE.Curve<THREE.Vector3>[]} curvas
 * @param {number} raio
 * @param {boolean} [fechada]
 * @returns {THREE.BufferGeometry}
 */
export function tuboDoFestao(curvas, raio, fechada = false) {
  const tubos = curvas.map((curva) => {
    const comprimento = curva.getLength();
    const segmentos = Math.max(8, Math.ceil(comprimento * SEGMENTOS_POR_METRO));
    const tubo = new THREE.TubeGeometry(curva, segmentos, raio, 8, fechada);
    const uv = tubo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) * comprimento) / PASSO_AGULHAS);
    return tubo;
  });
  if (tubos.length === 1) return tubos[0];
  const unico = mergeGeometries(tubos);
  tubos.forEach((tubo) => tubo.dispose());
  return unico;
}

/**
 * Pontos espalhados por igual no comprimento de cada curva, `dy` acima do fio
 * (negativo: abaixo). `quantos(comprimento)` diz quantos em cada curva; `desvio`
 * (0..1) desloca todos dentro do passo, para lâmpadas e bolinhas se alternarem.
 * @param {THREE.Curve<THREE.Vector3>[]} curvas
 * @param {(comprimento: number) => number} quantos
 * @param {number} dy
 * @param {number} [desvio]
 * @returns {[number, number, number][]}
 */
export function pontosAoLongo(curvas, quantos, dy, desvio = 0.5) {
  return curvas.flatMap((curva) => {
    const n = Math.max(0, Math.round(quantos(curva.getLength())));
    return Array.from({ length: n }, (_, i) => {
      const p = curva.getPointAt((i + desvio) / n);
      return [p.x, p.y + dy, p.z];
    });
  });
}
