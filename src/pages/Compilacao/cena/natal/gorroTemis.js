/*
 * Geometrias do gorro da Têmis, sem React (rodam em Node): o cone dobrado que
 * cai para o lado, a aba de pelúcia "fofa" e o pompom com calombos.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Cone com a base em y = 0, dobrado em arco para a direção horizontal `dir`
 * (docs/tema-natal.md, 5.2). O comprimento do eixo se mantém.
 * @param {number} raioBase
 * @param {number} altura
 * @param {number} curva quanto dobra (rad): 0 = reto
 * @param {[number, number]} dir direção (x, z) para onde a ponta cai
 * @returns {{ geometria: THREE.BufferGeometry, ponta: THREE.Vector3, tangente: THREE.Vector3 }}
 */
export function coneCurvo(raioBase, altura, curva, [dx, dz]) {
  const geometria = new THREE.ConeGeometry(raioBase, altura, 20, 12).translate(0, altura / 2, 0);
  const R = altura / curva;
  const pos = geometria.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = x * dx + z * dz;
    const theta = (curva * pos.getY(i)) / altura;
    const u2 = R - (R - u) * Math.cos(theta);
    pos.setXYZ(i, x + (u2 - u) * dx, (R - u) * Math.sin(theta), z + (u2 - u) * dz);
  }
  geometria.computeVertexNormals();
  const pontaU = R * (1 - Math.cos(curva));
  return {
    geometria,
    ponta: new THREE.Vector3(pontaU * dx, R * Math.sin(curva), pontaU * dz),
    tangente: new THREE.Vector3(Math.sin(curva) * dx, Math.cos(curva), Math.sin(curva) * dz),
  };
}

/** Aba de pelúcia deitada (no plano xz), com o volume ondulado de 2.2. */
export function abaFofa(raio, tubo) {
  const g = new THREE.TorusGeometry(raio, tubo, 10, 32);
  const pos = g.getAttribute('position');
  const v = new THREE.Vector3();
  const centro = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const theta = Math.atan2(v.y, v.x);
    centro.set(Math.cos(theta) * raio, Math.sin(theta) * raio, 0);
    const lado = v.clone().sub(centro);
    const phi = Math.atan2(lado.z, lado.x * Math.cos(theta) + lado.y * Math.sin(theta));
    lado.multiplyScalar(1 + 0.07 * Math.sin(9 * theta) * Math.sin(5 * phi));
    pos.setXYZ(i, centro.x + lado.x, centro.y + lado.y, centro.z + lado.z);
  }
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Pompom de pelúcia com calombos leves. */
export function pompom(raio) {
  // Vértices unidos: as normais ficam lisas (o icosaedro vem com as faces soltas).
  const g = mergeVertices(new THREE.IcosahedronGeometry(raio, 2).deleteAttribute('normal').deleteAttribute('uv'));
  const pos = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    v.multiplyScalar(1 + 0.08 * Math.sin(7 * n.x + 1) * Math.sin(6 * n.y) * Math.sin(5 * n.z + 2));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
