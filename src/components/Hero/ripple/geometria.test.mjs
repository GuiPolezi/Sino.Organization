import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assinatura,
  centroDaGota,
  dentroDoPainel,
  escalaDoDispositivo,
  escalaQueCabe,
  fonteDoCanvas,
  inicioDoTexto,
  intersecao,
  linhaDeBase,
  passosFixos,
  pixels,
  raioDaGota,
  razaoDoPainel,
  recorteDe,
  textoVisivel,
} from './geometria.js';

const perto = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('escalaDoDispositivo: limita entre 1 e o teto', () => {
  assert.equal(escalaDoDispositivo(2), 1.5);
  assert.equal(escalaDoDispositivo(1.25), 1.25);
  assert.equal(escalaDoDispositivo(0.5), 1);
  assert.equal(escalaDoDispositivo(undefined), 1);
  assert.equal(escalaDoDispositivo(3, 2), 2);
});

test('escalaQueCabe: respeita o limite da GPU no lado maior', () => {
  // Desktop comum: o limite não interfere.
  assert.equal(escalaQueCabe(1440, 1024, 1.5, 4096), 1.5);
  // Celular com painel de 3000 px × 1,5 = 4500 > 4096: a escala desce.
  const e = escalaQueCabe(390, 3000, 1.5, 4096);
  assert.ok(e < 1.5);
  assert.ok(Math.round(3000 * e) <= 4096);
  assert.ok(Math.round(390 * e) <= 4096);
  // Painel maior que o limite mesmo em 1×: fica abaixo de 1, mas cabe.
  const pequena = escalaQueCabe(400, 9000, 1, 4096);
  assert.ok(pequena < 1);
  assert.ok(Math.round(9000 * pequena) <= 4096);
  // Lado fracionário arredonda para cima antes de dividir (nunca passa).
  assert.ok(Math.round(4096.6 * escalaQueCabe(10, 4096.6, 1.5, 4096)) <= 4096);
  // Sem limite conhecido: mantém a escala.
  assert.equal(escalaQueCabe(390, 3000, 1.5, 0), 1.5);
  assert.equal(escalaQueCabe(390, 3000, 1.5, undefined), 1.5);
});

test('razaoDoPainel: o lado maior usa o quadrado inteiro', () => {
  assert.deepEqual(razaoDoPainel(1440, 1024), [1, 1024 / 1440]);
  assert.deepEqual(razaoDoPainel(400, 800), [0.5, 1]);
  assert.deepEqual(razaoDoPainel(0, 0), [0, 0]);
});

test('centroDaGota: cantos e centro do painel no espaço da simulação', () => {
  const [w, h] = [1440, 1024];
  const [rx, ry] = razaoDoPainel(w, h);
  assert.deepEqual(centroDaGota(w / 2, h / 2, w, h), [0, 0]);
  // Canto superior esquerdo: x = -razão, y = +razão (y da simulação sobe).
  const [cx, cy] = centroDaGota(0, 0, w, h);
  perto(cx, -rx);
  perto(cy, ry);
  const [bx, by] = centroDaGota(w, h, w, h);
  perto(bx, rx);
  perto(by, -ry);
});

test('centroDaGota coincide com a coordenada que o shader de render usa', () => {
  // Render: uvOndas = vértice * razão * 0.5 + 0.5, vértice = (2x/w - 1, 1 - 2y/h).
  // Gota: centro * 0.5 + 0.5. Os dois têm de cair no mesmo texel.
  const [w, h] = [900, 1600];
  const razao = razaoDoPainel(w, h);
  for (const [x, y] of [[0, 0], [123, 456], [900, 1600], [450, 10]]) {
    const vertice = [(2 * x) / w - 1, 1 - (2 * y) / h];
    const render = vertice.map((v, i) => v * razao[i] * 0.5 + 0.5);
    const gota = centroDaGota(x, y, w, h).map((c) => c * 0.5 + 0.5);
    perto(render[0], gota[0]);
    perto(render[1], gota[1]);
  }
});

test('raioDaGota: fração do lado maior', () => {
  assert.equal(raioDaGota(20, 1440, 1024), 20 / 1440);
  assert.equal(raioDaGota(20, 0, 0), 20);
});

test('dentroDoPainel: bordas contam como dentro', () => {
  assert.ok(dentroDoPainel(0, 0, 10, 10));
  assert.ok(dentroDoPainel(10, 10, 10, 10));
  assert.ok(!dentroDoPainel(-1, 5, 10, 10));
  assert.ok(!dentroDoPainel(5, 11, 10, 10));
});

