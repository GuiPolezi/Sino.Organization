import assert from 'node:assert/strict';
import { test } from 'node:test';
import { primeiroLugar, primeirosLugares, topoDoGrafico } from './destaques.js';

const valor = ({ n }) => n;

test('primeiroLugar: fica com o maior valor', () => {
  const pessoas = [{ id: 'a', n: 3 }, { id: 'b', n: 9 }, { id: 'c', n: 4 }];
  assert.deepEqual(primeiroLugar(pessoas, valor), { pessoa: pessoas[1], valor: 9 });
});

test('primeiroLugar: no empate, quem vem antes na lista', () => {
  const pessoas = [{ id: 'a', n: 5 }, { id: 'b', n: 7 }, { id: 'c', n: 7 }];
  assert.equal(primeiroLugar(pessoas, valor).pessoa.id, 'b');
});

test('primeiroLugar: lista vazia ou todos em zero, ninguém', () => {
  assert.equal(primeiroLugar([], valor), null);
  assert.equal(primeiroLugar([{ n: 0 }, { n: 0 }], valor), null);
});

test('topoDoGrafico: número redondo com folga acima do valor', () => {
  assert.equal(topoDoGrafico(300), 500);
  assert.equal(topoDoGrafico(12), 20);
  assert.equal(topoDoGrafico(6), 10);
  assert.equal(topoDoGrafico(1), 2);
  assert.equal(topoDoGrafico(160), 200);
  assert.equal(topoDoGrafico(170), 250);
});

test('topoDoGrafico: a barra fica entre dois quintos e quatro quintos da altura', () => {
  for (let v = 1; v <= 5000; v++) {
    const fracao = v / topoDoGrafico(v);
    assert.ok(fracao >= 0.4 && fracao <= 0.8, `${v}: ${fracao}`);
  }
});

test('topoDoGrafico: zero ainda tem topo (barra vazia)', () => {
  assert.equal(topoDoGrafico(0), 2);
});

test('primeirosLugares: um primeiro lugar por slide', () => {
  const ranking = [
    { id: 'a', normasMes: 30, emFila: 2, cidades: 1 },
    { id: 'b', normasMes: 20, emFila: 9, cidades: 3 },
    { id: 'c', normasMes: 10, emFila: 9, cidades: 6 },
  ];
  const primeiros = primeirosLugares(ranking);
  assert.equal(primeiros.compiladas.pessoa.id, 'a');
  assert.deepEqual([primeiros.fila.pessoa.id, primeiros.fila.valor], ['b', 9]);
  assert.deepEqual([primeiros.cidades.pessoa.id, primeiros.cidades.valor], ['c', 6]);
  assert.equal(primeirosLugares(ranking.map((p) => ({ ...p, cidades: 0 }))).cidades, null);
});

test('primeirosLugares: quem está em "—" (null) fica fora do ranking', () => {
  const ranking = [
    { id: 'a', normasMes: null, emFila: null, cidades: 0 },
    { id: 'b', normasMes: 4, emFila: null, cidades: 2 },
  ];
  const primeiros = primeirosLugares(ranking);
  assert.equal(primeiros.compiladas.pessoa.id, 'b');
  assert.equal(primeiros.fila, null);
});
