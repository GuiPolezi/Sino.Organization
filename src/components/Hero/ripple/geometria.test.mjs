import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA_MAXIMA,
  caixaDoDesenho,
  centroDaGota,
  chaveDoItem,
  dentroDoPainel,
  emPixels,
  escalaDoDispositivo,
  escalaQueCabe,
  faixaVisivel,
  fonteDoCanvas,
  inicioDoTexto,
  intersecao,
  linhaDeBase,
  passosFixos,
  pixels,
  proporcao,
  raioDaGota,
  recorteDe,
  resolucaoDaAgua,
  texelDaAgua,
  textoVisivel,
  uniao,
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

test('escalaQueCabe: respeita o teto de área do canvas (página inteira)', () => {
  // Home de 1440 × 3000 a 1,5×: 2160 × 4500 ≈ 9,7 Mpx, abaixo do teto.
  assert.equal(escalaQueCabe(1440, 3000, 1.5, 16384), 1.5);
  // Tela 4K com página longa: a escala desce até caber na área.
  const e = escalaQueCabe(2560, 6000, 1.5, 16384);
  assert.ok(e < 1.5);
  assert.ok(Math.round(2560 * e) * Math.round(6000 * e) <= AREA_MAXIMA * 1.001);
  // Vale também sem limite de textura conhecido.
  assert.ok(escalaQueCabe(2560, 6000, 1.5, 0) < 1.5);
});

test('texelDaAgua: 512 texels na largura do desktop, tamanho fixo no celular', () => {
  assert.equal(texelDaAgua(1440), 1440 / 512);
  assert.equal(texelDaAgua(1920), 1920 / 512);
  assert.equal(texelDaAgua(390), 3.5);
});

test('resolucaoDaAgua: texels quadrados cobrindo o painel, dentro do limite da GPU', () => {
  assert.deepEqual(resolucaoDaAgua(1440, 2880, 1440 / 512, 4096), [512, 1024]);
  // Arredonda para cima: o painel fica todo coberto.
  assert.deepEqual(resolucaoDaAgua(100, 10, 3, 4096), [34, 4]);
  // Acima do limite: reduz os dois eixos na mesma proporção.
  const [w, h] = resolucaoDaAgua(400, 20000, 2, 4096);
  assert.equal(h, 4096);
  assert.ok(Math.abs(w / h - 200 / 10000) < 0.01);
  assert.deepEqual(resolucaoDaAgua(0, 0, 3, 4096), [1, 1]);
});

test('centroDaGota: cantos e centro do painel em [-1, 1] (y sobe)', () => {
  const [w, h] = [1440, 3000];
  assert.deepEqual(centroDaGota(w / 2, h / 2, w, h), [0, 0]);
  assert.deepEqual(centroDaGota(0, 0, w, h), [-1, 1]);
  assert.deepEqual(centroDaGota(w, h, w, h), [1, -1]);
});

test('centroDaGota coincide com a coordenada que o shader de render usa', () => {
  // Render: uv = vértice * 0.5 + 0.5, com vértice = (2x/w - 1, 1 - 2y/h). Gota: centro * 0.5 + 0.5.
  const [w, h] = [900, 1600];
  for (const [x, y] of [[0, 0], [123, 456], [900, 1600], [450, 10]]) {
    const uv = [x / w, 1 - y / h];
    const gota = centroDaGota(x, y, w, h).map((c) => c * 0.5 + 0.5);
    perto(uv[0], gota[0]);
    perto(uv[1], gota[1]);
  }
});

test('raioDaGota e proporcao: raio em fração da altura, x corrigido pela proporção', () => {
  assert.equal(raioDaGota(20, 2000), 0.01);
  assert.equal(raioDaGota(20, 0), 20);
  assert.equal(proporcao(1440, 2880), 0.5);
  // No shader: distância em x (uv) vezes a proporção = distância em fração da altura.
  perto((20 / 1440) * proporcao(1440, 2880), raioDaGota(20, 2880));
});

test('faixaVisivel: parte na janela mais uma tela de margem, dentro do painel', () => {
  assert.deepEqual(faixaVisivel(0, 3000, 1000), { inicio: 0, fim: 2000 });
  // Rolado 1500 px: de 500 a 3000 (corta no fim do painel).
  assert.deepEqual(faixaVisivel(-1500, 3000, 1000), { inicio: 500, fim: 3000 });
  // Painel ainda abaixo da janela, mas dentro da margem.
  assert.deepEqual(faixaVisivel(1500, 3000, 1000), { inicio: 0, fim: 500 });
  // Fora da margem: nada a desenhar.
  assert.equal(faixaVisivel(2500, 3000, 1000), null);
  assert.equal(faixaVisivel(-5000, 3000, 1000), null);
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

test('chaveDoItem: ignora ruído abaixo de 1/4 px e muda com movimento real', () => {
  const base = { tipo: 'texto', visivel: true, x: 10, y: 20, w: 300, h: 80, alpha: 1, recorte: null, texto: 'SINO' };
  const a = chaveDoItem(base);
  assert.equal(chaveDoItem({ ...base, x: 10.05 }), a);
  assert.notEqual(chaveDoItem({ ...base, y: 21 }), a);
  assert.notEqual(chaveDoItem({ ...base, alpha: 0.5 }), a);
  assert.notEqual(chaveDoItem({ ...base, texto: 'INFORMÁTICA' }), a);
  assert.notEqual(chaveDoItem({ ...base, visivel: false }), a);
  assert.notEqual(chaveDoItem({ ...base, recorte: { x: 0, y: 0, w: 10, h: 10 } }), a);
});

test('caixaDoDesenho e uniao: folga em volta e o retângulo que cobre os dois', () => {
  const c = caixaDoDesenho({ x: 100, y: 100, w: 50, h: 20 });
  assert.ok(c.x < 100 && c.y < 100 && c.x + c.w > 150 && c.y + c.h > 120);
  assert.deepEqual(uniao({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 5, w: 10, h: 10 }), { x: 0, y: 0, w: 30, h: 15 });
  assert.deepEqual(uniao(null, { x: 1, y: 2, w: 3, h: 4 }), { x: 1, y: 2, w: 3, h: 4 });
  assert.equal(uniao(null, null), null);
});

test('emPixels: escala, alinha para fora e corta nos limites do canvas', () => {
  assert.deepEqual(emPixels({ x: 10.2, y: 5.5, w: 10, h: 10 }, 1.5, 1000, 1000), { x: 15, y: 8, w: 16, h: 16 });
  assert.deepEqual(emPixels({ x: -10, y: -10, w: 20, h: 20 }, 1, 100, 100), { x: 0, y: 0, w: 10, h: 10 });
  assert.equal(emPixels({ x: 200, y: 0, w: 10, h: 10 }, 1, 100, 100), null);
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
