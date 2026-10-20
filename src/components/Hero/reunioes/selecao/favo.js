// Geometria da grade de personagens ("favo": colunas alternadas deslocadas
// meia linha, como na seleção de personagens dos jogos LEGO). Funções puras.

const RAIZ3_2 = Math.sqrt(3) / 2;

/**
 * Posições (centros) de `n` badges redondas que cabem em largura × altura.
 * Testa de 3 a 5 colunas e fica com a que dá a maior badge.
 *
 * @param {number} n
 * @param {number} largura
 * @param {number} altura
 * @param {{ folga?: number, maximo?: number, colunasMin?: number, colunasMax?: number }} [opcoes]
 *   folga: distância entre centros vizinhos ÷ diâmetro (1 = encostadas)
 * @returns {{ diametro: number, colunas: number, posicoes: { x: number, y: number }[] }}
 */
export function calcularFavo(n, largura, altura, opcoes = {}) {
  const { folga = 1.12, maximo = 120, colunasMin = 3, colunasMax = 5 } = opcoes;
  if (n <= 0 || largura <= 0 || altura <= 0) return { diametro: 0, colunas: 0, posicoes: [] };

  let melhor = null;
  for (let colunas = Math.min(colunasMin, n); colunas <= Math.min(colunasMax, n); colunas++) {
    const linhas = Math.ceil(n / colunas);
    const dx = RAIZ3_2 * folga; // em diâmetros
    const dy = folga;
    const larguraEmD = 1 + (colunas - 1) * dx;
    const alturaEmD = 1 + (linhas - 1) * dy + (colunas > 1 ? dy / 2 : 0);
    const diametro = Math.min(largura / larguraEmD, altura / alturaEmD, maximo);
    if (!melhor || diametro > melhor.diametro + 0.5) melhor = { diametro, colunas, linhas, dx, dy };
  }

  const { diametro: d, colunas, dx, dy } = melhor;
  const linhasUsadas = Math.ceil(n / colunas);
  const larguraTotal = d * (1 + (colunas - 1) * dx);
  const alturaTotal = d * (1 + (linhasUsadas - 1) * dy + (colunas > 1 ? dy / 2 : 0));
  // Centraliza o favo no espaço.
  const x0 = (largura - larguraTotal) / 2 + d / 2;
  const y0 = (altura - alturaTotal) / 2 + d / 2;

  const posicoes = Array.from({ length: n }, (_, i) => {
    const coluna = i % colunas;
    const linha = Math.floor(i / colunas);
    return {
      x: x0 + coluna * dx * d,
      y: y0 + linha * dy * d + (coluna % 2 === 1 ? (dy * d) / 2 : 0),
    };
  });

  return { diametro: d, colunas, posicoes };
}

/**
 * Quanto cada badge sai do lugar quando a `escolhida` cresce `escala` vezes.
 * Uma pequena simulação de encaixe: a escolhida fica no lugar (grande), as
 * outras encolhem um pouco e se repelem até ninguém se sobrepor, enquanto uma
 * mola puxa cada uma de volta para casa. O resultado parece badges tentando
 * caber no espaço que sobrou.
 *
 * @param {{ x: number, y: number }[]} posicoes centros
 * @param {number} escolhida índice (ou -1)
 * @param {number} diametro
 * @param {{ escala?: number, encolhe?: number, largura?: number, altura?: number, folga?: number }} [opcoes]
 * @returns {{ x: number, y: number, escala: number }[]} deslocamento e escala de cada uma
 */
export function empurrar(posicoes, escolhida, diametro, opcoes = {}) {
  const {
    escala = 1.42,
    encolhe = 0.9,
    largura = Infinity,
    altura = Infinity,
    folga = 3, // px entre bordas
  } = opcoes;
  const n = posicoes.length;
  if (escolhida < 0 || escolhida >= n) return posicoes.map(() => ({ x: 0, y: 0, escala: 1 }));

  const raio = diametro / 2;
  const centro = posicoes[escolhida];
  // Encolhe mais quem está perto da escolhida.
  const escalas = posicoes.map((p, i) => {
    if (i === escolhida) return escala;
    const d = Math.hypot(p.x - centro.x, p.y - centro.y) / diametro;
    return 1 - (1 - encolhe) * Math.max(0, 1 - (d - 1) / 2.5);
  });
  const raios = escalas.map((e) => raio * e);
  const atual = posicoes.map((p, i) => ({
    x: limitar(p.x, raios[i], largura),
    y: limitar(p.y, raios[i], altura),
  }));

  const MOLA = 0.04;
  for (let passo = 0; passo < 140; passo++) {
    // Separa pares sobrepostos (a escolhida não se mexe).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = atual[i];
        const b = atual[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const minimo = raios[i] + raios[j] + folga;
        if (d >= minimo) continue;
        if (d < 0.001) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const sobra = minimo - d;
        const fi = i === escolhida ? 0 : j === escolhida ? 1 : 0.5;
        const fj = 1 - fi;
        a.x -= (dx / d) * sobra * fi;
        a.y -= (dy / d) * sobra * fi;
        b.x += (dx / d) * sobra * fj;
        b.y += (dy / d) * sobra * fj;
      }
    }
    // Mola para casa e paredes.
    for (let i = 0; i < n; i++) {
      if (i !== escolhida) {
        atual[i].x += (posicoes[i].x - atual[i].x) * MOLA;
        atual[i].y += (posicoes[i].y - atual[i].y) * MOLA;
      }
      atual[i].x = limitar(atual[i].x, raios[i], largura);
      atual[i].y = limitar(atual[i].y, raios[i], altura);
    }
  }

  return atual.map((p, i) => ({ x: p.x - posicoes[i].x, y: p.y - posicoes[i].y, escala: escalas[i] }));
}

// Centro dentro de [r, limite - r].
function limitar(valor, r, limite) {
  if (!Number.isFinite(limite)) return valor;
  return Math.min(Math.max(valor, r), limite - r);
}
