import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extrairFaltantes, uniaoFaltantes } from './faltantes.mjs';

const numeros = (texto, opcoes) => extrairFaltantes([texto], opcoes).numeros;

test('lê números soltos separados por vírgula, dentro de parênteses', () => {
  assert.deepEqual(numeros('(5, 9, 12)'), [[5, null], [9, null], [12, null]]);
});

test('lê faixa com hífen e com "a" / "à" / "até"', () => {
  assert.deepEqual(numeros('(10-12)'), [[10, null], [11, null], [12, null]]);
  assert.deepEqual(numeros('20 a 21'), [[20, null], [21, null]]);
  assert.deepEqual(numeros('30 à 31'), [[30, null], [31, null]]);
  assert.deepEqual(numeros('40 até 41'), [[40, null], [41, null]]);
});

test('número/ano aceita ano com 2 ou 4 dígitos', () => {
  assert.deepEqual(numeros('(3/25, 7/2024)'), [[3, 2025], [7, 2024]]);
});

test('faixa com ano no fim vale para todos os números da faixa', () => {
  assert.deepEqual(numeros('1-3/2025'), [[1, 2025], [2, 2025], [3, 2025]]);
});

test('faixa entre dois número/ano do mesmo ano', () => {
  assert.deepEqual(numeros('1/2025-2/2025'), [[1, 2025], [2, 2025]]);
});

test('faixa entre anos diferentes não é chutada: vai para não entendidos', () => {
  const r = extrairFaltantes(['1/2024-2/2025']);
  assert.deepEqual(r.numeros, []);
  assert.equal(r.naoEntendidos.length, 1);
});

test('número com A ou asterisco vale como o número', () => {
  assert.deepEqual(numeros('390*, 12A'), [[390, null], [12, null]]);
});

test('descarta a nota depois do número e conta que havia nota', () => {
  const r = extrairFaltantes(['38 - sem arquivo, 235 sem PDF, 12791 [com alteração pendente]']);
  assert.deepEqual(r.numeros, [[38, null], [235, null], [12791, null]]);
  assert.equal(r.comNota, 3);
  assert.deepEqual(r.naoEntendidos, []);
});

test('faixa seguida de nota: 270 - 280 arquivos do D.O.', () => {
  const r = extrairFaltantes(['(190-258 - sem arquivo 259 a 262, 270 - 280 arquivos do D.O.)']);
  assert.equal(r.contagem, 69 + 11);
  assert.equal(r.comNota, 2);
});

test('nota sozinha ("sem arquivo", "*") não vira número nem fragmento ilegível', () => {
  const r = extrairFaltantes(['(*, sem arquivo, 4)']);
  assert.deepEqual(r.numeros, [[4, null]]);
  assert.deepEqual(r.naoEntendidos, []);
});

test('aceita "e" entre números e ponto e vírgula', () => {
  assert.deepEqual(numeros('5 e 6; 8'), [[5, null], [6, null], [8, null]]);
});

test('faixa invertida é sinalizada e não inventa números', () => {
  const r = extrairFaltantes(['18823 a 18706, 4']);
  assert.deepEqual(r.numeros, [[4, null]]);
  assert.deepEqual(r.naoEntendidos, ['18823 a 18706']);
});

test('faixa com mais de 1.000 números é sinalizada e não contada', () => {
  const r = extrairFaltantes(['14033-140353']);
  assert.equal(r.contagem, 0);
  assert.equal(r.naoEntendidos.length, 1);
  assert.equal(extrairFaltantes(['1-1000']).contagem, 1000);
});

test('texto que não começa por número, ou números sem vírgula, é não entendido', () => {
  const r = extrairFaltantes(['SISCAM desorganizado, 393-397 401, 9']);
  assert.deepEqual(r.numeros, [[9, null]]);
  assert.equal(r.naoEntendidos.length, 2);
});

test('repetidos contam uma vez só', () => {
  const r = extrairFaltantes(['5, 5, 4-6']);
  assert.equal(r.contagem, 3);
});

test('o mesmo número com anos diferentes são normas diferentes', () => {
  assert.equal(extrairFaltantes(['5/24, 5/25']).contagem, 2);
  // O "5" sem ano repete um dos dois com ano: não é uma terceira norma.
  assert.equal(extrairFaltantes(['5/24, 5/25, 5']).contagem, 2);
});

test('número sem ano maior que a última norma é suspeito e não conta', () => {
  const r = extrairFaltantes(['(10012, 7, 20/2020)'], { ultimaNorma: 1072 });
  assert.deepEqual(r.numeros, [[7, null], [20, 2020]]);
  assert.equal(r.suspeitos, 1);
});

test('sem última norma conhecida nada é suspeito', () => {
  assert.equal(extrairFaltantes(['10012']).suspeitos, 0);
});

test('fragmentos não entendidos são curtos (no máximo 30 caracteres)', () => {
  const longo = 'ELOM 16 - entra em vigor depois de uma explicação muito comprida que não deve vazar';
  const [fragmento] = extrairFaltantes([longo]).naoEntendidos;
  assert.ok(fragmento.length <= 30);
});

test('entrada vazia, nula ou só espaços não dá nada', () => {
  for (const entrada of [[], [''], [' '], [null], [undefined]]) {
    assert.deepEqual(extrairFaltantes(entrada).numeros, []);
  }
});

test('junta vários trechos vermelhos da mesma célula', () => {
  assert.deepEqual(extrairFaltantes(['(1, ', '2)']).numeros, [[1, null], [2, null]]);
});

test('uniaoFaltantes junta duas listas sem repetir', () => {
  const uniao = uniaoFaltantes([[1, null], [2, 2024]], [[2, 2024], [3, null]]);
  assert.deepEqual(uniao, [[1, null], [2, 2024], [3, null]]);
});

test('lista grande (10 mil) é lida sem travar', () => {
  assert.equal(extrairFaltantes(['1-1000, 2000-2999, 5000-5999']).contagem, 3000);
});

test('o mesmo número com ano e sem ano na mesma lista conta uma vez (fica a forma com ano)', () => {
  const r = extrairFaltantes(['(10/2020, 10, 11)']);
  assert.deepEqual(r.numeros, [[10, 2020], [11, null]]);
  assert.equal(r.contagem, 2);
});

test('faixa com travessão (–) é lida como faixa com hífen', () => {
  assert.deepEqual(numeros('(10–12)'), [[10, null], [11, null], [12, null]]);
  assert.deepEqual(numeros('(3–4/2024)'), [[3, 2024], [4, 2024]]);
});

test('uniaoFaltantes também junta o mesmo número com e sem ano (D com ano, F sem)', () => {
  assert.deepEqual(uniaoFaltantes([[10, 2020]], [[10, null], [12, null]]), [[10, 2020], [12, null]]);
});
