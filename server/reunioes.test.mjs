import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoReunioes, reunioesMemoria } from './reunioes.mjs';
import { tratarApi } from './api.mjs';

// Segunda-feira, 26/10/2026, 12:00 em Brasília.
const AGORA = new Date('2026-10-26T15:00:00Z');
const ID = '3f2b8c1e-5a4d-4e8f-9b7a-1c2d3e4f5a6b';

const dados = (extra = {}) => ({
  id: ID,
  titulo: '  Alinhamento   semanal ',
  dataHora: '2026-10-27T09:00',
  horaFim: '10:00',
  modalidade: 'presencial',
  membros: [{ id: 'm1', nome: 'Roberto' }, 'Fábio'],
  ...extra,
});

const novoServico = () => criarServicoReunioes(reunioesMemoria(), () => AGORA);

test('cria normalizando e lista a reunião', async () => {
  const servico = novoServico();
  const { ok, reuniao } = await servico.criar(dados());
  assert.equal(ok, true);
  assert.equal(reuniao.titulo, 'Alinhamento semanal');
  assert.equal(reuniao.criadaEm, AGORA.toISOString());
  assert.deepEqual(reuniao.membros.map((m) => m.nome), ['Roberto', 'Fábio']);
  assert.deepEqual((await servico.listar()).map((r) => r.id), [ID]);
});

test('recusa dados inválidos com os mesmos erros da tela', async () => {
  const servico = novoServico();
  const passado = await servico.criar(dados({ dataHora: '2026-10-20T09:00' }));
  assert.equal(passado.status, 422);
  assert.equal(passado.erros.dataHora, 'Escolha uma data e hora no futuro.');

  const repetidos = await servico.criar(dados({ membros: ['Ana', 'ANA '] }));
  assert.equal(repetidos.erros.membros, 'Há membros repetidos na lista.');

  const idRuim = await servico.criar(dados({ id: '../x' }));
  assert.equal(idRuim.status, 422);
});

test('migração aceita reunião passada e mantém criadaEm', async () => {
  const servico = novoServico();
  const antiga = dados({ dataHora: '2026-10-01T09:00', criadaEm: '2026-09-28T12:00:00.000Z' });
  assert.equal((await servico.criar(antiga)).status, 422);
  const { ok, reuniao } = await servico.criar(antiga, { migracao: true });
  assert.equal(ok, true);
  assert.equal(reuniao.criadaEm, '2026-09-28T12:00:00.000Z');
});

test('edita mantendo criadaEm e marca editadaEm; 404 para quem não existe', async () => {
  const servico = novoServico();
  await servico.criar(dados());
  const { reuniao } = await servico.editar(ID, dados({ titulo: 'Novo título' }));
  assert.equal(reuniao.titulo, 'Novo título');
  assert.equal(reuniao.criadaEm, AGORA.toISOString());
  assert.equal(reuniao.editadaEm, AGORA.toISOString());
  assert.equal((await servico.editar('nao-existe-123', dados())).status, 404);
});

test('apagar esconde a reunião (não aparece mais em listar nem obter)', async () => {
  const servico = novoServico();
  await servico.criar(dados());
  assert.equal((await servico.apagar(ID)).ok, true);
  assert.deepEqual(await servico.listar(), []);
  assert.equal((await servico.obter(ID)).status, 404);
  assert.equal((await servico.apagar(ID)).status, 404);
});

test('rotas HTTP: criar, repetir, obter, apagar, método e corpo inválidos', async () => {
  delete process.env.SUPABASE_URL;
  const pedir = (metodo, caminho, corpo) =>
    tratarApi(
      new Request(`http://x${caminho}`, {
        method: metodo,
        ...(corpo !== undefined && { body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) }),
      }),
    );
  // Data sempre no futuro, seja qual for o dia em que o teste rodar.
  const amanha = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const corpo = dados({ dataHora: `${amanha}T09:00` });

  assert.equal((await pedir('POST', '/api/reunioes', corpo)).status, 201);
  assert.equal((await pedir('POST', '/api/reunioes', corpo)).status, 409);
  assert.equal((await (await pedir('GET', `/api/reunioes/${ID}`)).json()).reuniao.id, ID);
  assert.equal((await pedir('POST', '/api/reunioes', '{quebrado')).status, 400);
  assert.equal((await pedir('POST', '/api/reunioes', 'x'.repeat(30_000))).status, 413);
  assert.equal((await pedir('PATCH', '/api/reunioes')).status, 405);
  assert.equal((await pedir('DELETE', `/api/reunioes/${ID}`)).status, 204);
  assert.equal((await pedir('GET', `/api/reunioes/${ID}`)).status, 404);
});
