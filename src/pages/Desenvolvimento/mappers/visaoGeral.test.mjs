// Casos do painel "Quadro da equipe" de /desenvolvimento: totais e gráficos por período.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { CATEGORIAS, FECHADO } from './chamados.js';
import { LIMITE_LOCAIS, visaoGeral } from './visaoGeral.js';

const HOJE = '2026-10-16';
const dev = (id) => ({ id, nome: id, funcao: '', ausente: false, avatarIniciais: 'X' });
const chamado = (data, categoria, local, assunto = 'Bug / Erro') => ({ data, status: FECHADO, categoria, assunto, local });

const CHAMADOS = {
  a: {
    ficticio: true,
    lista: [
      chamado('2026-10-16', 'Site', 'Araras'),
      chamado('2026-10-16', 'Siscam 9', 'Araras', 'Dúvida Operacional'),
      chamado('2026-10-12', 'Siscam 9', 'Franca', 'Melhoria / Nova Função'),
      chamado('2026-08-01', 'Cartórios', 'Franca'),
    ],
  },
  b: {
    lista: [
      chamado('2026-10-16', 'Siscam 9', 'Holambra CM', 'Sem assunto'),
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
    { id: 'b', nome: 'b', exMembro: false, total: 1 },
    { id: 'a', nome: 'a', exMembro: false, total: 3 },
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

test('carga por local: pelo campo Local, do maior para o menor, empate pelo nome, só com a quantidade', () => {
  const { porLocal } = visaoGeral([dev('a'), dev('b')], CHAMADOS, 'tudo', HOJE);
  assert.deepEqual(porLocal, [
    { local: 'Araras', rotulo: 'Araras', total: 3 },
    { local: 'Franca', rotulo: 'Franca', total: 3 },
    { local: 'Holambra CM', rotulo: 'Holambra CM', total: 1 },
  ]);
  assert.deepEqual(
    visaoGeral([dev('a'), dev('b')], CHAMADOS, 'hoje', HOJE).porLocal.map(({ local, total }) => [local, total]),
    [
      ['Araras', 2],
      ['Holambra CM', 1],
    ],
  );
});

test('carga por local: o rótulo é o nome curto, e o local continua inteiro', () => {
  const nome = '2º Tabelião de Notas de Piracicaba Bortoletto';
  const chamados = { x: { lista: [chamado(HOJE, 'Cartórios', nome), chamado(HOJE, 'Site', 'Leme CM')] } };
  const { porLocal } = visaoGeral([dev('x')], chamados, 'hoje', HOJE);
  assert.deepEqual(
    porLocal.map(({ local, rotulo }) => [local, rotulo]),
    [
      [nome, '2º Tab. Notas Piracicaba Bortoletto'],
      ['Leme CM', 'Leme CM'],
    ],
  );
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

const chamadosDoMilldesk = () =>
  Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(new URL('../fixtures/chamados.json', import.meta.url), 'utf8')).desenvolvedores).map(
      ([id, lista]) => [id, { lista }],
    ),
  );

test('os chamados do Milldesk fecham as contas do painel em todos os períodos', () => {
  const chamados = chamadosDoMilldesk();
  const equipe = Object.keys(chamados).map(dev);
  const soma = (itens) => itens.reduce((total, item) => total + item.total, 0);

  for (const periodo of ['tudo', '30d', '7d', 'hoje']) {
    const visao = visaoGeral(equipe, chamados, periodo, HOJE);
    assert.equal(visao.ficticio, false);
    assert.equal(soma(visao.porDesenvolvedor), visao.total, `devs em ${periodo}`);
    assert.equal(soma(visao.porCategoria), visao.total, `categorias em ${periodo}`);
    assert.ok(visao.porCategoria.every(({ nome }) => CATEGORIAS.includes(nome)), `categorias em ${periodo}`);
    assert.ok(visao.porLocal.length <= 10, `locais em ${periodo}`);
    assert.ok(soma(visao.porLocal) <= visao.total, `locais em ${periodo}`);
    for (const item of visao.porLocal) assert.deepEqual(Object.keys(item), ['local', 'rotulo', 'total'], `${item.local} em ${periodo}`);
  }
  // Em todo o tempo há mais de dez locais, e todo chamado tem local.
  const visao = visaoGeral(equipe, chamados, 'tudo', HOJE);
  assert.equal(visao.porLocal.length, 10);
  const todos = Object.values(chamados).flatMap(({ lista }) => lista);
  assert.ok(todos.every(({ local }) => typeof local === 'string' && local.trim() === local && local !== ''));
});

test('o ex-membro entra nos totais e vem marcado na carga por desenvolvedor', () => {
  const ex = { ...dev('b'), exMembro: true };
  const visao = visaoGeral([dev('a'), ex], CHAMADOS, 'tudo', HOJE);
  assert.equal(visao.total, 7);
  assert.deepEqual(
    visao.porDesenvolvedor.map(({ id, exMembro }) => [id, exMembro]),
    [
      ['a', false],
      ['b', true],
    ],
  );
});
