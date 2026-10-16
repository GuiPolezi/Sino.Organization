// Casos do cenário: com as estações de trabalho e depois sem elas.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ESTACOES,
  OBSTACULOS,
  longeDosObstaculos,
  reservarEstacao,
  resetarEstacoes,
  rotaAte,
  tirarEstacoes,
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

test('sem as estações: sem computadores e com caminho reto, mas o quadro continua no caminho', () => {
  // Um obstáculo de outro módulo (como o quadro da equipe) fica.
  const quadro = { x: 3, z: -2, r: 0.8, estacao: 'quadro' };
  OBSTACULOS.push(quadro);
  tirarEstacoes();

  assert.equal(ESTACOES.length, 0);
  assert.deepEqual(OBSTACULOS, [quadro]);
  assert.equal(longeDosObstaculos(CENTRO), true);
  assert.equal(longeDosObstaculos({ x: 3, z: -2 }), false);
  assert.deepEqual(rotaAte(ESQUERDA, DIREITA), { ponto: DIREITA, comprimento: 10 });
  assert.equal(reservarEstacao('a', AREA), null);
});
