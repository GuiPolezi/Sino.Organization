import assert from 'node:assert/strict';
import test from 'node:test';
import { calcularPeriodos } from './periodos.mjs';

const em = (iso) => calcularPeriodos(new Date(iso));

test('antes das 03:00Z ainda é o dia anterior em São Paulo', () => {
  assert.equal(em('2026-03-11T02:59:59Z').hoje, '2026-03-10');
});

test('às 03:00Z vira o dia em São Paulo', () => {
  assert.equal(em('2026-03-11T03:00:00Z').hoje, '2026-03-11');
});

test('a virada do mês também segue o relógio de São Paulo', () => {
  const p = em('2026-04-01T02:59:00Z');
  assert.equal(p.hoje, '2026-03-31');
  assert.deepEqual(p.mes, { inicio: '2026-03-01', fim: '2026-03-31' });
});

test('a semana vai de segunda a domingo', () => {
  // 11/03/2026 é quarta-feira
  assert.deepEqual(em('2026-03-11T15:00:00Z').semana, { inicio: '2026-03-09', fim: '2026-03-15' });
});

test('na segunda-feira a semana começa no próprio dia', () => {
  assert.deepEqual(em('2026-03-09T15:00:00Z').semana, { inicio: '2026-03-09', fim: '2026-03-15' });
});

test('no domingo a semana começou na segunda anterior', () => {
  assert.deepEqual(em('2026-03-15T15:00:00Z').semana, { inicio: '2026-03-09', fim: '2026-03-15' });
});

test('domingo à noite em São Paulo (já segunda em UTC) continua na semana que acaba', () => {
  const p = em('2026-03-16T01:00:00Z'); // domingo 22h em SP
  assert.equal(p.hoje, '2026-03-15');
  assert.deepEqual(p.semana, { inicio: '2026-03-09', fim: '2026-03-15' });
});

test('a semana pode atravessar a virada do mês e do ano', () => {
  assert.deepEqual(em('2026-12-31T15:00:00Z').semana, { inicio: '2026-12-28', fim: '2027-01-03' });
});

test('mês de 31 dias, de 30 dias e dezembro', () => {
  assert.deepEqual(em('2026-01-15T15:00:00Z').mes, { inicio: '2026-01-01', fim: '2026-01-31' });
  assert.deepEqual(em('2026-04-15T15:00:00Z').mes, { inicio: '2026-04-01', fim: '2026-04-30' });
  assert.deepEqual(em('2026-12-15T15:00:00Z').mes, { inicio: '2026-12-01', fim: '2026-12-31' });
});

test('fevereiro em ano comum e em ano bissexto', () => {
  assert.equal(em('2026-02-10T15:00:00Z').mes.fim, '2026-02-28');
  assert.equal(em('2028-02-10T15:00:00Z').mes.fim, '2028-02-29');
  assert.equal(em('2100-02-10T15:00:00Z').mes.fim, '2100-02-28');
});

test('29 de fevereiro existe em 2028 e a semana dele fecha em março', () => {
  const p = em('2028-02-29T15:00:00Z');
  assert.equal(p.hoje, '2028-02-29');
  assert.deepEqual(p.semana, { inicio: '2028-02-28', fim: '2028-03-05' });
});

test('os filtros da Auditoria usam AAAA-MM-DD de início e fim', () => {
  const p = em('2026-03-11T15:00:00Z');
  assert.deepEqual(p.filtros.hoje, { dataInicial: '2026-03-11', dataFinal: '2026-03-11' });
  assert.deepEqual(p.filtros.semana, { dataInicial: '2026-03-09', dataFinal: '2026-03-15' });
  assert.deepEqual(p.filtros.mes, { dataInicial: '2026-03-01', dataFinal: '2026-03-31' });
});

test('aceita texto ISO além de Date', () => {
  assert.equal(calcularPeriodos('2026-03-11T15:00:00Z').hoje, '2026-03-11');
});

test('instante inválido dá erro', () => {
  assert.throws(() => calcularPeriodos('não é data'), /inválid/);
});
