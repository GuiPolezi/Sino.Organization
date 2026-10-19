// Casos do cenário: com as estações de trabalho e depois sem elas.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASES_SUPORTE,
  ESTACOES,
  OBSTACULOS,
  definirEstacoes,
  expulsarDosBlocos,
  foraDosBlocos,
  longeDosObstaculos,
  reservarEstacao,
  resetarEstacoes,
  rotaAte,
  tirarEstacoes,
} from './estacoes.js';

const AREA = { rx: 6.2, rz: 3.4 };
// De um lado ao outro do tapete, passando pelo meio do bloco de estações.
const ESQUERDA = { x: -5, z: 0 };
const DIREITA = { x: 5, z: 0 };
const CENTRO = { x: 0, z: 0 };

test('com as estações, o caminho contorna o bloco e dá para reservar um computador', () => {
  assert.equal(ESTACOES.length, 4);
  assert.ok(OBSTACULOS.length > 0);
  assert.equal(longeDosObstaculos(CENTRO), false);

  const rota = rotaAte(ESQUERDA, DIREITA);
  assert.notDeepEqual(rota.ponto, DIREITA);
  assert.ok(rota.comprimento > 10);

  assert.ok(reservarEstacao('a', AREA));
  resetarEstacoes();
});

test('a rota mantém o canto que já mirava (histerese) e espalha os cantos por boneco (offset)', () => {
  definirEstacoes(BASES_SUPORTE);
  // Do fundo para a frente, pelo meio do bloco: os dois cantos de trás empatam.
  const deTras = { x: 0, z: -3 };
  const naFrente = { x: 0, z: 3 };
  const rota = rotaAte(deTras, naFrente, AREA);
  assert.ok(Number.isInteger(rota.canto), 'devolve o identificador do canto');
  const outroDeTras = rota.canto ^ 1;
  assert.equal(rotaAte(deTras, naFrente, AREA, outroDeTras).canto, outroDeTras, 'o canto preferido fica, se custa quase o mesmo');
  assert.notEqual(rotaAte(deTras, naFrente, AREA, outroDeTras).ponto.x, rota.ponto.x);
  // Um canto da frente (escondido atrás do bloco) custa muito mais: não é mantido.
  assert.equal(rotaAte(deTras, naFrente, AREA, rota.canto ^ 2).canto, rota.canto);

  const deslocada = rotaAte(deTras, naFrente, AREA, null, 0.3);
  assert.ok(Math.abs(deslocada.ponto.x - (rota.ponto.x + 0.3)) < 1e-9, 'o canto anda 0,3 m ao longo do lado');
  assert.equal(deslocada.ponto.z, rota.ponto.z);
});

test('um canto que cai em cima de um obstáculo de outro grupo é afastado dele, ou descartado', () => {
  definirEstacoes(BASES_SUPORTE);
  const deTras = { x: 1.5, z: -3.2 };
  const naFrente = { x: 1.5, z: 3 };
  const livre = rotaAte(deTras, naFrente, AREA);
  assert.ok(livre.ponto.x > 2 && livre.ponto.z < -1.78, 'dá a volta pelo canto traseiro-direito');
  // Um pé de quadro a 0,4 m do canto: o canto é empurrado até 0,4 m da pegada e continua sendo o escolhido.
  const pe = { x: livre.ponto.x + 0.3, z: livre.ponto.z - 0.3, r: 0.6, estacao: 'quadro' };
  OBSTACULOS.push(pe);
  const afastada = rotaAte(deTras, naFrente, AREA);
  assert.equal(afastada.canto, livre.canto);
  assert.ok(Math.hypot(afastada.ponto.x - pe.x, afastada.ponto.z - pe.z) >= pe.r + 0.4 - 1e-9);
  // Um pé grande demais para afastar (o canto afastado cairia dentro do bloco): o canto é descartado.
  pe.r = 3;
  assert.notEqual(rotaAte(deTras, naFrente, AREA).canto, livre.canto);
  OBSTACULOS.pop();
});

test('o retângulo do bloco expulsa quem fica no vão entre as cadeiras, menos quem vai sentar nele', () => {
  definirEstacoes(BASES_SUPORTE);
  const bolso = { x: 0, z: -1.3 }; // entre as cadeiras de e1 e e2
  assert.equal(foraDosBlocos(bolso), false);
  assert.equal(foraDosBlocos({ x: 0, z: -2.5 }), true);

  const p = { ...bolso };
  expulsarDosBlocos(p, null);
  assert.equal(p.x, 0);
  assert.ok(Math.abs(p.z - -1.78) < 1e-9, 'sai pela borda de trás, a mais perto');
  assert.equal(foraDosBlocos(p), true);

  const aosPoucos = { ...bolso };
  expulsarDosBlocos(aosPoucos, null, 0.1);
  assert.ok(Math.abs(aosPoucos.z - -1.4) < 1e-9, 'com máximo, sai 0,1 m por vez');

  const sentando = { ...bolso };
  expulsarDosBlocos(sentando, 'e1');
  assert.deepEqual(sentando, bolso);
});

test('sem as estações: sem computadores e com caminho reto, mas o quadro continua no caminho', () => {
  // Um obstáculo de outro módulo (como o quadro da equipe) fica.
  const quadro = { x: 3, z: -2, r: 0.8, estacao: 'quadro' };
  OBSTACULOS.push(quadro);
  tirarEstacoes();

  assert.equal(ESTACOES.length, 0);
  assert.deepEqual(OBSTACULOS, [quadro]);
  assert.equal(longeDosObstaculos(CENTRO), true);
  assert.equal(longeDosObstaculos({ x: 3, z: -2 }), false);
  assert.deepEqual(rotaAte(ESQUERDA, DIREITA), { ponto: DIREITA, comprimento: 10 });
  assert.equal(reservarEstacao('a', AREA), null);
});
