// Casos do rodapé "Atualizado às" do painel do quadro.
// Uso: npm run test:card
import assert from 'node:assert/strict';
import test from 'node:test';
import { rotuloAtualizacao } from './rotuloAtualizacao.js';

// 26/10/2026 15:00 em São Paulo (UTC-3).
const AGORA = Date.parse('2026-10-26T18:00:00Z');

test('dado de hoje mostra só a hora de Brasília', () => {
  assert.equal(rotuloAtualizacao('2026-10-26T17:42:00Z', AGORA), 'Atualizado às 14:42');
});

test('dado de outro dia mostra a data junto', () => {
  assert.equal(rotuloAtualizacao('2026-10-25T21:05:00Z', AGORA), 'Atualizado em 25/10 às 18:05');
});

test('o dia é o de Brasília, não o do UTC', () => {
  // 01:30 UTC do dia 26 ainda é 22:30 do dia 25 em São Paulo.
  assert.equal(rotuloAtualizacao('2026-10-26T01:30:00Z', AGORA), 'Atualizado em 25/10 às 22:30');
});
