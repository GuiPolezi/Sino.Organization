import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOCO, empurrao } from './cardsAnimations.js';

const perto = (a, b) => Math.abs(a - b) < 1e-9;

test('empurrao: o vizinho se afasta do card em foco, sempre com a mesma distância', () => {
  const foco = { x: 100, y: 100 };
  const casos = [
    [{ x: 300, y: 100 }, { x: 10, y: 0 }], // à direita
    [{ x: -50, y: 100 }, { x: -10, y: 0 }], // à esquerda
    [{ x: 100, y: 400 }, { x: 0, y: 10 }], // abaixo
  ];
  for (const [vizinho, esperado] of casos) {
    const { x, y } = empurrao(foco, vizinho, 10);
    assert.ok(perto(x, esperado.x) && perto(y, esperado.y), `${JSON.stringify(vizinho)} → ${x},${y}`);
  }
  // Na diagonal, a distância total continua a pedida.
  const diagonal = empurrao(foco, { x: 400, y: 400 }, 10);
  assert.ok(perto(Math.hypot(diagonal.x, diagonal.y), 10));
  assert.ok(diagonal.x > 0 && diagonal.y > 0);
});

test('empurrao: no mesmo centro não move (sem divisão por zero)', () => {
  assert.deepEqual(empurrao({ x: 5, y: 5 }, { x: 5, y: 5 }, 14), { x: 0, y: 0 });
});

test('foco: o card cresce, os vizinhos encolhem e os bonecos crescem mais que o card', () => {
  assert.ok(FOCO.escala > 1);
  assert.ok(FOCO.vizinhoEscala < 1);
  assert.ok(FOCO.arteEscala > FOCO.escala);
});
