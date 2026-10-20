import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTACOES, OBSTACULOS, aindaEDono, definirEstacoes, dentroDaArea, foraDosBlocos, reservarEstacao, resetarEstacoes, rotaAte } from '../../Suporte/boneco/estacoes.js';
import { BASES, configurarLugares } from './lugares.js';
import { montarLugares } from './planta.js';
import { TEMAS, horaDe, temaDaHora, temaDaReuniao } from './temaHorario.js';
import { AREA_REUNIAO } from './config.js';

test('membros → cadeiras e pufes (tabela do cenário)', () => {
  const casos = [
    [0, [], [], 0],
    [1, ['r1'], [], 0],
    [2, ['r1', 'r2'], [], 0],
    [4, ['r1', 'r2', 'r3', 'r4'], [], 0],
    [5, ['r1', 'r2', 'r3', 'r4'], ['p1'], 0],
    [6, ['r1', 'r2', 'r3', 'r4'], ['p1', 'p2'], 0],
    [8, ['r1', 'r2', 'r3', 'r4'], ['p1', 'p2', 'p3', 'p4'], 0],
    [10, ['r1', 'r2', 'r3', 'r4'], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 0],
    [11, ['r1', 'r2', 'r3', 'r4', 'r5'], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 0],
    [12, ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 0],
    [15, ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], 3],
  ];
  for (const [n, cadeiras, poltronas, emPe] of casos) {
    assert.deepEqual(montarLugares(n), { cadeiras, poltronas, emPe }, `${n} membros`);
  }
  assert.deepEqual(montarLugares(-2), { cadeiras: [], poltronas: [], emPe: 0 });
  assert.deepEqual(montarLugares(undefined), { cadeiras: [], poltronas: [], emPe: 0 });
});

test('horário → período do dia', () => {
  assert.equal(temaDaReuniao({ dataHora: '2026-10-20T20:30' }), TEMAS.noite);
  assert.equal(temaDaReuniao({ dataHora: '2026-10-20T17:45' }), TEMAS.entardecer);
  assert.equal(temaDaReuniao({ dataHora: '2026-10-20T10:00' }), TEMAS.dia);
  assert.equal(temaDaReuniao({ dataHora: '2026-10-20T07:30' }), TEMAS.amanhecer);
  // Limites de cada faixa.
  assert.equal(temaDaHora(horaDe('04:59')), TEMAS.noite);
  assert.equal(temaDaHora(horaDe('05:00')), TEMAS.amanhecer);
  assert.equal(temaDaHora(horaDe('08:59')), TEMAS.amanhecer);
  assert.equal(temaDaHora(horaDe('09:00')), TEMAS.dia);
  assert.equal(temaDaHora(horaDe('16:29')), TEMAS.dia);
  assert.equal(temaDaHora(horaDe('16:30')), TEMAS.entardecer);
  assert.equal(temaDaHora(horaDe('18:59')), TEMAS.entardecer);
  assert.equal(temaDaHora(horaDe('19:00')), TEMAS.noite);
  assert.equal(temaDaHora(horaDe('00:00')), TEMAS.noite);
  // Sem hora válida: dia.
  assert.equal(horaDe('25:00'), null);
  assert.equal(temaDaReuniao({}), TEMAS.dia);
  assert.equal(temaDaReuniao(null), TEMAS.dia);
});

test('todo lugar tem a chegada dentro da área e longe dos obstáculos dos outros', () => {
  configurarLugares(12);
  assert.equal(ESTACOES.length, 12);
  for (const estacao of ESTACOES) {
    assert.ok(dentroDaArea(AREA_REUNIAO, estacao.aprox, 0.2), `${estacao.id}: chegada fora da área`);
    for (const o of OBSTACULOS) {
      if (o.r <= 0 || o.estacao === estacao.id) continue;
      const d = Math.hypot(estacao.aprox.x - o.x, estacao.aprox.z - o.z);
      assert.ok(d > o.r, `${estacao.id}: chegada dentro de um obstáculo de ${o.estacao} (${d.toFixed(2)} ≤ ${o.r})`);
    }
  }
  configurarLugares(0);
});

test('mudar o número de membros mantém quem já está sentado e solta quem perdeu o lugar', () => {
  resetarEstacoes();
  configurarLugares(6);
  const r1 = ESTACOES.find(({ id }) => id === 'r1');
  const p2 = ESTACOES.find(({ id }) => id === 'p2');
  r1.ocupante = 'ana';
  p2.ocupante = 'bia';

  configurarLugares(7);
  assert.equal(ESTACOES.find(({ id }) => id === 'r1'), r1, 'r1 continua a mesma estação');
  assert.equal(r1.ocupante, 'ana');
  assert.equal(p2.ocupante, 'bia');

  configurarLugares(5);
  assert.equal(r1.ocupante, 'ana');
  assert.equal(p2.ocupante, null, 'p2 saiu: a reserva cai');
  assert.ok(!ESTACOES.includes(p2));
  configurarLugares(0);
});

