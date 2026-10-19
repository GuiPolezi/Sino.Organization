import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classificarLicencas,
  descreverPrazo,
  diasAte,
  formatarData,
  hojeISO,
  slugify,
  somarDias,
} from './licencas.js';
import { gerarClientesFicticios } from '../dados.js';

const HOJE = '2026-10-19';

test('slugify remove acentos, caixa e pontuação', () => {
  assert.equal(slugify('Câmara Municipal de Araras'), 'camara-municipal-de-araras');
  assert.equal(slugify('  Prefeitura de São João d’Aliança '), 'prefeitura-de-sao-joao-d-alianca');
});

test('diasAte e somarDias atravessam mês e ano', () => {
  assert.equal(diasAte('2026-11-01', HOJE), 13);
  assert.equal(diasAte('2026-10-12', HOJE), -7);
  assert.equal(somarDias('2026-12-25', 10), '2027-01-04');
  assert.equal(somarDias('2028-02-28', 1), '2028-02-29');
});

test('hojeISO usa a data local', () => {
  assert.equal(hojeISO(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('formatarData vira dd/mm/aaaa', () => {
  assert.equal(formatarData('2026-10-05'), '05/10/2026');
});

test('descreverPrazo cobre singular e plural', () => {
  assert.equal(descreverPrazo(-7), 'Venceu há 7 dias');
  assert.equal(descreverPrazo(-1), 'Venceu ontem');
  assert.equal(descreverPrazo(0), 'Vence hoje');
  assert.equal(descreverPrazo(1), 'Vence amanhã');
  assert.equal(descreverPrazo(12), 'Vence em 12 dias');
});

test('classificarLicencas separa, ordena e descarta as distantes', () => {
  const clientes = [
    { nome: 'A', vencimento: '2026-10-05' },
    { nome: 'B', vencimento: '2026-10-18' },
    { nome: 'C', vencimento: '2026-10-19' },
    { nome: 'D', vencimento: '2026-11-30' },
    { nome: 'E', vencimento: '2027-06-01' },
  ];
  const { vencidas, proximas } = classificarLicencas(clientes, HOJE);

  assert.deepEqual(vencidas.map((c) => c.nome), ['B', 'A']);
  assert.deepEqual(proximas.map((c) => c.nome), ['C', 'D']);
  assert.equal(vencidas[0].slug, 'b');
  assert.equal(proximas[0].dias, 0);
});

test('dados fictícios: 10 vencidas, 15 próximas e slugs únicos', () => {
  const clientes = gerarClientesFicticios(HOJE);
  const { vencidas, proximas } = classificarLicencas(clientes, HOJE);
  const slugs = clientes.map((c) => slugify(c.nome));

  assert.equal(vencidas.length, 10);
  assert.equal(proximas.length, 15);
  assert.equal(new Set(slugs).size, slugs.length);
});
