// Casos do painel "Quadro da equipe" de /desenvolvimento: totais e gráficos por período.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { CATEGORIAS, FECHADO } from './chamados.js';
import { LIMITE_LOCAIS, LIMITE_TIPOS, OUTROS, visaoGeral } from './visaoGeral.js';

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

test('carga por local: pelo campo Local, do maior para o menor, empate pelo nome, com as subcategorias', () => {
  const visao = visaoGeral([dev('a'), dev('b')], CHAMADOS, 'tudo', HOJE);
  const { porLocal } = visao;
  assert.deepEqual(
    porLocal.map(({ local, total }) => [local, total]),
    [
      ['Araras', 3],
      ['Franca', 3],
      ['Holambra CM', 1],
    ],
  );
  // As subcategorias com cor: as mais comuns da equipe, sem "Sem assunto"; no empate, pelo nome.
  assert.deepEqual(visao.tiposDosLocais, ['Bug / Erro', 'Dúvida Operacional', 'Implantação', 'Melhoria / Nova Função', OUTROS]);
  const franca = porLocal[1];
  assert.deepEqual(
    franca.tipos.map(({ tipo, total }) => [tipo, total]),
    [
      ['Bug / Erro', 1],
      ['Dúvida Operacional', 0],
      ['Implantação', 1],
      ['Melhoria / Nova Função', 1],
    ],
  );
  // "Sem assunto" não tem cor própria: soma em "Outros", depois das com cor.
  assert.deepEqual(porLocal[2].tipos.at(-1), { tipo: OUTROS, total: 1 });
  // A dica traz todas as subcategorias do local, da mais comum para a menos comum.
  assert.deepEqual(porLocal[0].assuntos, [
    { assunto: 'Bug / Erro', total: 2 },
    { assunto: 'Dúvida Operacional', total: 1 },
  ]);
});

test('carga por local: só as cinco subcategorias mais comuns têm cor, as mesmas em todo período', () => {
  const assuntos = ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'E', 'E', 'F'];
  // "F" só existe hoje, e o mais comum ("A") só existe no passado.
  const lista = assuntos.map((assunto) => chamado(assunto === 'A' ? '2026-01-01' : HOJE, 'Site', 'Itapevi CM', assunto));
  const chamados = { x: { lista } };

  assert.equal(LIMITE_TIPOS, 5);
  for (const periodo of ['tudo', 'hoje']) {
    const visao = visaoGeral([dev('x')], chamados, periodo, HOJE);
    assert.deepEqual(visao.tiposDosLocais, ['A', 'B', 'C', 'D', 'E', OUTROS], periodo);
  }
  const [itapevi] = visaoGeral([dev('x')], chamados, 'hoje', HOJE).porLocal;
  assert.deepEqual(
    itapevi.tipos.map(({ total }) => total),
    [0, 5, 4, 3, 2, 1],
  );
  assert.equal(itapevi.assuntos.length, 5);

  // Sem chamado fora das cinco, a legenda não traz "Outros".
  const semOutros = visaoGeral([dev('x')], { x: { lista: lista.filter(({ assunto }) => assunto !== 'F') } }, 'tudo', HOJE);
  assert.ok(!semOutros.tiposDosLocais.includes(OUTROS));
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
    Object.entries(JSON.parse(readFileSync(new URL('../../../data/chamados.json', import.meta.url), 'utf8')).desenvolvedores).map(
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
    assert.ok(visao.tiposDosLocais.filter((tipo) => tipo !== OUTROS).length <= LIMITE_TIPOS, `legenda em ${periodo}`);
    for (const { local, total, tipos, assuntos } of visao.porLocal) {
      assert.equal(soma(tipos), total, `tipos de ${local} em ${periodo}`);
      assert.equal(soma(assuntos), total, `assuntos de ${local} em ${periodo}`);
    }
  }
  // Em todo o tempo há mais de dez locais, e todo chamado tem local.
  const visao = visaoGeral(equipe, chamados, 'tudo', HOJE);
  assert.equal(visao.porLocal.length, 10);
  const todos = Object.values(chamados).flatMap(({ lista }) => lista);
  assert.ok(todos.every(({ local }) => typeof local === 'string' && local.trim() === local && local !== ''));
  assert.ok(!visao.tiposDosLocais.includes('Sem assunto'));
});
