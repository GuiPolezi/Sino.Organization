// Casos do gráfico de linha da "Carga por Local": nomes deitados ou inclinados,
// números alternados e nada saindo da largura, do celular ao desktop.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { RAIO, encurtar, montarLinha, tamanhoDaFonte, textoDoValor } from './geometriaLinha.js';

// Largura aproximada de um texto de 12px em negrito: 7,2px por letra.
const medir = (texto) => texto.length * 7.2;
const local = (rotulo, total) => ({ local: `${rotulo} (inteiro)`, rotulo, total });
const DEZ_NOMES = [
  'Tab. Notas e Prot. Amparo',
  'Franca CM',
  'Softlândia CM',
  'Leme CM',
  'Itapevi CM',
  '2º Tab. Notas Piracicaba',
  'Novo Horizonte CM',
  'IPREF - Inst. Previd.',
  'Araras CM',
  'Aracangua CM',
];
const dez = (totais) => DEZ_NOMES.map((nome, i) => local(nome, totais[i]));
// Celular estreito, desktop (painel de 28rem) e celular deitado.
const LARGURAS = [288, 404, 728];

test('sem locais ou sem largura, não há gráfico', () => {
  assert.equal(montarLinha([], 400, medir, 12), null);
  assert.equal(montarLinha([local('A', 1)], 0, medir, 12), null);
});

test('a fonte acompanha a largura, de 11 a 13 px', () => {
  assert.equal(tamanhoDaFonte(200), 11);
  assert.equal(tamanhoDaFonte(404), 13);
  assert.equal(tamanhoDaFonte(900), 13);
});

test('encurtar corta com reticências até caber', () => {
  assert.equal(encurtar('Leme CM', 100, medir), 'Leme CM');
  const curto = encurtar('Tabelião de Notas de Piracicaba', 80, medir);
  assert.ok(curto.endsWith('…'));
  assert.ok(medir(curto) <= 80);
  assert.equal(encurtar('Piracicaba', 1, medir), '…');
});

test('poucos locais com nomes curtos ficam deitados, sem cortar', () => {
  const geo = montarLinha([local('Leme CM', 4), local('Franca CM', 2)], 404, medir, 12);
  assert.equal(geo.deitados, true);
  assert.deepEqual(
    geo.pontos.map(({ texto }) => texto),
    ['Leme CM', 'Franca CM'],
  );
});

test('dez locais inclinam os nomes e nenhum sai pela esquerda', () => {
  for (const largura of LARGURAS) {
    const fonte = tamanhoDaFonte(largura);
    const geo = montarLinha(dez([42, 29, 21, 13, 8, 7, 5, 4, 3, 1]), largura, medir, fonte);
    assert.equal(geo.deitados, false, `deitados em ${largura}`);
    for (const { x, texto } of geo.pontos) {
      const esquerdaDoNome = x - (medir(texto) + fonte / 2) * Math.SQRT1_2;
      assert.ok(esquerdaDoNome >= 0, `"${texto}" sai pela esquerda em ${largura}px (${esquerdaDoNome})`);
    }
  }
});

test('os pontos ficam dentro da largura, em colunas iguais e na ordem', () => {
  for (const largura of LARGURAS) {
    const geo = montarLinha(dez([42, 29, 21, 13, 8, 7, 5, 4, 3, 1]), largura, medir, tamanhoDaFonte(largura));
    const xs = geo.pontos.map(({ x }) => x);
    assert.ok(xs[0] > 0 && xs.at(-1) < largura, `largura ${largura}`);
    for (let i = 1; i < xs.length; i += 1) assert.ok(Math.abs(xs[i] - xs[i - 1] - geo.coluna) < 1e-6);
  }
});

test('o maior fica no alto, a altura é proporcional e nada desce abaixo do eixo', () => {
  const geo = montarLinha([local('A', 40), local('B', 20), local('C', 0)], 404, medir, 12);
  const [a, b, c] = geo.pontos;
  assert.ok(a.y < b.y && b.y < c.y);
  // B tem metade de A: fica no meio do caminho entre A e o zero (C).
  assert.ok(Math.abs(b.y - (a.y + c.y) / 2) < 1e-6);
  assert.ok(c.y + RAIO <= geo.eixo);
  // O número do mais alto ainda cabe acima dele.
  assert.ok(a.yValor - 12 >= 0);
});

test('números grandes em colunas estreitas se alternam acima e abaixo', () => {
  const geo = montarLinha(dez([1234, 1200, 1100, 900, 800, 700, 650, 600, 550, 500]), 288, medir, 11);
  assert.equal(geo.alternar, true);
  assert.deepEqual(
    geo.pontos.map(({ valorAbaixo }) => valorAbaixo),
    [false, true, false, true, false, true, false, true, false, true],
  );
  // Os de baixo não encostam no eixo.
  for (const { yValor, valorAbaixo } of geo.pontos) if (valorAbaixo) assert.ok(yValor <= geo.eixo);
});

test('com espaço, todos os números ficam acima dos pontos', () => {
  const geo = montarLinha([local('A', 12), local('B', 5), local('C', 3)], 404, medir, 13);
  assert.equal(geo.alternar, false);
  assert.ok(geo.pontos.every(({ valorAbaixo, yValor, y }) => !valorAbaixo && yValor < y));
});

test('o número nunca sai pela borda do gráfico', () => {
  const geo = montarLinha([local('A', 123456)], 60, medir, 11);
  const [ponto] = geo.pontos;
  const meia = medir(textoDoValor(123456)) / 2;
  assert.ok(ponto.xValor - meia >= 0 && ponto.xValor + meia <= 60);
});

test('a linha passa por todos os pontos e a área fecha no zero', () => {
  const geo = montarLinha([local('A', 3), local('B', 1)], 300, medir, 12);
  assert.equal(geo.linha.split(' L').length, 2);
  assert.ok(geo.linha.startsWith('M'));
  assert.ok(geo.area.endsWith('Z'));
});
