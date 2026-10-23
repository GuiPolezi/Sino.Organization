// Casos do card de uma categoria de /desenvolvimento: membros, tickets criados e rankings.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { aCadaQuantas, desempenhoDaCategoria, tempoParaMostrar } from './categoria.js';
import { CATEGORIAS, FECHADO } from './chamados.js';

const HOJE = '2026-10-16';
const dev = (id) => ({ id, nome: id, funcao: '', ausente: false, avatarIniciais: 'X' });
const aberto = (data, categoria) => ({ data, status: 'Em atendimento', categoria });
const fechado = (data, fechadoEm, categoria = 'Cartórios') => ({ data, fechadoEm, status: FECHADO, categoria });

const CHAMADOS = {
  a: {
    ficticio: true,
    lista: [
      fechado('2026-10-10', '2026-10-12'),
      fechado('2026-10-01', '2026-10-05'),
      aberto('2026-10-15', 'Cartórios'),
      aberto('2026-10-14', 'Site'),
    ],
  },
  b: { lista: [fechado('2026-10-14', '2026-10-15'), aberto('2026-10-16', 'Site'), aberto('2026-10-16', 'Site')] },
  c: { lista: [aberto('2026-10-16', 'Site'), fechado('2025-01-01', '2025-01-03')] },
};
const EQUIPE = [dev('a'), dev('b'), dev('c'), dev('sem-chamados')];

test('membros são quem tem algum chamado da categoria, em qualquer data, na ordem da equipe', () => {
  const hoje = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'hoje', HOJE);
  assert.deepEqual(hoje.membros.map(({ id }) => id), ['a', 'b', 'c']);
  assert.deepEqual(desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Site', 'tudo', HOJE).membros.map(({ id }) => id), ['a', 'b', 'c']);
  assert.deepEqual(desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Painel', 'tudo', HOJE).membros, []);
});

test('tickets criados e frequência saem só dos chamados da equipe', () => {
  const semana = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', '7d', HOJE);
  // No período (10 a 16/10): 3 de Cartórios em 7 solicitações.
  assert.equal(semana.criados, 3);
  assert.deepEqual(semana.aCada, { x: 7, y: 3 });
  assert.equal(desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'hoje', HOJE).aCada, null);
});

test('"a cada X, pelo menos Y": a fração com X até 10 mais perto da parte, sem passar dela', () => {
  assert.equal(aCadaQuantas(0, 10), null);
  assert.deepEqual(aCadaQuantas(4, 4), { x: 1, y: 1 });
  assert.deepEqual(aCadaQuantas(45, 100), { x: 9, y: 4 });
  assert.deepEqual(aCadaQuantas(1, 3), { x: 3, y: 1 });
  assert.deepEqual(aCadaQuantas(2, 4), { x: 2, y: 1 }, 'no empate, a de X menor');
  assert.deepEqual(aCadaQuantas(2, 9), { x: 9, y: 2 });
  assert.deepEqual(aCadaQuantas(99, 100), { x: 10, y: 9 });
  // Abaixo de 1 a cada 10: Y 1, e X arredonda para cima (em 13 há pelo menos 1, na média).
  assert.deepEqual(aCadaQuantas(8, 100), { x: 13, y: 1 });
  // Nunca promete mais do que a parte da categoria.
  for (let daCategoria = 1; daCategoria <= 50; daCategoria += 1) {
    const { x, y } = aCadaQuantas(daCategoria, 50);
    assert.ok(y / x <= daCategoria / 50, `${daCategoria}/50`);
  }
});

test('o tempo médio aparece em horas abaixo de 1 dia e em dias a partir dele', () => {
  assert.deepEqual(tempoParaMostrar(0.4), { numero: null, unidade: 'Menos de 1 h' });
  assert.deepEqual(tempoParaMostrar(1), { numero: 1, unidade: 'h' });
  assert.deepEqual(tempoParaMostrar(5.4), { numero: 5, unidade: 'h' });
  assert.deepEqual(tempoParaMostrar(23.6), { numero: 1, unidade: 'Dia' });
  assert.deepEqual(tempoParaMostrar(36), { numero: 2, unidade: 'Dias' });
  assert.deepEqual(tempoParaMostrar(24 * 12.4), { numero: 12, unidade: 'Dias' });
});

