// Casos do café e dos pufes de /compilacao (cafe.js): o que cada um decide e quando a xícara aparece.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import { DURACAO_GOLE, aoLevantar, aoSentar, atualizar, criar, decidir, pose } from './cafe.js';

// Math.random fixo enquanto `fn` roda.
function comSorteio(valor, fn) {
  const original = Math.random;
  Math.random = () => valor;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

const novoBoneco = (extra = {}) => {
  const s = { id: 'x', estado: 'parado', timer: 0, acao: null, estacao: null, micro: 'digitar', passo: 0 };
  criar(s);
  return Object.assign(s, extra);
};

// Ações que só anotam o que foi pedido; irPara reserva o que o filtro aceitar entre `livres`.
function acoesFalsas(livres = []) {
  const pedidos = [];
  return {
    pedidos,
    irPara: (s, aceita) => {
      const lugar = livres.find(aceita);
      pedidos.push(['irPara', lugar?.tipo ?? null]);
      return Boolean(lugar);
    },
    fazerAcao: (s, acao) => pedidos.push(['acao', acao]),
    passear: () => pedidos.push(['passear']),
  };
}

const CAFE = { tipo: 'cafe' };
const PUFE = { tipo: 'pufe' };
const MESA = { tipo: 'mesa' };

test('sem xícara e com vontade de café, vai à mesa do café', () => {
  const s = novoBoneco({ descansoCafe: 0 });
  const acoes = acoesFalsas([CAFE, PUFE, MESA]);
  assert.equal(comSorteio(0.1, () => decidir(s, acoes)), true);
  assert.deepEqual(acoes.pedidos, [['irPara', 'cafe']]);
});

test('sem xícara e sem vontade de café nem de pufe, a escolha fica com o padrão (as mesas)', () => {
  const s = novoBoneco({ descansoCafe: 30, descansoPufe: 30 });
  const acoes = acoesFalsas([CAFE, PUFE, MESA]);
  assert.equal(comSorteio(0.1, () => decidir(s, acoes)), false);
  assert.deepEqual(acoes.pedidos, []);
});

test('com a xícara cheia nunca vai trabalhar: pufe, gole parado ou passeio', () => {
  const s = novoBoneco({ xicara: true, goles: 3 });
  const pufe = acoesFalsas([PUFE, MESA]);
  assert.equal(comSorteio(0.1, () => decidir(s, pufe)), true);
  assert.deepEqual(pufe.pedidos, [['irPara', 'pufe']]);

  // Sem pufe livre, toma o café ali mesmo.
  const semPufe = acoesFalsas([MESA]);
  comSorteio(0.1, () => decidir(s, semPufe));
  assert.deepEqual(semPufe.pedidos, [['irPara', null], ['acao', 'beber']]);

  const passeio = acoesFalsas([PUFE, MESA]);
  comSorteio(0.95, () => decidir(s, passeio));
  assert.deepEqual(passeio.pedidos, [['passear']]);
});

test('com a xícara vazia, volta para devolver; com o café cheio de gente, dá uma volta', () => {
  const s = novoBoneco({ xicara: true, goles: 0 });
  const livre = acoesFalsas([CAFE]);
  decidir(s, livre);
  assert.deepEqual(livre.pedidos, [['irPara', 'cafe']]);
  const ocupado = acoesFalsas([]);
  decidir(s, ocupado);
  assert.deepEqual(ocupado.pedidos, [['irPara', null], ['passear']]);
});

test('na cafeteira: a xícara aparece na metade do tempo e ele sai com ela cheia', () => {
  const s = novoBoneco({ estado: 'trabalhando', estacao: CAFE });
  aoSentar(s);
  assert.equal(s.missaoCafe, 'buscar');
  const duracao = s.timer;

  s.timer = duracao * 0.6;
  atualizar(s, 0);
  assert.equal(s.xicara, false, 'ainda mexendo na cafeteira');
  s.timer = duracao * 0.4;
  atualizar(s, 0);
  assert.equal(s.xicara, true);
  assert.ok(s.goles >= 4);

  aoLevantar(s, CAFE);
  assert.equal(s.missaoCafe, null);
  assert.ok(s.descansoCafe >= 40, 'demora para querer outro');
});

test('devolvendo: a xícara fica na mesa antes de ele sair', () => {
  const s = novoBoneco({ estado: 'trabalhando', estacao: CAFE, xicara: true, goles: 0 });
  aoSentar(s);
  assert.equal(s.missaoCafe, 'devolver');
  s.timer = s.duracaoLugar * 0.5;
  atualizar(s, 0);
  assert.equal(s.xicara, false);
  aoLevantar(s, CAFE);
  assert.equal(s.xicara, false);
});

test('os goles: parado ele bebe e a xícara esvazia; andando, não', () => {
  const s = novoBoneco({ xicara: true, goles: 2, tGole: 0.1 });
  atualizar(s, 0.2);
  assert.equal(s.bebendo, DURACAO_GOLE, 'começa um gole');
  atualizar(s, DURACAO_GOLE);
  assert.equal(s.goles, 1);
  assert.equal(s.bebendo, 0);

  s.estado = 'andando';
  s.tGole = 0;
  atualizar(s, 1);
  assert.equal(s.bebendo, 0);
  assert.equal(s.goles, 1, 'andando não bebe');
});

test("no pufe com café fica mais tempo que sem (no mesmo sorteio)", () => {
  const comCafe = comSorteio(0, () => {
    const s = novoBoneco({ estado: 'trabalhando', estacao: PUFE, xicara: true, goles: 3 });
    aoSentar(s);
    return s.timer;
  });
  const semCafe = comSorteio(0, () => {
    const s = novoBoneco({ estado: 'trabalhando', estacao: PUFE });
    aoSentar(s);
    return s.timer;
  });
  assert.ok(comCafe > semCafe);
});

test('com a xícara, o braço direito a segura e sobe no gole; o aceno passa para o esquerdo', () => {
  const info = { t: 0, selecionado: false, olharCamera: 0 };
  const s = novoBoneco({ xicara: true, goles: 2 });
  const parado = { bracoEz: -0.1, bracoDz: 0.1, bracoEx: 0, bracoDx: 0, cabecaX: 0, cabecaY: 0 };
  pose(parado, s, info);
  assert.equal(parado.bracoDx, -1.1);

  s.bebendo = 1;
  const gole = { ...parado };
  pose(gole, s, info);
  assert.ok(gole.bracoDx < -2, 'a xícara sobe até a boca');

  s.bebendo = 0;
  const acenando = { bracoEz: -0.1, bracoDz: 2.6, bracoEx: 0, bracoDx: 0, cabecaX: 0, cabecaY: 0 };
  pose(acenando, s, info);
  assert.ok(acenando.bracoEz < -2, 'acena com a esquerda');
  assert.equal(acenando.bracoDx, -1.1, 'e não derruba o café');
});
