import assert from 'node:assert/strict';
import test from 'node:test';
import { BALDES, CATALOGO, baldeDoModulo, catalogoDeModulos, tipoDaDescricao } from './tipos.mjs';

test('o catálogo não repete id nem sigla', () => {
  const ids = CATALOGO.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  const siglas = CATALOGO.map((t) => t.sigla).filter(Boolean);
  assert.equal(new Set(siglas).size, siglas.length);
});

test('os baldes são os 6 tipos dos cards mais outros', () => {
  assert.deepEqual(BALDES, ['leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros']);
});

for (const [id, balde] of [
  [23, 'leis'],
  [26, 'decretos'],
  [25, 'decretos'],
  [53, 'decretos'],
  [28, 'resolucoes'],
  [51, 'resolucoes'],
  [54, 'resolucoes'],
  [56, 'resolucoes'],
  [29, 'portarias'],
  [24, 'complementares'],
  [27, 'emendas'],
  [41, 'outros'],
  [31, 'outros'],
  [21, 'outros'],
  [22, 'outros'],
  [999, 'outros'],
]) {
  test(`módulo ${id} cai no balde ${balde}`, () => {
    assert.equal(baldeDoModulo(id), balde);
  });
}

test('Lei do Legislativo (41) nunca cai em leis (armadilha da sigla L)', () => {
  assert.equal(CATALOGO.find((t) => t.id === 41).sigla, 'l');
  assert.notEqual(baldeDoModulo(41), 'leis');
});

test('módulo nulo ou de tipo estranho cai em outros', () => {
  assert.equal(baldeDoModulo(null), 'outros');
  assert.equal(baldeDoModulo(undefined), 'outros');
  assert.equal(baldeDoModulo('23'), 'outros');
});

test('tipoDaDescricao lê o tipo antes de " nº"', () => {
  assert.equal(tipoDaDescricao('Lei Ordinária nº 2.361/2026 / Versão compilada ...'), 23);
});

test('tipoDaDescricao não confunde Lei Ordinária, Complementar e do Legislativo', () => {
  assert.equal(tipoDaDescricao('Lei Complementar nº 10/2020'), 24);
  assert.equal(tipoDaDescricao('Lei do Legislativo nº 3/2019'), 41);
});

test('tipoDaDescricao ignora maiúsculas e acentos', () => {
  assert.equal(tipoDaDescricao('RESOLUCAO Nº 5/2021'), 28);
  assert.equal(tipoDaDescricao('lei ordinaria N° 7/2021'), 23);
  assert.equal(tipoDaDescricao('Emenda à Lei Orgânica nº 1/2020'), 27);
});

for (const prefixo of ['altera:', 'revoga:', 'prorroga:', 'relacionada:', 'Altera: ', 'ALTERA : ']) {
  test(`tipoDaDescricao tira o prefixo "${prefixo}"`, () => {
    assert.equal(tipoDaDescricao(`${prefixo} Decreto Municipal nº 12/2022`), 26);
  });
}

test('tipoDaDescricao devolve null para tipo desconhecido', () => {
  assert.equal(tipoDaDescricao('Instrução Inventada nº 1/2020'), null);
});

test('tipoDaDescricao devolve null sem " nº", vazio ou não texto', () => {
  assert.equal(tipoDaDescricao('Lei Ordinária 2361'), null);
  assert.equal(tipoDaDescricao(''), null);
  assert.equal(tipoDaDescricao(null), null);
  assert.equal(tipoDaDescricao(42), null);
});

test('catalogoDeModulos monta o reconhecedor a partir do ModulosNorma/Get', () => {
  const catalogo = catalogoDeModulos([{ id: 900, sigla: 'zz', nomeSingular: 'Norma Sintética' }]);
  assert.equal(tipoDaDescricao('Norma Sintetica nº 1/2020', catalogo), 900);
  assert.equal(tipoDaDescricao('Lei Ordinária nº 1/2020', catalogo), null);
});

test('catalogoDeModulos ignora itens sem id ou sem nome', () => {
  assert.deepEqual(catalogoDeModulos([{ id: 1 }, { nomeSingular: 'x' }, null]), []);
});
