// Casos do cenário: com as estações de trabalho e depois de esvaziado.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESTACOES,
  OBSTACULOS,
  esvaziarCenario,
  longeDosObstaculos,
  reservarEstacao,
  resetarEstacoes,
  rotaAte,
} from './estacoes.js';

const AREA = { rx: 6.2, rz: 3.4 };
// De um lado ao outro do tapete, passando pelo meio do bloco de estações.
const ESQUERDA = { x: -5, z: 0 };
const DIREITA = { x: 5, z: 0 };
const CENTRO = { x: 0, z: 0 };

test('com as estações, o caminho contorna o bloco e dá para reservar um computador', () => {
  assert.equal(ESTACOES.length, 4);
  assert.ok(OBSTACULOS.length > 0);
  assert.equal(longeDosObstaculos(CENTRO), false);

  const rota = rotaAte(ESQUERDA, DIREITA);
  assert.notDeepEqual(rota.ponto, DIREITA);
  assert.ok(rota.comprimento > 10);

  assert.ok(reservarEstacao('a', AREA));
  resetarEstacoes();
});

test('cenário vazio: sem obstáculos, sem computadores e com caminho reto', () => {
  // Um obstáculo de outro módulo (como o quadro da equipe) também sai.
  OBSTACULOS.push({ x: 3, z: -2, r: 0.8, estacao: 'quadro' });
  esvaziarCenario();

  assert.equal(ESTACOES.length, 0);
  assert.equal(OBSTACULOS.length, 0);
  assert.equal(longeDosObstaculos(CENTRO), true);
  assert.deepEqual(rotaAte(ESQUERDA, DIREITA), { ponto: DIREITA, comprimento: 10 });
  assert.equal(reservarEstacao('a', AREA), null);
});
