// Obstáculos do Natal (obstaculos.js): entram em OBSTACULOS com a marca 'natal',
// são atualizados no lugar, saem sem levar os dos outros e sobrevivem a definirEstacoes.
// Uso: node --test src/tema/natal/obstaculos.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { BASES_SUPORTE, OBSTACULOS, definirEstacoes } from '../../pages/Suporte/boneco/estacoes.js';
import { MARCA_NATAL, sincronizarObstaculos, tirarObstaculos } from './obstaculos.js';

const doNatal = () => OBSTACULOS.filter(({ estacao }) => estacao === MARCA_NATAL);

test('põe os círculos com a marca natal e tira só eles', () => {
  const antes = [...OBSTACULOS];
  const postos = sincronizarObstaculos([], [
    { x: -5.9, z: -2.52, r: 1.15 },
    { x: 1, z: 2, r: 0.5 },
  ]);
  assert.equal(doNatal().length, 2);
  assert.deepEqual(postos[0], { x: -5.9, z: -2.52, r: 1.15, estacao: MARCA_NATAL });
  tirarObstaculos(postos);
  assert.deepEqual(OBSTACULOS, antes);
});

test('atualiza os mesmos objetos, põe os que faltam e tira os que sobram', () => {
  const primeiros = sincronizarObstaculos([], [{ x: 0, z: 0, r: 1 }]);
  const segundos = sincronizarObstaculos(primeiros, [
    { x: 3, z: 4, r: 0.8 },
    { x: -1, z: 1, r: 0.6 },
  ]);
  assert.equal(segundos[0], primeiros[0], 'o 1º círculo é o mesmo objeto');
  assert.deepEqual({ ...segundos[0] }, { x: 3, z: 4, r: 0.8, estacao: MARCA_NATAL });
  assert.equal(doNatal().length, 2);

  const terceiros = sincronizarObstaculos(segundos, [{ x: 5, z: 5, r: 0.4 }]);
  assert.equal(doNatal().length, 1);
  assert.ok(!OBSTACULOS.includes(segundos[1]), 'o que sobrou saiu');
  tirarObstaculos(terceiros);
  assert.equal(doNatal().length, 0);
});

test('nunca entra duas vezes e volta se alguém o tirou da lista', () => {
  const postos = sincronizarObstaculos([], [{ x: 0, z: 0, r: 1 }]);
  sincronizarObstaculos(postos, [{ x: 0, z: 0, r: 1 }]);
  assert.equal(doNatal().length, 1);
  OBSTACULOS.splice(OBSTACULOS.indexOf(postos[0]), 1);
  sincronizarObstaculos(postos, [{ x: 0, z: 0, r: 1 }]);
  assert.equal(doNatal().length, 1);
  tirarObstaculos(postos);
});

test('definirEstacoes mantém os círculos do Natal', () => {
  const postos = sincronizarObstaculos([], [{ x: -5.9, z: -2.52, r: 1.15 }]);
  definirEstacoes(BASES_SUPORTE);
  assert.ok(OBSTACULOS.includes(postos[0]));
  tirarObstaculos(postos);
  assert.equal(doNatal().length, 0);
});
