// Casos do painel "Quadro da equipe" de /desenvolvimento: totais e gráficos por período.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { buscarChamados } from '../api/chamados.js';
import { CATEGORIAS, FECHADO, TIPOS } from './chamados.js';
import { LIMITE_LOCAIS, visaoGeral } from './visaoGeral.js';

const HOJE = '2026-10-16';
const dev = (id) => ({ id, nome: id, funcao: '', ausente: false, avatarIniciais: 'X' });
const chamado = (data, categoria, local, tipo = 'Bug/Erro') => ({ data, status: FECHADO, categoria, tipo, local });

const CHAMADOS = {
  a: {
    ficticio: true,
    lista: [
      chamado('2026-10-16', 'Site', 'Araras'),
      chamado('2026-10-16', 'Siscam 9', 'Araras', 'Dúvidas'),
      chamado('2026-10-12', 'Siscam 9', 'Franca', 'Melhoria/Função'),
      chamado('2026-08-01', 'Cartórios', 'Franca'),
    ],
  },
  b: {
    lista: [
      chamado('2026-10-16', 'Siscam 9', 'Holambra', 'Treinamento'),
      chamado('2026-10-01', 'Sistema Novo', 'Araras'),
      chamado('2026-09-20', 'Site', 'Franca', 'Implantação'),
    ],
  },
};

test('sem chamados carregados, não há totais nem gráficos', () => {
  for (const chamados of [undefined, {}]) {
    const visao = visaoGeral([dev('a'), dev('b')], chamados, 'tudo', HOJE);
    assert.equal(visao.total, null);
    assert.deepEqual(visao.porDesenvolvedor, []);
    assert.deepEqual(visao.porCategoria, []);
    assert.deepEqual(visao.porLocal, []);
    assert.equal(visao.ficticio, false);
  }
});

test('total de tickets: a soma da equipe no período escolhido', () => {
  const equipe = [dev('a'), dev('b'), dev('c')];
  assert.equal(visaoGeral(equipe, CHAMADOS, 'tudo', HOJE).total, 7);
  assert.equal(visaoGeral(equipe, CHAMADOS, '30d', HOJE).total, 6);
  assert.equal(visaoGeral(equipe, CHAMADOS, '7d', HOJE).total, 4);
  assert.equal(visaoGeral(equipe, CHAMADOS, 'hoje', HOJE).total, 3);
});

test('carga por desenvolvedor: na ordem da equipe, com zeros, só de quem tem chamados', () => {
  const visao = visaoGeral([dev('b'), dev('c'), dev('a')], CHAMADOS, '7d', HOJE);
  assert.deepEqual(visao.porDesenvolvedor, [
    { id: 'b', nome: 'b', total: 1 },
    { id: 'a', nome: 'a', total: 3 },
  ]);
  assert.deepEqual(
    visaoGeral([dev('b'), dev('a')], CHAMADOS, 'hoje', HOJE).porDesenvolvedor.map(({ total }) => total),
    [1, 2],
  );
});

test('carga por categoria: na ordem do Desempenho, sem as zeradas, e as novas no fim', () => {
  const nomes = (periodo) =>
    visaoGeral([dev('a'), dev('b')], CHAMADOS, periodo, HOJE).porCategoria.map(({ nome, total }) => [nome, total]);
  assert.deepEqual(nomes('tudo'), [
    ['Cartórios', 1],
    ['Siscam 9', 3],
    ['Site', 2],
    ['Sistema Novo', 1],
  ]);
  assert.deepEqual(nomes('hoje'), [
    ['Siscam 9', 2],
    ['Site', 1],
  ]);
  // A ordem fixa é a dos botões do Desempenho.
  const ordem = CATEGORIAS.filter((nome) => ['Cartórios', 'Siscam 9', 'Site'].includes(nome));
  assert.deepEqual(ordem, ['Cartórios', 'Siscam 9', 'Site']);
});

test('carga por local: do maior para o menor, empate pelo nome, com os tipos do gráfico', () => {
  const { porLocal } = visaoGeral([dev('a'), dev('b')], CHAMADOS, 'tudo', HOJE);
  assert.deepEqual(
    porLocal.map(({ local, total }) => [local, total]),
    [
      ['Araras', 3],
      ['Franca', 3],
      ['Holambra', 1],
    ],
  );
  const franca = porLocal[1];
  assert.deepEqual(
    franca.tipos.map(({ tipo }) => tipo),
    TIPOS,
  );
  assert.deepEqual(
    franca.tipos.map(({ total }) => total),
    [1, 1, 1, 0, 0],
  );
  // Tipo que o gráfico não conhece entra como "Outros", depois dos fixos.
  assert.deepEqual(porLocal[2].tipos.at(-1), { tipo: 'Outros', total: 1 });
  assert.equal(porLocal[2].tipos.length, TIPOS.length + 1);
});

test('carga por local: só os dez maiores, e chamado sem local não entra', () => {
  const lista = Array.from({ length: 14 }, (_, i) =>
    Array.from({ length: i + 1 }, () => chamado(HOJE, 'Site', `Cidade ${String(i).padStart(2, '0')}`)),
  ).flat();
  lista.push(chamado(HOJE, 'Site', ''), chamado(HOJE, 'Site', undefined));
  const { porLocal, total } = visaoGeral([dev('x')], { x: { lista } }, 'hoje', HOJE);

  assert.equal(LIMITE_LOCAIS, 10);
  assert.equal(porLocal.length, 10);
  assert.equal(porLocal[0].local, 'Cidade 13');
  assert.equal(porLocal[0].total, 14);
  assert.equal(porLocal.at(-1).local, 'Cidade 04');
  assert.equal(total, lista.length);
});

test('os chamados de demonstração fecham as contas do painel em todos os períodos', async () => {
  const equipe = ['adriano', 'antonio', 'arnaldo', 'caique', 'donizeti'].map(dev);
  const chamados = await buscarChamados(equipe, HOJE);
  const soma = (itens) => itens.reduce((total, item) => total + item.total, 0);

  for (const periodo of ['tudo', '30d', '7d', 'hoje']) {
    const visao = visaoGeral(equipe, chamados, periodo, HOJE);
    assert.equal(visao.ficticio, true);
    assert.ok(visao.total > 0, `total em ${periodo}`);
    assert.equal(soma(visao.porDesenvolvedor), visao.total, `devs em ${periodo}`);
    assert.equal(soma(visao.porCategoria), visao.total, `categorias em ${periodo}`);
    assert.ok(visao.porCategoria.every(({ nome }) => CATEGORIAS.includes(nome)), `categorias em ${periodo}`);
    assert.ok(visao.porLocal.length > 0 && visao.porLocal.length <= 10, `locais em ${periodo}`);
    for (const { local, total, tipos } of visao.porLocal) {
      assert.equal(soma(tipos), total, `tipos de ${local} em ${periodo}`);
    }
  }
  // Em todo o tempo há mais de dez locais, e o primeiro concentra bem mais que o décimo.
  const { porLocal } = visaoGeral(equipe, chamados, 'tudo', HOJE);
  assert.equal(porLocal.length, 10);
  assert.ok(porLocal[0].total > porLocal[9].total * 3);
});
