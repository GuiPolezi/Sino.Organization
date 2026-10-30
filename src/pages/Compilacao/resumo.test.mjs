// Casos das contas de /compilacao (resumo.js e dados.js).
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import { META_DO_MES, TIPOS_DE_NORMA, normasPorDia } from './dados.js';
import { EQUIPE_COMPILACAO } from './equipe.js';
import { producaoDe, repartir, resumoCompilacao } from './resumo.js';

// Uma sexta-feira.
const HOJE = '2026-10-30';

test('repartir: inteiros que somam o total, pelos maiores restos', () => {
  assert.deepEqual(repartir(10, [0.5, 0.25, 0.25]), [5, 3, 2]);
  assert.deepEqual(repartir(7, [1 / 3, 1 / 3, 1 / 3]), [3, 2, 2]);
  assert.deepEqual(repartir(0, [0.6, 0.4]), [0, 0]);
  const tipos = repartir(813, TIPOS_DE_NORMA.map(({ parte }) => parte));
  assert.equal(tipos.reduce((a, b) => a + b, 0), 813);
});

test('as partes dos tipos de norma somam 1', () => {
  const soma = TIPOS_DE_NORMA.reduce((total, { parte }) => total + parte, 0);
  assert.ok(Math.abs(soma - 1) < 1e-9);
});

test('a produção do dia a dia é sempre a mesma, sem sábado e domingo, e some para quem não está em dados.js', () => {
  const porDia = normasPorDia('leonardo', HOJE);
  assert.deepEqual(normasPorDia('leonardo', HOJE), porDia);
  assert.equal(porDia['2026-10-25'], undefined, 'domingo');
  assert.equal(porDia['2026-10-24'], undefined, 'sábado');
  assert.ok(porDia['2026-10-29'] > 0);
  assert.deepEqual(normasPorDia('ninguem', HOJE), {});
  assert.equal(producaoDe('ninguem', HOJE).totais.mes, 0);
});

test('o resumo da equipe: totais, ranking do maior para o menor, últimos dias e tipos que fecham o total', () => {
  const resumo = resumoCompilacao(EQUIPE_COMPILACAO, HOJE);
  assert.equal(resumo.totalCompiladores, 7);
  assert.equal(resumo.ranking.length, 7);
  const somaDoMes = resumo.ranking.reduce((total, { normasMes }) => total + normasMes, 0);
  assert.equal(resumo.normasMes, somaDoMes);
  assert.ok(resumo.ranking.every((pessoa, i, lista) => i === 0 || lista[i - 1].normasMes >= pessoa.normasMes));
  assert.equal(resumo.porTipo.reduce((total, { valor }) => total + valor, 0), resumo.normasMes);
  assert.equal(resumo.dias.length, 5);
  assert.equal(resumo.dias.at(-1).rotulo, 'Hoje');
  assert.equal(resumo.meta, META_DO_MES);
  assert.equal(resumo.metaCumprida, Math.round((resumo.normasMes / META_DO_MES) * 100));
});

test('sem ninguém na equipe, tudo zera sem quebrar', () => {
  const resumo = resumoCompilacao([], HOJE);
  assert.equal(resumo.normasMes, 0);
  assert.deepEqual(resumo.ranking, []);
  assert.ok(resumo.porTipo.every(({ valor }) => valor === 0));
});
