import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armazemMemoria, criarCache } from './cache.mjs';

const MINUTO = 60_000;

// Relógio controlado pelo teste.
function relogio(inicio = Date.parse('2026-10-26T12:00:00Z')) {
  let agora = inicio;
  return { agora: () => agora, avancar: (ms) => (agora += ms) };
}

const contador = (valor = 'dado') => {
  const buscar = async () => {
    buscar.vezes += 1;
    return `${valor} ${buscar.vezes}`;
  };
  buscar.vezes = 0;
  return buscar;
};

test('busca na primeira vez e reaproveita enquanto tem menos de 15 minutos', async () => {
  const { agora, avancar } = relogio();
  const obter = criarCache({ armazem: armazemMemoria(), agora });
  const buscar = contador();

  const primeiro = await obter('licencas', buscar);
  assert.equal(primeiro.situacao, 'atualizado');
  assert.equal(primeiro.dados, 'dado 1');

  avancar(14 * MINUTO);
  const segundo = await obter('licencas', buscar);
  assert.equal(segundo.situacao, 'recente');
  assert.equal(segundo.dados, 'dado 1');
  assert.equal(buscar.vezes, 1);

  avancar(2 * MINUTO);
  const terceiro = await obter('licencas', buscar);
  assert.equal(terceiro.situacao, 'atualizado');
  assert.equal(terceiro.dados, 'dado 2');
});

test('se a busca falha, devolve o dado antigo com aviso e libera a trava', async () => {
  const { agora, avancar } = relogio();
  const obter = criarCache({ armazem: armazemMemoria(), agora, mensagemDe: () => 'Site fora do ar.' });
  await obter('licencas', contador());

  avancar(20 * MINUTO);
  const falhou = await obter('licencas', async () => {
    throw new Error('rede');
  });
  assert.equal(falhou.situacao, 'antigo');
  assert.equal(falhou.dados, 'dado 1');
  assert.equal(falhou.aviso, 'Site fora do ar.');

  // A trava foi liberada: a próxima tentativa busca de novo.
  const depois = await obter('licencas', contador('novo'));
  assert.equal(depois.dados, 'novo 1');
});

test('sem dado nenhum, o erro da busca chega a quem pediu', async () => {
  const obter = criarCache({ armazem: armazemMemoria() });
  await assert.rejects(
    obter('licencas', async () => {
      throw new Error('rede');
    }),
    /rede/,
  );
});

test('dois acessos ao mesmo tempo disparam uma busca só', async () => {
  const { agora, avancar } = relogio();
  const armazem = armazemMemoria();
  const obter = criarCache({ armazem, agora, esperaMs: 5 });
  await obter('licencas', contador());
  avancar(20 * MINUTO);

  let liberar;
  const lenta = async () => {
    await new Promise((r) => (liberar = r));
    return 'fresco';
  };
  const buscar = contador();
  const primeiro = obter('licencas', lenta);
  await new Promise((r) => setImmediate(r));
  const segundo = await obter('licencas', buscar);

  // O segundo recebe o dado de antes, sem buscar.
  assert.equal(segundo.situacao, 'atualizando');
  assert.equal(segundo.dados, 'dado 1');
  assert.equal(buscar.vezes, 0);

  liberar();
  assert.equal((await primeiro).dados, 'fresco');
});

test('sem dado e com outra busca em andamento, espera ela terminar', async () => {
  const armazem = armazemMemoria();
  const obter = criarCache({ armazem, esperaMs: 5 });

  let liberar;
  const primeiro = obter('licencas', async () => {
    await new Promise((r) => (liberar = r));
    return 'primeiro';
  });
  await new Promise((r) => setImmediate(r));
  const segundo = obter('licencas', contador());
  liberar();

  assert.equal((await primeiro).dados, 'primeiro');
  assert.equal((await segundo).dados, 'primeiro');
});
