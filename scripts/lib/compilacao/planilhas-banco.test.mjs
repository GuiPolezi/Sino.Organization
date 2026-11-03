import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravarAba, montarPayload } from './planilhas-banco.mjs';

const linha = (extra = {}) => ({
  cidade: 'Cidade A',
  uf: 'SP',
  cidade_status: 'ativa',
  cidadeId: null,
  sigla: 'L',
  moduloId: 23,
  balde: 'leis',
  total: 5,
  deficit: 1,
  compiladas: 4,
  par_em_alerta: false,
  sigla_duvidosa: false,
  nao_municipal: false,
  linha: 4,
  faltantes: { total: 2, doDO: 2, siscam: 1, numeros: [[3, null], [4, 2025]], suspeitos: 0, naoEntendidos: ['texto livre qualquer'] },
  ...extra,
});

const aba = (extra = {}) => ({
  nome: 'Outubro 26',
  mes: 10,
  ano: 2026,
  tituloConfere: true,
  linhas: [linha()],
  totais: { total: 5, deficit: 1, compiladas: 4 },
  totalFormula: 5,
  deficitFormula: 1,
  fragmentosIlegiveis: 1,
  numerosSuspeitos: 0,
  avisos: ['G4: texto vazio tratado como 0.'],
  ...extra,
});

const ctx = { personagem: 'nathalia', arquivoSha256: 'abc' };

test('monta a linha do banco com os números e sinais, sem texto livre', () => {
  const { linhas } = montarPayload(aba(), ctx);
  assert.deepEqual(linhas[0], {
    personagem: 'nathalia',
    ano: 2026,
    mes: 10,
    cidade: 'Cidade A',
    uf: 'SP',
    cidade_id: null,
    cidade_status: 'ativa',
    sigla_planilha: 'L',
    modulo_id: 23,
    balde: 'leis',
    total_planilha: 5,
    deficit: 1,
    compiladas: 4,
    faltantes: 2,
    faltantes_do: 2,
    faltantes_siscam: 1,
    faltantes_numeros: [[3, null], [4, 2025]],
    par_em_alerta: false,
    sigla_duvidosa: false,
    nao_municipal: false,
  });
  assert.ok(!JSON.stringify(linhas).includes('texto livre'));
});

test('monta a linha da aba com conferências e hashes', () => {
  const { aba: dados } = montarPayload(aba(), ctx);
  assert.equal(dados.personagem, 'nathalia');
  assert.equal(dados.titulo_confere, true);
  assert.equal(dados.total_formula, 5);
  assert.equal(dados.fragmentos_ilegiveis, 1);
  assert.equal(dados.arquivo_sha256, 'abc');
  assert.match(dados.conteudo_sha256, /^[0-9a-f]{64}$/);
});

test('o hash do conteúdo é igual ao importar duas vezes e não depende do arquivo', () => {
  const a = montarPayload(aba(), ctx);
  const b = montarPayload(aba(), { ...ctx, arquivoSha256: 'outro' });
  assert.deepEqual(a.linhas, b.linhas);
  assert.equal(a.aba.conteudo_sha256, b.aba.conteudo_sha256);
});

test('o hash muda quando um número muda', () => {
  const a = montarPayload(aba(), ctx);
  const b = montarPayload(aba({ linhas: [linha({ total: 6 })] }), ctx);
  assert.notEqual(a.aba.conteudo_sha256, b.aba.conteudo_sha256);
});

test('usa o gancho de cidade para preencher cidade_id', () => {
  const { linhas } = montarPayload(aba(), { ...ctx, resolverCidadeId: () => 77 });
  assert.equal(linhas[0].cidade_id, 77);
});

test('gravarAba chama a função do banco numa transação só, com aba e linhas', async () => {
  const chamadas = [];
  const pedir = async (caminho, opcoes) => chamadas.push({ caminho, opcoes });
  const payload = montarPayload(aba(), ctx);
  await gravarAba(pedir, payload);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].caminho, '/rpc/compilacao_importar_aba');
  assert.equal(chamadas[0].opcoes.method, 'POST');
  assert.deepEqual(JSON.parse(chamadas[0].opcoes.body), { p_aba: payload.aba, p_linhas: payload.linhas });
});
