// Casos do nome curto dos locais nos gráficos do quadro de /desenvolvimento.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LETRAS_SEM_ABREVIAR, abreviarLocal, nomesCurtos } from './locais.js';

test('nomes de até LETRAS_SEM_ABREVIAR letras ficam como vieram', () => {
  assert.equal(LETRAS_SEM_ABREVIAR, 24);
  for (const nome of ['Itanhaém CM', 'Vargem Grande Paulista', 'Tabelião de Notas Leme']) {
    assert.equal(abreviarLocal(nome), nome);
  }
});

test('os nomes de cartório viram abreviações, e o complemento longo sai', () => {
  const casos = {
    '2º Tabelião de Notas de Piracicaba Bortoletto': '2º Tab. Notas Piracicaba Bortoletto',
    '15º Cartório de Notas de São Paulo - Tabelião Oliveira Lima': '15º Cart. Notas São Paulo',
    '1º Tabelião de Notas de Santana de Parnaíba - Cartório Rodrigues Cruz': '1º Tab. Notas Santana de Parnaíba',
    '4º Tabelião de Notas de Sorocaba (Cartório Pires)': '4º Tab. Notas Sorocaba',
    '1 Registro Civil e Tabelionato de Notas de Ermelino Matarazzo': '1 RC e Tab. Notas Ermelino Matarazzo',
    'Ofício de Registro Civil e Tabelionato de Notas de Saltinho': 'Of. RC e Tab. Notas Saltinho',
    '1º Tabelião de Notas e Protesto de Letra e Títulos de Amparo': '1º Tab. Notas e Prot. Amparo',
    // Com o erro de digitação do cadastro ("Noras").
    '1 Tabelião de Noras e de Protestos de Letras e Títulos de Socorro': '1 Tab. Notas e Prot. Socorro',
    'IPREF - Instituto de Previdência dos Funcionários Públicos Municipais de Guarulhos': 'IPREF',
    'Cartório de Rio das Pedras': 'Cart. Rio das Pedras',
  };
  for (const [nome, curto] of Object.entries(casos)) assert.equal(abreviarLocal(nome), curto, nome);
});

test('um complemento curto fica, para não confundir com o local principal', () => {
  assert.equal(abreviarLocal('São José do Rio Preto CM - Empro'), 'São José do Rio Preto CM - Empro');
});

test('dois locais com o mesmo nome curto ficam com o nome inteiro', () => {
  const a = '4º Tabelião de Notas de Sorocaba (Cartório Pires)';
  const b = '4º Tabelião de Notas de Sorocaba (Cartório Souza)';
  const c = '2º Tabelião de Notas de Piracicaba Bortoletto';
  const curtos = nomesCurtos([a, b, c, c]);
  assert.equal(curtos.get(a), a);
  assert.equal(curtos.get(b), b);
  assert.equal(curtos.get(c), '2º Tab. Notas Piracicaba Bortoletto');
  assert.equal(curtos.size, 3);
});

test('nos locais do Milldesk, nenhum nome curto se repete e todos ficam menores', () => {
  const { desenvolvedores } = JSON.parse(readFileSync(new URL('../../../data/chamados.json', import.meta.url), 'utf8'));
  const locais = Object.values(desenvolvedores).flatMap((lista) => lista.map(({ local }) => local));
  const curtos = nomesCurtos(locais);
  assert.equal(new Set(curtos.values()).size, curtos.size);
  for (const [local, curto] of curtos) assert.ok(curto.length <= local.length && curto.length <= 40, local);
});
