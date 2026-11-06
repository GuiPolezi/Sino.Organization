// Paleta do Natal (paleta.js): chaves, resolução de cor e a mistura 70/15/15 das lâmpadas.
// Uso: node --test src/tema/natal/paleta.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { LUZ_CORES, PALETA_NATAL, corNatal, coresLuzinhas } from './paleta.js';

const HEX = /^#[0-9A-F]{6}$/;

test('toda cor da paleta é um hex de 6 dígitos e nenhuma é o branco puro', () => {
  for (const [chave, hex] of Object.entries(PALETA_NATAL)) {
    assert.match(hex, HEX, chave);
    assert.notEqual(hex, '#FFFFFF', chave);
  }
  LUZ_CORES.forEach((hex) => assert.match(hex, HEX));
});

test('a paleta não pode ser alterada', () => {
  assert.ok(Object.isFrozen(PALETA_NATAL));
  assert.ok(Object.isFrozen(LUZ_CORES));
});

test('corNatal resolve chaves e devolve o resto igual', () => {
  assert.equal(corNatal('vermelho'), '#C8423B');
  assert.equal(corNatal('#DCE8EC'), '#DCE8EC');
  // Chaves herdadas de Object não são cores.
  assert.equal(corNatal('toString'), 'toString');
});

test('coresLuzinhas: uma cor por lâmpada, sempre as mesmas', () => {
  assert.deepEqual(coresLuzinhas(0), []);
  assert.equal(coresLuzinhas(34).length, 34);
  assert.deepEqual(coresLuzinhas(34), coresLuzinhas(34));
  const validas = new Set([PALETA_NATAL.luzQuente, PALETA_NATAL.luzAmbar, ...LUZ_CORES]);
  coresLuzinhas(50).forEach((cor) => assert.ok(validas.has(cor), cor));
});

test('coresLuzinhas: perto de 70% quentes, 15% âmbar e 15% coloridas', () => {
  for (const n of [34, 50, 100]) {
    const cores = coresLuzinhas(n);
    const parte = (filtro) => cores.filter(filtro).length / n;
    assert.ok(Math.abs(parte((c) => c === PALETA_NATAL.luzQuente) - 0.7) <= 0.05, `quentes, n=${n}`);
    assert.ok(Math.abs(parte((c) => c === PALETA_NATAL.luzAmbar) - 0.15) <= 0.05, `âmbar, n=${n}`);
    assert.ok(Math.abs(parte((c) => LUZ_CORES.includes(c)) - 0.15) <= 0.05, `coloridas, n=${n}`);
  }
});

test('coresLuzinhas: nunca três coloridas seguidas', () => {
  const cores = coresLuzinhas(100);
  const colorida = (c) => c !== PALETA_NATAL.luzQuente;
  for (let i = 2; i < cores.length; i++) {
    assert.ok(!(colorida(cores[i - 2]) && colorida(cores[i - 1]) && colorida(cores[i])), `posição ${i}`);
  }
});
