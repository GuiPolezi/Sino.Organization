import { test } from 'node:test';
import assert from 'node:assert/strict';
import { configurarCena, posicoes } from '../../Suporte/store.js';
import { SENTADO, atualizarEstado, aplicarLimites, configurarRitmo, criarEstado } from '../../Suporte/boneco/useComportamento.js';
import { removerQuadro } from '../../Suporte/quadro/posicao.js';
import { CENA_REUNIAO, RITMO_REUNIAO } from './config.js';
import { configurarLugares } from './lugares.js';
import { ESTACOES } from '../../Suporte/boneco/estacoes.js';

// A sala de reunião como a página prepara (Reuniao/index.jsx), simulada sem tela.
configurarCena(CENA_REUNIAO);
configurarRitmo(RITMO_REUNIAO);
removerQuadro();

const CAMERA = { position: { x: 0, y: 6, z: 14 } };

function simular(membros, minutos) {
  configurarLugares(membros);
  const bonecos = Array.from({ length: membros }, (_, i) => criarEstado(`m${i}`));
  bonecos.forEach((s) => posicoes.set(s.id, s.pos));
  const visto = { micros: new Set(), acoes: new Set(), sentado: 0, total: 0, levantou: 0 };
  for (let quadro = 0; quadro < minutos * 60 * 60; quadro++) {
    for (const s of bonecos) {
      const antes = s.estado;
      atualizarEstado(s, false, CAMERA, 1 / 60);
      if (!SENTADO.has(s.estado)) aplicarLimites(s, null, 1 / 60);
      if (s.estado === 'trabalhando') visto.micros.add(s.micro);
      if (s.estado === 'acao') visto.acoes.add(s.acao);
      if (antes === 'trabalhando' && s.estado === 'levantando') visto.levantou++;
      if (SENTADO.has(s.estado)) visto.sentado++;
      visto.total++;
    }
  }
  bonecos.forEach((s) => posicoes.delete(s.id));
  configurarLugares(0);
  return visto;
}

test('na reunião ficam sentados a maior parte do tempo, levantando de vez em quando', () => {
  const { sentado, total, levantou } = simular(4, 20);
  assert.ok(sentado / total > 0.75, `sentados só ${((100 * sentado) / total).toFixed(0)}% do tempo`);
  assert.ok(levantou >= 4, `em 20 min, 4 membros levantaram só ${levantou} vezes`);
});

test('na reunião ninguém digita: não há computador', () => {
  const { micros, acoes } = simular(6, 15);
  assert.ok(!micros.has('digitar'), 'digitou sentado');
  assert.ok(!acoes.has('trabalhar'), 'digitou em pé');
  assert.ok(micros.has('ouvir'), 'sentado, deveria ficar ouvindo');
});

// Um boneco sozinho, com o lugar já reservado, andando de (x, z) até ele: chega e senta?
function chegaAoLugar(membros, lugar, x, z, segundos = 25) {
  configurarLugares(membros);
  const s = criarEstado('antonio');
  posicoes.set(s.id, s.pos);
  s.pos.set(x, 0, z);
  const estacao = ESTACOES.find(({ id }) => id === lugar);
  estacao.ocupante = s.id;
  Object.assign(s, { estacao, indo: true, estado: 'andando', timer: 30 });
  s.alvo.set(estacao.aprox.x, 0, estacao.aprox.z);
  let sentou = false;
  for (let quadro = 0; quadro < segundos * 60 && !sentou; quadro++) {
    atualizarEstado(s, false, CAMERA, 1 / 60);
    if (!SENTADO.has(s.estado)) aplicarLimites(s, null, 1 / 60);
    sentou = s.estado === 'sentando';
    if (!s.indo && !sentou) break;
  }
  posicoes.delete(s.id);
  estacao.ocupante = null;
  configurarLugares(0);
  return sentou;
}

test('chega às cadeiras do fundo vindo de qualquer lado (inclusive pelo quadro, à direita)', () => {
  const partidas = [
    [3.5, 1.5],
    [3.6, -2.2],
    [2.0, -2.8],
    [4.5, -1.0],
    [-3.5, -2.6],
    [-3.5, 1.5],
    [0, 3],
  ];
  for (const membros of [4, 8, 12]) {
    for (const lugar of ['r1', 'r2', 'r3', 'r4']) {
      for (const [x, z] of partidas) {
        assert.ok(chegaAoLugar(membros, lugar, x, z), `${membros} membros: não sentou em ${lugar} saindo de (${x}, ${z})`);
      }
    }
  }
});
