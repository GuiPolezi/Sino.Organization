import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armazemMemoria, criarCache } from './cache.mjs';
import { INICIO, JANELAS_RECENTES, juntarJanelas, janelas, obterChamados, renovarJanelasAntigas } from './chamados.mjs';

test('janelas de 90 dias cobrem de out/2017 até hoje, sem buracos', () => {
  const lista = janelas('2026-10-25');
  assert.equal(lista[0].inicio, INICIO);
  assert.equal(lista[0].chave, 'chamados:2017-10-01');
  assert.equal(lista.at(-1).fim, '2026-10-25');
  for (let i = 1; i < lista.length; i += 1) {
    const diaSeguinte = new Date(Date.parse(`${lista[i - 1].fim}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
    assert.equal(lista[i].inicio, diaSeguinte);
  }
  // A chave de uma janela não muda com o passar dos dias (só o fim da última).
  assert.deepEqual(janelas('2026-10-26').map((j) => j.chave), lista.map((j) => j.chave));
});

test('juntarJanelas põe o chamado mais novo primeiro e ignora quem não é da equipe', () => {
  const juntos = juntarJanelas([
    { inicio: '2017-10-01', desenvolvedores: { adriano: [{ data: '2017-11-02' }], fulano: [{ data: '2017-11-03' }] } },
    { inicio: '2018-01-01', desenvolvedores: { adriano: [{ data: '2018-02-10' }, { data: '2018-01-05' }] } },
  ]);
  assert.deepEqual(juntos.adriano.map((c) => c.data), ['2018-02-10', '2018-01-05', '2017-11-02']);
  assert.equal(juntos.fulano, undefined);
  assert.deepEqual(juntos.rafael, []);
});

// Cache com as janelas recentes já frescas: obterChamados não chama o Milldesk.
async function servicosComJanelas(guardar) {
  const armazem = armazemMemoria();
  const agora = new Date().toISOString();
  for (const [chave, dados] of guardar) await armazem.gravar(chave, { dados, geradoEm: agora });
  return { armazem, cache: criarCache({ armazem }) };
}

test('obterChamados junta as recentes (do cache) com as antigas guardadas e conta as que faltam', async () => {
  const todas = janelas();
  const recentes = todas.slice(-JANELAS_RECENTES);
  const antiga = todas[0];
  const servicos = await servicosComJanelas([
    [antiga.chave, { inicio: antiga.inicio, desenvolvedores: { adriano: [{ data: '2017-11-02' }] } }],
    ...recentes.map((j, i) => [j.chave, { inicio: j.inicio, desenvolvedores: { adriano: [{ data: `${j.inicio}-r${i}` }] } }]),
  ]);

  const { dados, situacao } = await obterChamados(servicos);
  assert.equal(situacao, 'recente');
  assert.deepEqual(dados.janelas, { total: todas.length, carregadas: 1 + JANELAS_RECENTES });
  assert.equal(dados.desenvolvedores.adriano.length, 3);
  assert.equal(dados.desenvolvedores.adriano.at(-1).data, '2017-11-02');
});

test('rodízio: renova primeiro as janelas que nunca foram buscadas, respeitando o limite', async () => {
  const servicos = await servicosComJanelas([]);
  const buscadas = [];
  // Troca o cache por um que registra a chave e devolve sem ir à rede.
  const cache = async (chave, _buscar, opcoes) => {
    buscadas.push([chave, opcoes?.idadeMaximaMs]);
    await servicos.armazem.gravar(chave, { dados: {}, geradoEm: new Date().toISOString() });
    return {};
  };
  const resultado = await renovarJanelasAntigas({ ...servicos, cache }, { limite: 2, prazoMs: Infinity });
  assert.deepEqual(resultado.renovadas, ['chamados:2017-10-01', 'chamados:2017-12-30']);
  assert.ok(buscadas.every(([, idade]) => idade === 0));
  assert.equal(resultado.faltando, janelas().length - JANELAS_RECENTES - 2);
});
