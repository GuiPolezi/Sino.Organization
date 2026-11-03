import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroPlanilha, lerAba } from './planilha.mjs';

// Modelo montado à mão (sem Excel) para os casos de erro de layout e de conferência.
const VAZIA = { valor: null, texto: '', trechos: [], formula: null, fundo: null, escrava: false };
const texto = (t) => ({ ...VAZIA, valor: t, texto: t, trechos: [{ texto: t, vermelho: false }] });
const numero = (n) => ({ ...VAZIA, valor: n });
const formula = (f, n) => ({ ...VAZIA, valor: n, formula: f });

const CONFIG = { tituloContem: 'NATHALIA', modoDeficit: 'incluido' };

function aba(celulas, nome = 'Outubro 26') {
  return {
    nome,
    ultimaLinha: 12,
    ultimaColuna: 10,
    celula: (linha, coluna) => celulas[`${String.fromCharCode(64 + coluna)}${linha}`] ?? VAZIA,
  };
}

const CABECALHO = {
  A1: texto('RELATÓRIO - NATHALIA'),
  A2: texto('PERÍODO: OUTUBRO'),
  B3: texto('CLIENTE'),
  C3: texto('DIÁRIO OFICIAL'),
  E3: texto('SISCAM'),
  G3: texto('DÉFICIT'),
  H3: texto('TOTAL'),
};

const BASE = {
  ...CABECALHO,
  B4: texto('CIDADE A-SP'),
  C4: texto('L'),
  H4: numero(5),
  G4: numero(1),
  B5: texto('TOTAL'),
  G5: formula('SUM(G4:G4)', 1),
  H5: formula('SUM(H4:H4)', 5),
};

test('base mínima é lida (garante que os casos abaixo falham pelo motivo certo)', () => {
  const r = lerAba(aba(BASE), CONFIG);
  assert.deepEqual(r.totais, { total: 5, deficit: 1, compiladas: 4 });
});

test('erro quando não acha o cabeçalho', () => {
  assert.throws(() => lerAba(aba({ A1: texto('x') }), CONFIG), ErroPlanilha);
  assert.throws(() => lerAba(aba({ A1: texto('x') }), CONFIG), /cabeçalho/i);
});

test('erro quando o cabeçalho tem coluna fora do lugar, citando a célula', () => {
  const celulas = { ...BASE, E3: texto('OUTRA COISA'), F3: texto('SISCAM') };
  assert.throws(() => lerAba(aba(celulas), CONFIG), /E3/);
});

test('erro quando não acha a linha "Total"', () => {
  const { B5, G5, H5, ...semTotal } = BASE;
  assert.throws(() => lerAba(aba(semTotal), CONFIG), /Total/);
});

test('erro quando a soma das linhas difere da fórmula do Total', () => {
  const celulas = { ...BASE, H5: formula('SUM(H4:H4)', 9) };
  assert.throws(() => lerAba(aba(celulas), CONFIG), /H5.*5.*9/);
});

test('erro quando a fórmula não cobre todas as linhas', () => {
  const celulas = { ...BASE, B5: texto('TOTAL'), B6: texto('x'), H4: numero(5), G5: formula('SUM(G4:G3)', 1) };
  assert.throws(() => lerAba(aba(celulas), CONFIG), /G5.*fórmula/i);
});

test('fórmula começando antes da linha 4 (H2) é aceita', () => {
  const celulas = { ...BASE, H5: formula('SUM(H2:H4)', 5) };
  assert.equal(lerAba(aba(celulas), CONFIG).totais.total, 5);
});

test('sem valor guardado na fórmula: só aviso, não erro', () => {
  const celulas = { ...BASE, H5: formula('SUM(H4:H4)', null) };
  const r = lerAba(aba(celulas), CONFIG);
  assert.ok(r.avisos.some((a) => a.includes('H5')));
});

test('erro para sigla fora da tabela, citando a célula', () => {
  assert.throws(() => lerAba(aba({ ...BASE, C4: texto('ZZ') }), CONFIG), /C4.*ZZ/);
});

test('erro para TOTAL decimal ou texto', () => {
  assert.throws(() => lerAba(aba({ ...BASE, H4: numero(2.5) }), CONFIG), /H4/);
  assert.throws(() => lerAba(aba({ ...BASE, H4: texto('abc') }), CONFIG), /H4/);
});

test('erro para número negativo', () => {
  assert.throws(() => lerAba(aba({ ...BASE, G4: numero(-1) }), CONFIG), /G4/);
});

test('erro para o mesmo par cidade × sigla repetido na aba', () => {
  const celulas = { ...BASE, B5: texto('CIDADE A-SP'), C5: texto('L'), H5: numero(1), B6: texto('TOTAL'), G6: formula('SUM(G4:G5)', 1), H6: formula('SUM(H4:H5)', 6) };
  assert.throws(() => lerAba(aba(celulas), CONFIG), /repetid/i);
});

test('erro para nome de aba que não é de mês', () => {
  assert.throws(() => lerAba(aba(BASE, 'Resumo'), CONFIG), /nome da aba/i);
});
