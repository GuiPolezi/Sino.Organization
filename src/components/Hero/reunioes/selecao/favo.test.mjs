import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularFavo, empurrar } from './favo.js';

const dentro = ({ x, y }, r, largura, altura) =>
  x - r >= -0.01 && y - r >= -0.01 && x + r <= largura + 0.01 && y + r <= altura + 0.01;

test('calcularFavo: cabe na área e ninguém se sobrepõe', () => {
  for (const [n, w, h] of [[14, 320, 560], [14, 260, 420], [5, 300, 300], [30, 400, 500]]) {
    const { diametro, posicoes } = calcularFavo(n, w, h);
    assert.equal(posicoes.length, n);
    assert.ok(diametro > 0);
    posicoes.forEach((p) => assert.ok(dentro(p, diametro / 2, w, h), `fora: ${n} ${w}x${h}`));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = Math.hypot(posicoes[i].x - posicoes[j].x, posicoes[i].y - posicoes[j].y);
        assert.ok(d >= diametro - 0.01, `sobreposição ${i}/${j}`);
      }
    }
  }
});

test('calcularFavo: 3 colunas com a do meio deslocada (como no design)', () => {
  const { colunas, posicoes, diametro } = calcularFavo(14, 330, 600);
  assert.equal(colunas, 3);
  assert.ok(posicoes[1].y > posicoes[0].y + diametro * 0.4); // meio desce meia linha
  assert.equal(Math.round(posicoes[2].y), Math.round(posicoes[0].y));
});

test('calcularFavo: entradas vazias', () => {
  assert.deepEqual(calcularFavo(0, 300, 300).posicoes, []);
  assert.deepEqual(calcularFavo(5, 0, 300).posicoes, []);
});

test('empurrar: escolhida cresce, ninguém se sobrepõe e tudo fica na área', () => {
  for (const [w, h, escolhida] of [[330, 600, 7], [330, 600, 0], [300, 520, 13], [280, 470, 4]]) {
    const { posicoes, diametro } = calcularFavo(14, w, h, { folga: 1.25 });
    const mov = empurrar(posicoes, escolhida, diametro, { largura: w, altura: h });
    assert.ok(mov[escolhida].escala > 1.3);
    const finais = posicoes.map((p, i) => ({
      x: p.x + mov[i].x,
      y: p.y + mov[i].y,
      r: (diametro / 2) * mov[i].escala,
    }));
    finais.forEach((p, i) => assert.ok(dentro(p, p.r, w, h), `badge ${i} saiu da área`));
    for (let i = 0; i < finais.length; i++) {
      for (let j = i + 1; j < finais.length; j++) {
        const d = Math.hypot(finais[i].x - finais[j].x, finais[i].y - finais[j].y);
        assert.ok(d >= finais[i].r + finais[j].r - 1, `sobreposição ${i}/${j} (${w}x${h}, escolhida ${escolhida})`);
      }
    }
    // Vizinhas encolhem um pouco; a escolhida não sai do lugar além da parede.
    assert.ok(mov.some((m, i) => i !== escolhida && m.escala < 1));
  }
});

test('empurrar: sem escolhida, nada muda', () => {
  const { posicoes, diametro } = calcularFavo(6, 300, 300);
  assert.ok(empurrar(posicoes, -1, diametro).every((m) => m.x === 0 && m.y === 0 && m.escala === 1));
});
