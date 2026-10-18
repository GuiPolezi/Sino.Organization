// Casos do que vai escrito no quadro da cena de /desenvolvimento: o resumo do painel.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { CORES_TIPOS } from '../card/cores.js';
import { anotacoesDoQuadro } from './anotacoes.js';

const dev = (id, total) => ({ id, nome: `${id[0].toUpperCase()}${id.slice(1)} Silva`, total });
const local = (nome, bug, melhoria) => ({
  local: nome,
  total: bug + melhoria,
  tipos: [
    { tipo: 'Bug/Erro', total: bug },
    { tipo: 'Melhoria/Função', total: melhoria },
    { tipo: 'Implantação', total: 0 },
  ],
});

const resumo = (visao = {}, totalDesenvolvedores = 3) => ({
  totalDesenvolvedores,
  visao: { total: 3715, porDesenvolvedor: [dev('ana', 10), dev('beto', 30)], porCategoria: [], porLocal: [local('Araras', 4, 2)], ficticio: true, ...visao },
});

test('com chamados, o quadro resume o painel: total no post-it, pizza por dev e barras por local', () => {
  const anotacoes = anotacoesDoQuadro(resumo());

  assert.equal(anotacoes.assinatura, 'desenvolvimento');
  assert.deepEqual(anotacoes.postit, { numero: '+3.715', linhas: ['total de', 'tickets ★'] });

  assert.equal(anotacoes.grafico.titulo, 'Carga por Dev');
  assert.equal(anotacoes.grafico.subtitulo, 'todo o tempo');
  // Da maior para a menor, com o primeiro nome e a cor fixa de cada pessoa (a posição dela na equipe).
  assert.deepEqual(
    anotacoes.grafico.fatias.map(({ rotulo, valor }) => [rotulo, valor]),
    [['Beto', 30], ['Ana', 10]],
  );
  assert.notEqual(anotacoes.grafico.fatias[0].cor, anotacoes.grafico.fatias[1].cor);

  assert.equal(anotacoes.lista.titulo, 'Carga por Local');
  assert.deepEqual(anotacoes.lista.barras, [
    {
      rotulo: 'Araras',
      valor: 6,
      partes: [
        { cor: CORES_TIPOS['Bug/Erro'], valor: 4 },
        { cor: CORES_TIPOS['Melhoria/Função'], valor: 2 },
      ],
    },
  ]);
});

test('no papel cabem seis fatias: da sétima em diante, viram "outros"; quem não tem ticket não entra', () => {
  const porDesenvolvedor = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => dev(id, 8 - i));
  const { fatias } = anotacoesDoQuadro(resumo({ porDesenvolvedor: [...porDesenvolvedor, dev('z', 0)] })).grafico;

  assert.equal(fatias.length, 6);
  assert.deepEqual(fatias.at(-1), { chave: 'Outros', rotulo: 'outros', valor: 3 + 2 + 1, cor: CORES_TIPOS.Outros });
  assert.ok(!fatias.some(({ rotulo }) => rotulo === 'Z'));
});

test('na folha cabem cinco barras, na ordem do painel', () => {
  const porLocal = ['A', 'B', 'C', 'D', 'E', 'F'].map((nome, i) => local(nome, 10 - i, 0));
  const { barras } = anotacoesDoQuadro(resumo({ porLocal })).lista;
  assert.deepEqual(
    barras.map(({ rotulo }) => rotulo),
    ['A', 'B', 'C', 'D', 'E'],
  );
});

test('sem chamados, sobra o post-it com o tamanho da equipe; sem equipe, nada', () => {
  const vazio = { total: null, porDesenvolvedor: [], porLocal: [] };

  const anotacoes = anotacoesDoQuadro(resumo(vazio, 10));
  assert.equal(anotacoes.grafico, null);
  assert.equal(anotacoes.lista, null);
  assert.deepEqual(anotacoes.postit, { numero: 10, linhas: ['desenvolvedores', 'na equipe ★'] });

  assert.deepEqual(anotacoesDoQuadro(resumo(vazio, 1)).postit.linhas, ['desenvolvedor', 'na equipe ★']);
  assert.equal(anotacoesDoQuadro(resumo(vazio, 0)).postit, null);
});

test('zero tickets ainda é um número para o post-it', () => {
  assert.deepEqual(anotacoesDoQuadro(resumo({ total: 0, porDesenvolvedor: [], porLocal: [] })).postit, {
    numero: '0',
    linhas: ['total de', 'tickets ★'],
  });
});
