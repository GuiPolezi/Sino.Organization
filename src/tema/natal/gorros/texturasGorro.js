/*
 * Texturas em canvas dos gorros (docs/tema-natal.md, 2.2): listras da bengala,
 * listras do caído, ponto de tricô com faixa de flocos e o punho canelado.
 * Cada uma é desenhada no 1º uso (materiaisGorro.js guarda o material).
 * Na UV do cone e da cúpula, `u` dá a volta e `v` sobe (topo do canvas = ponta).
 */
import { novaTextura } from '../../../pages/Suporte/quadro/texturas.js';
import { PALETA_NATAL as P } from '../paleta.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const fracao = (x) => x - Math.floor(x);

// Pinta pixel a pixel: `cor(u, v)` devolve [r, g, b] (v = 0 embaixo, 1 em cima).
function porPixel(largura, altura, cor) {
  return novaTextura(largura, altura, (ctx, w, h) => {
    const imagem = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [r, g, b] = cor((x + 0.5) / w, 1 - (y + 0.5) / h);
        imagem.data.set([r, g, b, 255], (y * w + x) * 4);
      }
    }
    ctx.putImageData(imagem, 0, 0);
  });
}

const misturar = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
// Borda suave de uma faixa: 1 dentro, 0 fora, com meia largura de transição.
const faixa = (d, meia, borda) => Math.min(1, Math.max(0, (meia - Math.abs(d)) / borda + 0.5));

/** Bengala doce: 6 listras vermelhas em espiral sobre o creme. */
export function texturaBengala() {
  const [creme, vermelho] = [rgb(P.creme), rgb(P.vermelho)];
  return porPixel(64, 256, (u, v) => {
    const fase = fracao(u * 6 + v * 2.2);
    return misturar(creme, vermelho, faixa(fase - 0.5, 0.21, 0.04));
  });
}

/** Caído: vermelho com quatro listras finas de vermelho-sombra, como uma meia de tricô. */
export function texturaListrasCaido() {
  const [vermelho, sombra] = [rgb(P.vermelho), rgb(P.vermelhoSombra)];
  return porPixel(8, 256, (_, v) => {
    const perto = [0.22, 0.42, 0.62, 0.82].reduce((m, c) => Math.min(m, Math.abs(v - c)), 1);
    return misturar(vermelho, sombra, faixa(perto, 0.03, 0.01));
  });
}

// Floco de 6 pontas (canvas 2D), com raminhos em cada braço.
function floco(ctx, x, y, raio) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -raio);
    ctx.moveTo(0, -raio * 0.55);
    ctx.lineTo(-raio * 0.28, -raio * 0.78);
    ctx.moveTo(0, -raio * 0.55);
    ctx.lineTo(raio * 0.28, -raio * 0.78);
    ctx.stroke();
  }
  ctx.restore();
}

// Ponto em V do tricô: duas "gotas" inclinadas por ponto.
function pontosEmV(ctx, x0, y0, largura, altura, colunas, linhas, cor) {
  const [pw, ph] = [largura / colunas, altura / linhas];
  ctx.fillStyle = cor;
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      const [cx, cy] = [x0 + (c + 0.5) * pw, y0 + (l + 0.5) * ph];
      [-1, 1].forEach((lado) => {
        ctx.beginPath();
        ctx.ellipse(cx + lado * pw * 0.2, cy, pw * 0.2, ph * 0.42, lado * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

/** Tricô: pinheiro em ponto V e, embaixo, a faixa menta com flocos creme. */
export function texturaTrico() {
  return novaTextura(512, 256, (ctx, w, h) => {
    ctx.fillStyle = P.pinheiro;
    ctx.fillRect(0, 0, w, h);
    pontosEmV(ctx, 0, 0, w, h, 48, 22, 'rgba(255,255,255,0.09)');
    // Faixa entre v 0,12 e 0,4 (o canvas cresce para baixo).
    const [topo, base] = [h * 0.6, h * 0.88];
    ctx.fillStyle = P.menta;
    ctx.fillRect(0, topo, w, base - topo);
    pontosEmV(ctx, 0, topo, w, base - topo, 48, 6, 'rgba(255,255,255,0.12)');
    ctx.fillStyle = P.creme;
    for (let i = 0; i < 48; i++) {
      [topo + 6, base - 6].forEach((y) => ctx.fillRect(i * (w / 48) + 3, y - 2, 4, 4));
    }
    ctx.strokeStyle = P.creme;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) floco(ctx, (i + 0.5) * (w / 8), (topo + base) / 2, (base - topo) * 0.3);
  });
}

/** Punho canelado: listras verticais em dois tons de pinheiro. */
export function texturaPunho() {
  const [claro, escuro] = [rgb(P.pinheiro), misturar(rgb(P.pinheiro), [0, 0, 0], 0.22)];
  return porPixel(128, 8, (u) => misturar(claro, escuro, faixa(fracao(u * 40) - 0.5, 0.18, 0.12)));
}
