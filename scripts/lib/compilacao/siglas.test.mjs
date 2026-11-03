import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolherSigla, traduzirSigla } from './siglas.mjs';

const SEM_FLAGS = { sigla_duvidosa: false, nao_municipal: false };

test('traduz cada sigla da planilha para o módulo e o balde do sistema', () => {
  const esperado = {
    L: [23, 'leis'],
    LC: [24, 'complementares'],
    D: [26, 'decretos'],
    DL: [25, 'decretos'],
    ELOM: [27, 'emendas'],
    R: [28, 'resolucoes'],
    'R SEFIN': [51, 'resolucoes'],
    P: [29, 'portarias'],
    AM: [21, 'outros'],
    AP: [22, 'outros'],
  };
  for (const [sigla, [moduloId, balde]] of Object.entries(esperado)) {
    assert.deepEqual(traduzirSigla(sigla), { moduloId, balde, flags: SEM_FLAGS }, sigla);
  }
});

test('I16: L é Lei Ordinária (23) e nunca Lei do Legislativo (41)', () => {
  assert.equal(traduzirSigla('L').moduloId, 23);
  assert.notEqual(traduzirSigla('L ').moduloId, 41);
});

test('ignora espaços nas pontas e maiúsculas/minúsculas', () => {
  assert.equal(traduzirSigla('  dl ').moduloId, 25);
  assert.equal(traduzirSigla('r   sefin').moduloId, 51);
});

test('AM/ELOM e LL vão para "outros" sem módulo e com sigla_duvidosa', () => {
  for (const sigla of ['AM/ELOM', 'LL']) {
    assert.deepEqual(traduzirSigla(sigla), {
      moduloId: null,
      balde: 'outros',
      flags: { sigla_duvidosa: true, nao_municipal: false },
    });
  }
});

test('siglas dos comitês PCJ vão para "outros" com nao_municipal', () => {
  const siglas = ['CHB-PCJ', 'CBH-PJ1', 'CHB-PJ1', 'COMITÊS PCJ', 'PCJ-FEDERAL', 'CONJUNTA CHB-PCJ / PCJ Federal'];
  for (const sigla of siglas) {
    assert.deepEqual(traduzirSigla(sigla), {
      moduloId: null,
      balde: 'outros',
      flags: { sigla_duvidosa: false, nao_municipal: true },
    });
  }
});

test('I16: sigla desconhecida ou vazia é erro', () => {
  assert.throws(() => traduzirSigla('XYZ'), /XYZ/);
  assert.throws(() => traduzirSigla(''), /vazia/);
  assert.throws(() => traduzirSigla(null), /vazia/);
});

test('escolherSigla usa a de C e, se for "-" ou vazia, a de E', () => {
  assert.equal(escolherSigla('L ', 'L'), 'L');
  assert.equal(escolherSigla('-', 'D'), 'D');
  assert.equal(escolherSigla('', ' LC '), 'LC');
  assert.equal(escolherSigla(null, '-'), '');
  assert.equal(escolherSigla('-', ''), '');
});
