import assert from 'node:assert/strict';
import test from 'node:test';
import { agruparPorBalde, chaveDaNorma, contarDistintas } from './normas-distintas.mjs';

const item = (descricao, cidadeUf = 'Cidade A-XX') => ({ descricao, cidadeUf });

test('a chave junta cidade, tipo e número/ano sem os pontos do número', () => {
  assert.equal(chaveDaNorma(item('Lei Ordinária nº 2.361/2026 / Versão compilada')), 'Cidade A-XX|23|2361/2026');
});

test('a mesma norma com 2 versões conta 1', () => {
  const itens = [item('Lei Ordinária nº 10/2020 / Versão 1'), item('Lei Ordinária nº 10/2020 / Versão 2')];
  assert.equal(contarDistintas(itens).distintas, 1);
});

test('o mesmo número em 2 cidades conta 2', () => {
  const itens = [item('Lei Ordinária nº 10/2020', 'Cidade A-XX'), item('Lei Ordinária nº 10/2020', 'Cidade B-XX')];
  assert.equal(contarDistintas(itens).distintas, 2);
});

test('o mesmo número em tipos diferentes conta 2', () => {
  const itens = [item('Lei Ordinária nº 10/2020'), item('Decreto Municipal nº 10/2020')];
  assert.equal(contarDistintas(itens).distintas, 2);
});

test('o mesmo número em anos diferentes conta 2', () => {
  assert.equal(contarDistintas([item('Lei Ordinária nº 10/2020'), item('Lei Ordinária nº 10/2021')]).distintas, 2);
});

test('prefixo altera: não separa a mesma norma', () => {
  const itens = [item('Lei Ordinária nº 10/2020'), item('altera: Lei Ordinária nº 10/2020')];
  assert.equal(contarDistintas(itens).distintas, 1);
});

test('descrição sem número/ano é contada à parte, não descartada', () => {
  const r = contarDistintas([item('Lei Ordinária nº 10/2020'), item('texto qualquer'), item('')]);
  assert.equal(r.distintas, 1);
  assert.equal(r.naoReconhecidas, 2);
});

test('item sem cidade ou nulo é não reconhecido', () => {
  const r = contarDistintas([{ descricao: 'Lei Ordinária nº 1/2020' }, null, { descricao: 5, cidadeUf: 'x' }]);
  assert.equal(r.distintas, 0);
  assert.equal(r.naoReconhecidas, 3);
});

test('tipo desconhecido com número válido conta como distinta em outros', () => {
  const r = agruparPorBalde([item('Instrução Inventada nº 1/2020'), item('Instrução Inventada nº 1/2020')]);
  assert.equal(r.distintas, 1);
  assert.equal(r.porBalde.outros, 1);
});

test('agruparPorBalde separa por tipo e a soma dos baldes fecha com o total', () => {
  const r = agruparPorBalde([
    item('Lei Ordinária nº 1/2020'),
    item('Lei Ordinária nº 1/2020'),
    item('Decreto Municipal nº 2/2020'),
    item('Decreto Legislativo nº 3/2020'),
    item('Resolução nº 4/2020'),
    item('Portaria nº 5/2020'),
    item('Lei Complementar nº 6/2020'),
    item('Emenda à Lei Orgânica nº 7/2020'),
    item('Ato da Mesa nº 8/2020'),
  ]);
  assert.deepEqual(r.porBalde, {
    leis: 1, decretos: 2, resolucoes: 1, portarias: 1, complementares: 1, emendas: 1, outros: 1,
  });
  assert.equal(Object.values(r.porBalde).reduce((a, b) => a + b, 0), r.distintas);
});

test('agruparPorBalde com lista vazia devolve zeros', () => {
  const r = agruparPorBalde([]);
  assert.equal(r.distintas, 0);
  assert.equal(r.versoes, 0);
  assert.ok(Object.values(r.porBalde).every((n) => n === 0));
});

test('invariante I13: distintas nunca passam do número de versões', () => {
  const itens = [item('Lei Ordinária nº 1/2020'), item('Lei Ordinária nº 1/2020'), item('Lei Ordinária nº 2/2020'), item('???')];
  const r = agruparPorBalde(itens);
  assert.equal(r.versoes, 4);
  assert.ok(r.distintas <= r.versoes);
  assert.equal(r.distintas + r.naoReconhecidas <= r.versoes, true);
});

test('lista que não é array vira vazia', () => {
  assert.equal(contarDistintas(undefined).distintas, 0);
});

test('aceita o formato com a data inteira: "nº 1.234 / 15/10/2026" vale 1234/2026', () => {
  assert.equal(chaveDaNorma(item('Lei Ordinária nº 1.234 / 15/10/2026')), 'Cidade A-XX|23|1234/2026');
  assert.equal(chaveDaNorma(item('Resolução nº 12 / 1/2/2025')), 'Cidade A-XX|28|12/2025');
});

test('a mesma norma escrita nos dois formatos conta 1', () => {
  const itens = [item('Decreto Municipal nº 10.500/2026'), item('Decreto Municipal nº 10.500 / 03/11/2026')];
  assert.equal(contarDistintas(itens).distintas, 1);
});

test('data incompleta depois do número não vira ano', () => {
  assert.equal(chaveDaNorma(item('Resolução nº 12 / 15/10')), null);
});
