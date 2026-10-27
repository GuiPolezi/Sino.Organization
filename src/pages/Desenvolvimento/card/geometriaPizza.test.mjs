// Casos da pizza do painel: porcentagens, fatias, rótulos e o salto do hover.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALTURA_LINHA,
  RAIO_MIN,
  espalhar,
  fatiar,
  montarPizza,
  percentuais,
  textoPercentual,
} from './geometriaPizza.js';

// Largura aproximada de um texto de 12px em negrito: 7,2px por letra.
const medir = (texto) => texto.length * 7.2;
const item = (chave, valor) => ({ chave, rotulo: chave, valor, cor: '#000000' });
const DEZ = ['Adriano', 'Antonio', 'Arnaldo', 'Caique', 'Donizeti', 'Eduardo', 'Guilherme', 'Gustavo', 'Ketlyn', 'Rafael'];

test('as porcentagens inteiras somam 100, pelo maior resto', () => {
  assert.deepEqual(percentuais([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(percentuais([50, 30, 20]), [50, 30, 20]);
  assert.deepEqual(percentuais([0, 5]), [0, 100]);
  assert.deepEqual(percentuais([]), []);
  assert.deepEqual(percentuais([0, 0]), [0, 0]);
  const muitos = percentuais([1, 2, 3, 400, 7, 9, 11, 13, 17, 19]);
  assert.equal(
    muitos.reduce((soma, valor) => soma + valor, 0),
    100,
  );
});

test('fatia com chamado nunca aparece como 0%', () => {
  assert.equal(textoPercentual(1, 0), '<1%');
  assert.equal(textoPercentual(0, 0), '0%');
  assert.equal(textoPercentual(3, 12), '12%');
});

test('as fatias começam no topo, seguem no sentido horário e fecham o círculo', () => {
  const fatias = fatiar([item('a', 1), item('b', 0), item('c', 3)]);
  assert.deepEqual(
    fatias.map(({ chave }) => chave),
    ['a', 'c'],
  );
  assert.equal(fatias[0].inicio, 0);
  assert.ok(Math.abs(fatias[0].fim - Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(fatias.at(-1).fim - Math.PI * 2) < 1e-9);
  assert.deepEqual(
    fatias.map(({ percentual }) => percentual),
    [25, 75],
  );
});

test('espalhar mantém a distância mínima e os limites, perto do lugar ideal', () => {
  assert.deepEqual(espalhar([10, 12, 13], 10, 0, 100), [10, 20, 30]);
  assert.deepEqual(espalhar([95, 96, 97], 10, 0, 100), [80, 90, 100]);
  assert.deepEqual(espalhar([20, 60], 10, 0, 100), [20, 60]);
  assert.deepEqual(espalhar([-5], 10, 0, 100), [0]);
});

// Distância de um ponto ao segmento AB.
function distancia([px, py], [ax, ay], [bx, by]) {
  const [dx, dy] = [bx - ax, by - ay];
  const t = dx || dy ? Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0), 1) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

const pontosDaGuia = (guia) => [...guia.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) => [Number(x), Number(y)]);

// Os rótulos de um lado não se sobrepõem, cabem na área e ficam fora do círculo; as guias não o atravessam.
function conferir(desenho, largura) {
  const { cx, cy, raio, altura, fatias } = desenho;
  for (const lado of ['esquerda', 'direita']) {
    const doLado = fatias.filter(({ etiqueta }) => etiqueta.lado === lado).toSorted((a, b) => a.etiqueta.y - b.etiqueta.y);
    for (let i = 1; i < doLado.length; i += 1) {
      const vao = doLado[i].etiqueta.y - doLado[i - 1].etiqueta.y;
      assert.ok(vao >= desenho.alturaRotulo - 1e-6, `rótulos colados à ${lado}: ${vao}`);
    }
  }
  for (const { etiqueta } of fatias) {
    const larguraTexto = Math.max(...etiqueta.linhas.map(medir));
    const [esquerda, direita] =
      etiqueta.lado === 'direita' ? [etiqueta.x, etiqueta.x + larguraTexto] : [etiqueta.x - larguraTexto, etiqueta.x];
    assert.ok(esquerda >= 0 && direita <= largura, `rótulo "${etiqueta.linhas.join(' ')}" fora da largura`);
    assert.ok(etiqueta.y - desenho.alturaRotulo / 2 >= 0 && etiqueta.y + desenho.alturaRotulo / 2 <= altura);
    assert.ok(etiqueta.lado === 'direita' ? esquerda > cx + raio : direita < cx - raio, 'rótulo em cima do círculo');
  }
  assert.ok(cy - raio >= 0 && cy + raio <= altura);
  assert.ok(raio >= RAIO_MIN, `raio pequeno demais: ${raio}`);
  for (const { guia, rotulo } of fatias) {
    const pontos = pontosDaGuia(guia);
    for (let i = 1; i < pontos.length; i += 1) {
      const folga = distancia([cx, cy], pontos[i - 1], pontos[i]) - raio;
      assert.ok(folga >= 1, `a guia de ${rotulo} atravessa o círculo (${folga.toFixed(1)})`);
    }
  }
}

test('dez fatias na largura do painel: rótulos de uma linha, sem colar', () => {
  const itens = DEZ.map((nome, i) => item(nome, 10 + ((i * 7) % 13)));
  const desenho = montarPizza({ itens, largura: 404, medir });
  assert.equal(desenho.fatias.length, 10);
  assert.ok(desenho.fatias.every(({ etiqueta }) => etiqueta.linhas.length === 1));
  assert.match(desenho.fatias[0].etiqueta.linhas[0], /^Adriano \(\d+%\)$/);
  // O texto do item continua sendo o nome, para a dica.
  assert.equal(desenho.fatias[0].rotulo, 'Adriano');
  conferir(desenho, 404);
});

test('fatias finas seguidas não amontoam os rótulos', () => {
  const itens = [item('Grande', 300), ...DEZ.slice(0, 9).map((nome) => item(nome, 1))];
  for (const largura of [404, 358]) conferir(montarPizza({ itens, largura, medir }), largura);
});

test('com nome comprido e pouco espaço, o rótulo quebra nas palavras, sem partir nome curto', () => {
  const itens = ['Legislação Digital', 'Siscam 9', 'Sistema (Outros)', 'App Mobile'].map((nome) => item(nome, 5));
  const desenho = montarPizza({ itens, largura: 358, medir });
  assert.deepEqual(desenho.fatias[0].etiqueta.linhas, ['Legislação', 'Digital', '(25%)']);
  // "Siscam 9" fica inteiro; só a porcentagem desce.
  assert.deepEqual(desenho.fatias[1].etiqueta.linhas, ['Siscam 9', '(25%)']);
  // Quebrar vale a pena: o círculo fica bem maior que o mínimo.
  assert.ok(desenho.raio >= 66, `raio ${desenho.raio}`);
  assert.ok(desenho.alturaRotulo >= ALTURA_LINHA * 2);
  conferir(desenho, 358);
  conferir(montarPizza({ itens, largura: 300, medir }), 300);
});

test('mesmo estreita demais, a pizza continua com um círculo de verdade', () => {
  const desenho = montarPizza({ itens: [item('Legislação Digital', 1), item('Site', 1)], largura: 120, medir });
  assert.ok(desenho.raio > 0);
  assert.doesNotMatch(desenho.fatias.map(({ caminho, guia }) => caminho + guia).join(), /NaN|-\d+(\.\d+)? -?\d+(\.\d+)? 0 [01] 1/);
});

test('uma fatia só ocupa o círculo inteiro', () => {
  const desenho = montarPizza({ itens: [item('Site', 9)], largura: 404, medir });
  assert.equal(desenho.fatias.length, 1);
  assert.equal(desenho.fatias[0].etiqueta.linhas[0], 'Site (100%)');
  conferir(desenho, 404);
});

test('cada fatia salta para fora pelo meio dela; a sozinha fica parada', () => {
  const { fatias } = montarPizza({ itens: [item('a', 1), item('b', 1)], largura: 404, medir });
  // A primeira fatia ocupa a metade direita: salta para a direita, sem subir nem descer.
  assert.ok(fatias[0].salto[0] > 0);
  assert.ok(Math.abs(fatias[0].salto[1]) < 1e-9);
  assert.ok(fatias[1].salto[0] < 0);
  const [sozinha] = montarPizza({ itens: [item('a', 3)], largura: 404, medir }).fatias;
  assert.deepEqual(sozinha.salto, [0, 0]);
});
