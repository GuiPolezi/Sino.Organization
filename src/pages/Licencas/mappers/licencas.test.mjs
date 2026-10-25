import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparLicencas,
  paginasVisiveis,
  classificarLicencas,
  descreverPrazo,
  diasAte,
  formatarData,
  hojeISO,
  slugify,
  somarDias,
} from './licencas.js';

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

test('agruparLicencas junta os sistemas de um cliente que vencem no mesmo dia', () => {
  const linhas = [
    { clienteId: 78, nome: 'Câmara Municipal de Guarujá', sistema: 'Siscam', vencimento: '2026-10-19' },
    { clienteId: 78, nome: 'Câmara Municipal de Guarujá', sistema: 'Workflow', vencimento: '2026-10-19' },
    { clienteId: 78, nome: 'Câmara Municipal de Guarujá', sistema: 'Siscam', vencimento: '2026-10-19' },
    { clienteId: 200, nome: 'Câmara Municipal de Sorriso', sistema: 'Siscam', vencimento: '2026-11-08' },
    { clienteId: 200, nome: 'Câmara Municipal de Sorriso', sistema: 'Workflow', vencimento: '2025-10-20' },
  ];
  const grupos = agruparLicencas(linhas);

  assert.deepEqual(
    grupos.map(({ chave, slug, sistemas }) => [chave, slug, sistemas]),
    [
      ['78-2026-10-19', 'camara-municipal-de-guaruja', ['Siscam', 'Workflow']],
      ['200-2026-11-08', 'camara-municipal-de-sorriso', ['Siscam']],
      ['200-2025-10-20', 'camara-municipal-de-sorriso', ['Workflow']],
    ],
  );

  const { vencidas, proximas } = classificarLicencas(grupos, HOJE);
  assert.deepEqual(vencidas.map((c) => c.chave), ['200-2025-10-20']);
  assert.deepEqual(proximas.map((c) => c.chave), ['78-2026-10-19', '200-2026-11-08']);
});

test('agruparLicencas põe o id no slug quando dois clientes têm o mesmo nome', () => {
  const grupos = agruparLicencas([
    { clienteId: 1, nome: 'Câmara de Itu', sistema: 'Siscam', vencimento: '2026-10-01' },
    { clienteId: 2, nome: 'CÂMARA DE ITU', sistema: 'Siscam', vencimento: '2026-10-01' },
  ]);
  assert.deepEqual(grupos.map((g) => g.slug), ['camara-de-itu-1', 'camara-de-itu-2']);
});

test('paginasVisiveis mostra pontas, vizinhas e reticências com largura fixa', () => {
  assert.deepEqual(paginasVisiveis(1, 1), [1]);
  assert.deepEqual(paginasVisiveis(2, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(paginasVisiveis(1, 12), [1, 2, 3, 4, 5, null, 12]);
  assert.deepEqual(paginasVisiveis(4, 12), [1, 2, 3, 4, 5, null, 12]);
  assert.deepEqual(paginasVisiveis(6, 12), [1, null, 5, 6, 7, null, 12]);
  assert.deepEqual(paginasVisiveis(9, 12), [1, null, 8, 9, 10, 11, 12]);
  assert.deepEqual(paginasVisiveis(12, 12), [1, null, 8, 9, 10, 11, 12]);
  for (let atual = 1; atual <= 12; atual += 1) {
    assert.equal(paginasVisiveis(atual, 12).length, 7);
    assert.ok(paginasVisiveis(atual, 12).includes(atual));
  }
});
