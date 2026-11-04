// Casos do Quadro da equipe de /compilacao (resumo.js): a soma dos cards do servidor.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import { resumoCompilacao, rotuloParcial } from './resumo.js';
import { REFERENCIA, pessoaDeAtualizacoes, pessoaDeProjetos } from './respostas-teste.mjs';

const tecnicos = [
  { id: 'leonardo', nome: 'Leonardo', funcao: 'Compilador' },
  { id: 'ramon', nome: 'Ramon', funcao: 'Compilador' },
  { id: 'damaris', nome: 'Damaris', funcao: 'Compiladora' },
];

const dados = {
  referencia: REFERENCIA,
  pessoas: {
    leonardo: pessoaDeProjetos(),
    ramon: pessoaDeProjetos({ producao: { hoje: 1, semana: 5, mes: 90, tudo: null }, porTipo: { ...pessoaDeProjetos().porTipo, mes: { leis: 0, decretos: 0, resolucoes: 0, portarias: 0, complementares: 85, emendas: 0, outros: 5 } } }),
    damaris: pessoaDeAtualizacoes(), // Mês "—" (o sistema não respondeu)
  },
};

test('I1: quadro = soma dos cards com número, e "parcial" conta os "—"', () => {
  const r = resumoCompilacao(tecnicos, dados, REFERENCIA);
  assert.equal(r.normasMes, 130);
  assert.equal(r.normasSemana, 12 + 5 + 9);
  assert.equal(r.normasHoje, 3 + 1 + 2);
  assert.deepEqual(r.parcial, { hoje: 0, semana: 0, mes: 1 });
  assert.equal(rotuloParcial(r.parcial.mes), 'parcial · 1 sem dado');
  assert.equal(rotuloParcial(0), '');
});

test('I2: Σ tipos do quadro = Mês do quadro (só de quem tem o Mês)', () => {
  const r = resumoCompilacao(tecnicos, dados, REFERENCIA);
  assert.equal(r.porTipo.length, 7);
  assert.equal(r.porTipo.reduce((soma, { valor }) => soma + valor, 0), r.normasMes);
  assert.equal(r.porTipo.find(({ chave }) => chave === 'outros').valor, 7);
});

test('I9: com dados de outro dia, o Dia fica "—" e o resto vale', () => {
  const r = resumoCompilacao(tecnicos, dados, '2026-11-05');
  assert.equal(r.normasHoje, null);
  assert.equal(r.parcial.hoje, 0);
  assert.equal(r.normasMes, 130);
});

test('I10: ranking do Mês, maior primeiro, "—" no fim; fila e cidades de cada um', () => {
  const r = resumoCompilacao(tecnicos, dados, REFERENCIA);
  assert.deepEqual(r.ranking.map(({ id }) => id), ['ramon', 'leonardo', 'damaris']);
  const damaris = r.ranking.at(-1);
  assert.equal(damaris.normasMes, null);
  assert.equal(damaris.emFila, 112);
  assert.equal(damaris.legendaFila, 'déficit · planilha de out.');
  assert.equal(damaris.cidades, 3);
  assert.equal(r.ranking[0].legendaFila, 'no projeto · Cidade A');
  assert.equal(r.ranking[0].cidades, 1);
});

test('empate no Mês fica na ordem da página', () => {
  const empate = { ...dados, pessoas: { ...dados.pessoas, ramon: pessoaDeProjetos() } };
  assert.deepEqual(resumoCompilacao(tecnicos, empate, REFERENCIA).ranking.map(({ id }) => id).slice(0, 2), ['leonardo', 'ramon']);
});

test('ninguém com número: somas "—" sem "parcial"; sem dados ainda: não carregado', () => {
  const vazio = { referencia: REFERENCIA, pessoas: { damaris: pessoaDeAtualizacoes({ producao: { hoje: null, semana: null, mes: null, tudo: null } }) } };
  const r = resumoCompilacao(tecnicos, vazio, REFERENCIA);
  assert.equal(r.carregado, true);
  assert.equal(r.normasMes, null);
  assert.deepEqual(r.parcial, { hoje: 0, semana: 0, mes: 0 });
  assert.ok(r.porTipo.every(({ valor }) => valor === null));

  const antes = resumoCompilacao(tecnicos, null, REFERENCIA);
  assert.equal(antes.carregado, false);
  assert.equal(antes.totalCompiladores, 3);
  assert.equal(resumoCompilacao([], null, REFERENCIA).ranking.length, 0);
});
