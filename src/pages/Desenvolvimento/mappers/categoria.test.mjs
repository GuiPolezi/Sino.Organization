// Casos do card de uma categoria de /desenvolvimento: membros, tickets criados e rankings.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { aCadaQuantas, desempenhoDaCategoria } from './categoria.js';
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

test('tickets criados e a frequência da categoria entre as solicitações do período', () => {
  const semana = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', '7d', HOJE);
  // No período (10 a 16/10): 3 de Cartórios em 7 solicitações.
  assert.equal(semana.criados, 3);
  assert.equal(semana.aCada, 3);
  assert.equal(desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'hoje', HOJE).aCada, null);
  assert.equal(aCadaQuantas(0, 10), null);
  assert.equal(aCadaQuantas(4, 4), 1);
  assert.equal(aCadaQuantas(2, 9), 5, 'arredonda para cima: em 5 há pelo menos 1, na média');
});

test('rankings: atribuídos e fechados no período, e o primeiro lugar de cada um', () => {
  const tudo = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', 'tudo', HOJE);
  const [atribuidos, fechados, tempo] = tudo.rankings;
  assert.deepEqual(atribuidos.itens.map(({ valor }) => valor), [3, 1, 1]);
  assert.equal(atribuidos.melhor, 'a');
  assert.deepEqual(fechados.itens.map(({ valor }) => valor), [2, 1, 1]);
  // Tempo médio: a (2 e 4 dias) 3; b 1; c 2. O menor vence.
  assert.deepEqual(tempo.itens.map(({ valor }) => valor), [3, 1, 2]);
  assert.equal(tempo.menorVence, true);
  assert.equal(tempo.melhor, 'b');
});

test('o fechado conta pela data em que fechou; sem nada a medir, ninguém fica em primeiro', () => {
  // Atribuído em 01/10 e fechado em 05/10: fora dos últimos 7 dias.
  const semana = desempenhoDaCategoria(EQUIPE, CHAMADOS, 'Cartórios', '7d', HOJE);
  assert.deepEqual(semana.rankings[1].itens.map(({ valor }) => valor), [1, 1, 0]);
  assert.deepEqual(semana.rankings[2].itens.map(({ valor }) => valor), [2, 1, null]);

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
  assert.ok(algum.criados > 0 && algum.aCada >= 1);
  assert.ok(algum.rankings[2].itens.every(({ valor }) => valor === null || valor >= 0));
});