test('reserva exclusiva: um membro por lugar', () => {
  resetarEstacoes();
  configurarLugares(3);
  const ids = ['a', 'b', 'c', 'd'].map((id) => reservarEstacao(id, AREA_REUNIAO)?.id ?? null);
  assert.equal(new Set(ids.slice(0, 3)).size, 3);
  assert.equal(ids[3], null, 'o quarto fica sem lugar');
  configurarLugares(0);
});

test('pufe: senta reto, mais baixo, olhando para a mesa', () => {
  const p1 = BASES.get('p1');
  assert.equal(p1.trajetoDireto, true);
  assert.ok(p1.elevacao < BASES.get('r1').elevacao);
  // A chegada fica entre o pufe e a mesa.
  assert.ok(Math.hypot(p1.aprox.x, p1.aprox.z + 0.5) < Math.hypot(p1.x, p1.z + 0.5));
});

// Segue a rota (rotaAte, a mesma dos bonecos) de um ponto até a chegada do lugar e
// confere que nenhum trecho sai da área ou atravessa a mobília fixa (mesa, cavalete,
// luminária, vidro). Cadeiras e pufes no caminho, os bonecos contornam desviando.
function rotaLivre(inicio, estacao) {
  const alvo = estacao.aprox;
  let pos = inicio;
  for (let passo = 0; passo < 6; passo++) {
    const { ponto } = rotaAte(pos, alvo, AREA_REUNIAO);
    for (let k = 1; k <= 40; k++) {
      const p = { x: pos.x + ((ponto.x - pos.x) * k) / 40, z: pos.z + ((ponto.z - pos.z) * k) / 40 };
      if (!dentroDaArea(AREA_REUNIAO, p, -0.05)) return `saiu da área em (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
      for (const o of OBSTACULOS) {
        if (o.r <= 0 || o.estacao !== 'cenario-reuniao') continue;
        if (Math.hypot(p.x - o.x, p.z - o.z) < o.r - 0.05) {
          return `passa por dentro de ${o.estacao} em (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
        }
      }
    }
    if (ponto === alvo) return null;
    pos = ponto;
  }
  return 'não chegou em 6 trechos';
}

test('dá para chegar a todo lugar ativo vindo da frente da sala', () => {
  for (const n of [2, 4, 6, 12]) {
    configurarLugares(n);
    for (const estacao of ESTACOES) {
      for (const inicio of [{ x: -3, z: 2.5 }, { x: 0, z: 3 }, { x: 3, z: 2.5 }]) {
        const erro = rotaLivre(inicio, estacao);
        assert.equal(erro, null, `${n} membros, ${estacao.id} vindo de (${inicio.x}, ${inicio.z}): ${erro}`);
      }
    }
  }
  configurarLugares(0);
});

test('os pufes não fecham o chão em volta deles (sem retângulo de contorno)', () => {
  configurarLugares(12);
  // Entre os pufes de cada lado e entre eles e a mesa: chão de passagem.
  for (const p of [{ x: -4.3, z: -0.45 }, { x: -3.4, z: -0.5 }, { x: 4.25, z: 0.5 }, { x: 3.4, z: 0.5 }]) {
    assert.ok(foraDosBlocos(p), `(${p.x}, ${p.z}) virou bloco`);
    assert.ok(OBSTACULOS.every((o) => o.r <= 0 || Math.hypot(p.x - o.x, p.z - o.z) > o.r), `(${p.x}, ${p.z}) dentro de um móvel`);
  }
  configurarLugares(0);
});

test('quem está sentado num lugar que foi refeito perde o lugar (nunca dois na mesma cadeira)', () => {
  resetarEstacoes();
  configurarLugares(4);
  const ana = { id: 'ana', estacao: reservarEstacao('ana', AREA_REUNIAO), indo: false };
  assert.ok(aindaEDono(ana));
  // A lista é refeita do zero (sem manter ocupantes): o lugar da Ana agora é outro objeto, livre.
  definirEstacoes([...ESTACOES].map(({ id }) => BASES.get(id)));
  assert.ok(!ESTACOES.includes(ana.estacao));
  assert.equal(aindaEDono(ana), false, 'a Ana tem de levantar');
  // Com ela de pé, um lugar livre por pessoa: ninguém divide.
  const ids = ['bia', 'caio', 'davi', 'eva'].map((id) => reservarEstacao(id, AREA_REUNIAO)?.id);
  assert.equal(new Set(ids).size, 4);
  configurarLugares(0);
});