test('intersecao: sobreposição parcial, contida e disjunta', () => {
  assert.deepEqual(intersecao({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), {
    x: 5, y: 5, w: 5, h: 5,
  });
  assert.deepEqual(intersecao({ x: 0, y: 0, w: 100, h: 100 }, { x: 10, y: 20, w: 5, h: 5 }), {
    x: 10, y: 20, w: 5, h: 5,
  });
  const vazia = intersecao({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 });
  assert.equal(vazia.w, 0);
});

test('recorteDe: sem recorte, um, e a interseção de vários (sem NaN)', () => {
  assert.equal(recorteDe([]), null);
  const um = { x: 80, y: 120, w: 868, h: 133 };
  assert.deepEqual(recorteDe([um]), um);
  const r = recorteDe([um, { x: 0, y: 100, w: 500, h: 100 }]);
  assert.deepEqual(r, { x: 80, y: 120, w: 420, h: 80 });
  Object.values(r).forEach((v) => assert.ok(Number.isFinite(v)));
});

test('pixels: números, "normal" e lixo', () => {
  assert.equal(pixels('12.5px'), 12.5);
  assert.equal(pixels('-0.02em'), -0.02);
  assert.equal(pixels('normal'), 0);
  assert.equal(pixels(undefined), 0);
});

test('textoVisivel: colapsa espaços e aplica text-transform', () => {
  assert.equal(textoVisivel('  Sino \n  Informática '), 'Sino Informática');
  assert.equal(textoVisivel('Informática', 'uppercase'), 'INFORMÁTICA');
  assert.equal(textoVisivel('SINO', 'lowercase'), 'sino');
  assert.equal(textoVisivel('sino informática', 'capitalize'), 'Sino Informática');
  assert.equal(textoVisivel(null), '');
});

test('fonteDoCanvas: shorthand na ordem que o canvas aceita', () => {
  assert.equal(
    fonteDoCanvas({ fontStyle: 'normal', fontWeight: '700', fontSize: '120px', fontFamily: '"Libertinus Sans", serif' }),
    'normal 700 120px "Libertinus Sans", serif',
  );
  assert.equal(fonteDoCanvas({}), 'normal 400 16px sans-serif');
});

test('linhaDeBase: meia entrelinha dividida acima e abaixo', () => {
  // Linha de 100px, fonte com 70 de ascendente e 20 de descendente: sobram 10.
  assert.equal(linhaDeBase(0, 100, 70, 20), 75);
  // Sem entrelinha (elemento inline): base = topo + ascendente.
  assert.equal(linhaDeBase(10, 90, 70, 20), 80);
});

test('inicioDoTexto: alinhamentos e direção', () => {
  assert.equal(inicioDoTexto('left', 'ltr', 10, 100, 40), 10);
  assert.equal(inicioDoTexto('start', 'ltr', 10, 100, 40), 10);
  assert.equal(inicioDoTexto('center', 'ltr', 10, 100, 40), 40);
  assert.equal(inicioDoTexto('right', 'ltr', 10, 100, 40), 70);
  assert.equal(inicioDoTexto('end', 'ltr', 10, 100, 40), 70);
  assert.equal(inicioDoTexto('start', 'rtl', 10, 100, 40), 70);
  assert.equal(inicioDoTexto('-webkit-auto', 'ltr', 10, 100, 40), 10);
});

test('assinatura: ignora ruído abaixo de 1/4 px e muda com movimento real', () => {
  const base = { tipo: 'texto', visivel: true, x: 10, y: 20, w: 300, h: 80, alpha: 1, recorte: null, texto: 'SINO' };
  const a = assinatura([base], 1440, 1024, 1.5);
  assert.equal(assinatura([{ ...base, x: 10.05 }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([{ ...base, y: 21 }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([{ ...base, alpha: 0.5 }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([{ ...base, texto: 'INFORMÁTICA' }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([{ ...base, visivel: false }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([{ ...base, recorte: { x: 0, y: 0, w: 10, h: 10 } }], 1440, 1024, 1.5), a);
  assert.notEqual(assinatura([base], 1440, 1000, 1.5), a);
  assert.notEqual(assinatura([base], 1440, 1024, 1), a);
});

test('passosFixos: 60 Hz independente da taxa da tela', () => {
  const passo = 1000 / 60;
  assert.deepEqual(passosFixos(passo / 2, passo, 3), { passos: 0, resto: passo / 2 });
  const r = passosFixos(passo * 2.5, passo, 3);
  assert.equal(r.passos, 2);
  perto(r.resto, passo / 2, 1e-6);
  // Depois de uma pausa longa: no máximo `maximo` passos e o resto zera.
  assert.deepEqual(passosFixos(5000, passo, 3), { passos: 3, resto: 0 });
});
