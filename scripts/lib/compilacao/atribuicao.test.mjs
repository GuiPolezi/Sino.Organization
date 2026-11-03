import assert from 'node:assert/strict';
import test from 'node:test';
import { decidirAtribuicao, inferirPorDia, instanteParaIso, mesmoProjeto } from './atribuicao.mjs';
import { registro } from './compilacao-sintetica.mjs';

// Dados inventados: "Cidade A-XX" etc., ids sintéticos.
const A_RES = { cidadeUf: 'Cidade A-XX', moduloIds: [28] };
const B_LO_LC = { cidadeUf: 'Cidade B-XX', moduloIds: [23, 24] };
const atualDe = (projeto, origem = 'inferida') => ({ ...projeto, origem, id: 1, desde: '2026-10-01T12:00:00.000Z' });
const dia = (data, projeto) => ({ data, projeto, primeiraAcao: `${data}T08:00` });

test('correção manual ganha sempre, mesmo com outro projeto confirmado', () => {
  const r = decidirAtribuicao({ atual: atualDe(A_RES, 'manual'), inferido: B_LO_LC, porDia: [dia('2026-11-04', B_LO_LC), dia('2026-11-03', B_LO_LC)] });
  assert.equal(r.acao, 'manter');
  assert.equal(r.projeto.cidadeUf, 'Cidade A-XX');
});

test('sem atribuição gravada, abre a inferida na hora', () => {
  assert.deepEqual(decidirAtribuicao({ atual: null, inferido: A_RES, porDia: [] }), { acao: 'abrir', projeto: A_RES });
});

test('mesmo projeto (tipos em outra ordem) mantém', () => {
  const r = decidirAtribuicao({ atual: atualDe({ cidadeUf: 'Cidade B-XX', moduloIds: [24, 23] }), inferido: B_LO_LC, porDia: [] });
  assert.equal(r.acao, 'manter');
});

test('projeto novo em só 1 dia não troca (regra dos 2 dias)', () => {
  const r = decidirAtribuicao({ atual: atualDe(A_RES), inferido: B_LO_LC, porDia: [dia('2026-11-04', B_LO_LC), dia('2026-11-03', A_RES)] });
  assert.equal(r.acao, 'manter');
  assert.equal(r.projeto.cidadeUf, 'Cidade A-XX');
});

test('projeto novo nos 2 últimos dias com ação troca', () => {
  const r = decidirAtribuicao({ atual: atualDe(A_RES), inferido: B_LO_LC, porDia: [dia('2026-11-04', B_LO_LC), dia('2026-11-03', B_LO_LC)] });
  assert.deepEqual(r, { acao: 'trocar', projeto: B_LO_LC });
});

test('quem alterna os tipos por dia (LO num dia, LC no outro) confirma o conjunto dos dois', () => {
  const porDia = [dia('2026-11-04', { cidadeUf: 'Cidade B-XX', moduloIds: [23] }), dia('2026-11-03', { cidadeUf: 'Cidade B-XX', moduloIds: [24] })];
  assert.equal(decidirAtribuicao({ atual: atualDe(A_RES), inferido: B_LO_LC, porDia }).acao, 'trocar');
});

test('dia com tipo fora do conjunto novo não confirma', () => {
  const porDia = [dia('2026-11-04', B_LO_LC), dia('2026-11-03', { cidadeUf: 'Cidade B-XX', moduloIds: [28] })];
  assert.equal(decidirAtribuicao({ atual: atualDe(A_RES), inferido: B_LO_LC, porDia }).acao, 'manter');
});

test('sem ação (ou sem tipo reconhecido): mantém a gravada; sem gravada, nada a gravar', () => {
  assert.equal(decidirAtribuicao({ atual: atualDe(A_RES), inferido: null, porDia: [] }).acao, 'manter');
  assert.equal(decidirAtribuicao({ atual: atualDe(A_RES), inferido: { cidadeUf: 'Cidade B-XX', moduloIds: [] }, porDia: [] }).acao, 'manter');
  const semTipo = { cidadeUf: 'Cidade B-XX', moduloIds: [] };
  assert.deepEqual(decidirAtribuicao({ atual: null, inferido: semTipo, porDia: [] }), { acao: 'nada', projeto: semTipo });
  assert.deepEqual(decidirAtribuicao({ atual: null, inferido: null, porDia: [] }), { acao: 'nada', projeto: null });
});

test('inferirPorDia: os 2 últimos dias com ação, cada um sozinho, com a 1ª ação do dia', () => {
  const entrada = {
    versoes: [
      registro({ cidade: 'Cidade B-XX', tipo: 'Lei Ordinária', data: '2026-11-04', hora: '14:00' }),
      registro({ cidade: 'Cidade B-XX', tipo: 'Lei Ordinária', numero: 2, data: '2026-11-04', hora: '09:15' }),
      registro({ cidade: 'Cidade A-XX', data: '2026-10-30', hora: '10:00' }),
      registro({ cidade: 'Cidade A-XX', data: '2026-10-29', hora: '10:00' }),
    ],
    normas: [registro({ cidade: 'Cidade B-XX', tipo: 'Lei Complementar', modulo: 'Normas', data: '2026-11-04', hora: '08:05' })],
  };
  const porDia = inferirPorDia(entrada);
  assert.deepEqual(porDia.map((d) => d.data), ['2026-11-04', '2026-10-30']);
  assert.equal(porDia[0].primeiraAcao, '2026-11-04T08:05');
  assert.equal(porDia[0].projeto.cidadeUf, 'Cidade B-XX');
  assert.equal(porDia[1].projeto.cidadeUf, 'Cidade A-XX');
  assert.deepEqual(inferirPorDia(undefined), []);
});

test('instanteParaIso lê a hora de Brasília (UTC-3)', () => {
  assert.equal(instanteParaIso('2026-11-04T08:05'), '2026-11-04T11:05:00.000Z');
});

test('mesmoProjeto compara cidade e conjunto de tipos', () => {
  assert.equal(mesmoProjeto(A_RES, { cidadeUf: 'Cidade A-XX', moduloIds: [28] }), true);
  assert.equal(mesmoProjeto(A_RES, { cidadeUf: 'Cidade A-XX', moduloIds: [28, 24] }), false);
  assert.equal(mesmoProjeto(A_RES, null), false);
});
