// Conta do festão (geometriaFestao.js): curvas, tubo mesclado e pontos ao longo do fio.
// Uso: node --test src/tema/natal/pecas/geometriaFestao.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { curvaDe, pontosAoLongo, tuboDoFestao } from './geometriaFestao.js';

// Festão do topo do quadro (4.4): 3 apoios e 2 barrigas.
const QUADRO = [
  [-1.18, 2.705, 0.07],
  [-0.59, 2.635, 0.07],
  [0, 2.705, 0.07],
  [0.59, 2.635, 0.07],
  [1.18, 2.705, 0.07],
];

test('curvaDe aceita listas [x, y, z] e objetos { x, y, z }', () => {
  const a = curvaDe([[0, 0, 0], [1, 0, 0]]);
  const b = curvaDe([{ x: 0, y: 0, z: 0 }, new THREE.Vector3(1, 0, 0)]);
  assert.ok(Math.abs(a.getLength() - 1) < 1e-6);
  assert.ok(Math.abs(b.getLength() - 1) < 1e-6);
});

test('a curva passa pelos pontos de apoio', () => {
  const curva = curvaDe(QUADRO);
  assert.ok(curva.getPoint(0).distanceTo(new THREE.Vector3(...QUADRO[0])) < 1e-6);
  assert.ok(curva.getPoint(1).distanceTo(new THREE.Vector3(...QUADRO.at(-1))) < 1e-6);
});

test('várias curvas viram uma geometria só, com a soma dos vértices', () => {
  const curvas = [curvaDe(QUADRO), curvaDe([[0, 0, 0], [0.5, -0.1, 0], [1, 0, 0]])];
  const separados = curvas.map((curva) => tuboDoFestao([curva], 0.035).getAttribute('position').count);
  const unico = tuboDoFestao(curvas, 0.035);
  assert.equal(unico.getAttribute('position').count, separados[0] + separados[1]);
  assert.ok(unico.getAttribute('uv'));
  assert.ok(unico.getIndex());
});

test('o tubo do quadro cabe no orçamento (≤ 2.500 triângulos com as lâmpadas)', () => {
  const tubo = tuboDoFestao([curvaDe(QUADRO)], 0.035);
  assert.ok(tubo.getIndex().count / 3 <= 1500, `${tubo.getIndex().count / 3} triângulos`);
});

test('a textura de agulhas repete pelo comprimento, não pela curva', () => {
  const curto = tuboDoFestao([curvaDe([[0, 0, 0], [0.5, 0, 0]])], 0.02);
  const longo = tuboDoFestao([curvaDe([[0, 0, 0], [2, 0, 0]])], 0.02);
  const maxU = (g) => Math.max(...g.getAttribute('uv').array.filter((_, i) => i % 2 === 0));
  assert.ok(Math.abs(maxU(longo) / maxU(curto) - 4) < 1e-6);
});

test('pontosAoLongo: n por curva, deslocados em y e dentro do fio', () => {
  const curvas = [curvaDe(QUADRO), curvaDe([[0, 0, 0], [1, 0, 0]])];
  const pontos = pontosAoLongo(curvas, () => 9, 0.02);
  assert.equal(pontos.length, 18);
  const ultimo = pontos.at(-1);
  // Curva reta de 0 a 1: o último dos 9 fica em u = 8,5/9.
  assert.ok(Math.abs(ultimo[0] - 8.5 / 9) < 1e-3);
  assert.ok(Math.abs(ultimo[1] - 0.02) < 1e-9);
});

test('pontosAoLongo: quantidade pelo comprimento e zero quando não há nenhum', () => {
  const reta = [curvaDe([[0, 0, 0], [2, 0, 0]])];
  assert.equal(pontosAoLongo(reta, (m) => m * 6, 0).length, 12);
  assert.deepEqual(pontosAoLongo(reta, () => 0, 0), []);
  assert.deepEqual(pontosAoLongo(reta, () => -3, 0), []);
});