test('rankings: atribuídos e fechados no período, e o primeiro lugar de cada um', () => {
  const tudo = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'tudo', HOJE);
  const [atribuidos, fechados, tempo] = tudo.rankings;
  assert.deepEqual(atribuidos.itens.map(({ valor }) => valor), [3, 1, 1]);
  assert.equal(atribuidos.melhor, 'a');
  assert.deepEqual(fechados.itens.map(({ valor }) => valor), [2, 1, 1]);
  // Tempo médio, em horas: a (2 e 4 dias) 72; b 24; c 48. O menor vence.
  assert.deepEqual(tempo.itens.map(({ valor }) => valor), [72, 24, 48]);
  assert.equal(tempo.menorVence, true);
  assert.equal(tempo.melhor, 'b');
});

test('o tempo usa a hora de abertura e de finalização quando o chamado tem', () => {
  const comHora = { a: { lista: [{ ...fechado(HOJE, HOJE), minutos: 90 }, { ...fechado(HOJE, '2026-10-17'), minutos: 150 }] } };
  const [, , tempo] = desempenhoDaCategoria(EQUIPE, comHora, 'Cartórios', 'hoje', HOJE).rankings;
  assert.equal(tempo.itens[0].valor, 2);
});

test('fechados e tempo contam pela data de criação, como os atribuídos; sem nada a medir, ninguém fica em primeiro', () => {
  // Criado em 01/10 e fechado em 05/10: fora dos últimos 7 dias. O de 10/10 entra.
  const semana = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', '7d', HOJE);
  assert.deepEqual(semana.rankings[0].itens.map(({ valor }) => valor), [2, 1, 0]);
  assert.deepEqual(semana.rankings[1].itens.map(({ valor }) => valor), [1, 1, 0]);
  assert.deepEqual(semana.rankings[2].itens.map(({ valor }) => valor), [48, 24, null]);
  // Fechado nunca passa de atribuído.
  for (const [i, { valor }] of semana.rankings[1].itens.entries()) assert.ok(valor <= semana.rankings[0].itens[i].valor);

  const hoje = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'hoje', HOJE);
  for (const ranking of hoje.rankings) assert.equal(ranking.melhor, null, ranking.id);
});

test('no empate, o primeiro lugar fica com quem vem antes na equipe', () => {
  const empate = { a: { lista: [aberto('2026-10-16', 'Site')] }, b: { lista: [aberto('2026-10-16', 'Site')] } };
  assert.equal(desempenhoDaCategoria(EQUIPE, empate, 'Site', 'tudo', HOJE).rankings[0].melhor, 'a');
});

const chamadosDoMilldesk = () =>
  Object.fromEntries(
    Object.entries(JSON.parse(readFileSync(new URL('../../../data/chamados.json', import.meta.url), 'utf8')).desenvolvedores).map(
      ([id, lista]) => [id, { lista }],
    ),
  );

test('com os chamados do Milldesk, só fechado tem data de fechamento, nunca antes da criação', () => {
  const chamados = chamadosDoMilldesk();
  const equipe = Object.keys(chamados).map(dev);
  for (const { lista } of Object.values(chamados)) {
    for (const chamado of lista) {
      if (chamado.status !== FECHADO) assert.equal(chamado.fechadoEm, undefined);
      else if (chamado.fechadoEm) assert.ok(chamado.fechadoEm >= chamado.data, JSON.stringify(chamado));
    }
  }
  const algum = CATEGORIAS.map((nome) => desempenhoDaCategoria(equipe, chamados, nome, 'tudo', HOJE)).find(({ membros }) => membros.length);
  assert.ok(algum.criados > 0 && algum.aCada.x >= 1);
  assert.ok(algum.rankings[2].itens.every(({ valor }) => valor === null || valor >= 0));
});

test('com os chamados do Milldesk, tickets criados é a soma dos atribuídos dos membros', () => {
  const chamados = chamadosDoMilldesk();
  const equipe = Object.keys(chamados).map(dev);
  for (const periodo of ['tudo', '30d', '7d', 'hoje']) {
    const total = CATEGORIAS.reduce((soma, nome) => soma + desempenhoDaCategoria(equipe, chamados, nome, periodo, HOJE).criados, 0);
    for (const nome of CATEGORIAS) {
      const { criados, rankings } = desempenhoDaCategoria(equipe, chamados, nome, periodo, HOJE);
      const atribuidos = rankings[0].itens.reduce((soma, { valor }) => soma + valor, 0);
      assert.equal(criados, atribuidos, `${nome} em ${periodo}`);
      assert.ok(criados <= total);
    }
  }
  // Quase todo fechado tem as horas de abertura e de finalização.
  const fechados = Object.values(chamados).flatMap(({ lista }) => lista.filter(({ status }) => status === FECHADO));
  assert.ok(fechados.filter(({ minutos }) => typeof minutos === 'number').length > fechados.length * 0.9);
});
