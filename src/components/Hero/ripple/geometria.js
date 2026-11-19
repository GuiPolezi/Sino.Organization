/*
 * Contas puras da camada de ondas (sem DOM, sem WebGL), testadas em
 * geometria.test.mjs. Todas as medidas em px CSS relativos ao painel, com a
 * origem no canto superior esquerdo.
 */

// Teto do devicePixelRatio: acima disso o custo cresce e o ganho some.
export const ESCALA_MAXIMA = 1.5;

export const escalaDoDispositivo = (dpr, maximo = ESCALA_MAXIMA) =>
  Math.min(Math.max(Number(dpr) || 1, 1), maximo);

// Teto de pixels do canvas: a home inteira é um canvas só, e o Safari
// recusa canvas acima de ~16,7 Mpx (além do custo de memória na GPU).
export const AREA_MAXIMA = 12e6;

/*
 * Escala que cabe na maior textura que a GPU aceita (MAX_TEXTURE_SIZE) e
 * no teto de área: página alta × 1,5 pode passar de um dos dois, e aí o
 * envio do fundo falharia em silêncio. Pode ficar abaixo de 1 (fundo um
 * pouco mais suave).
 */
export function escalaQueCabe(largura, altura, escala, maximo, area = AREA_MAXIMA) {
  const porArea = Math.sqrt(area / (Math.ceil(Math.max(largura, 1)) * Math.ceil(Math.max(altura, 1))));
  const limitada = Math.min(escala, porArea);
  if (!(maximo > 0)) return limitada;
  return Math.min(limitada, Math.floor(maximo) / Math.ceil(Math.max(largura, altura, 1)));
}

/*
 * A simulação cobre o painel inteiro com texels quadrados (em px de tela).
 * O tamanho do texel é o da versão anterior (512 texels na largura do
 * desktop), para as ondas terem o mesmo tamanho e a mesma velocidade.
 */
const TEXEL_CELULAR = 3.5;
export const texelDaAgua = (largura) => (largura >= 1024 ? largura / 512 : TEXEL_CELULAR);

// Resolução [largura, altura] da simulação, sem passar do limite da GPU.
export function resolucaoDaAgua(largura, altura, texel, maximo) {
  const w = Math.max(1, Math.ceil(largura / texel));
  const h = Math.max(1, Math.ceil(altura / texel));
  const reducao = maximo > 0 ? Math.min(1, Math.floor(maximo) / Math.max(w, h)) : 1;
  return [Math.max(1, Math.floor(w * reducao)), Math.max(1, Math.floor(h * reducao))];
}

// Centro de uma gota em [-1, 1] em cada eixo da simulação (y para cima).
export function centroDaGota(x, y, largura, altura) {
  return [(2 * x) / Math.max(largura, 1) - 1, 1 - (2 * y) / Math.max(altura, 1)];
}

// Raio em px convertido para fração da altura (o shader corrige o x pela proporção).
export const raioDaGota = (raio, altura) => raio / Math.max(altura, 1);

export const proporcao = (largura, altura) => largura / Math.max(altura, 1);

/*
 * Faixa vertical do painel (px) que vale desenhar: a parte na janela e mais
 * uma tela acima e abaixo, para um scroll rápido não mostrar a borda antes
 * do próximo quadro. null quando o painel está todo fora.
 */
export function faixaVisivel(topoDoPainel, altura, alturaDaJanela) {
  const inicio = Math.max(0, -topoDoPainel - alturaDaJanela);
  const fim = Math.min(altura, -topoDoPainel + 2 * alturaDaJanela);
  return fim > inicio ? { inicio, fim } : null;
}

export const dentroDoPainel = (x, y, largura, altura) =>
  x >= 0 && y >= 0 && x <= largura && y <= altura;

// Interseção de dois retângulos { x, y, w, h }; vazia vira largura/altura 0.
export function intersecao(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return { x, y, w: Math.max(w, 0), h: Math.max(h, 0) };
}

// Área visível depois de todos os recortes; null quando não há recorte.
export const recorteDe = (retangulos) =>
  retangulos.length ? retangulos.reduce(intersecao) : null;

// "12.5px" → 12.5; "normal", "" ou lixo → 0.
export function pixels(valor) {
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}

// Texto como o navegador o mostra numa linha: espaços colapsados + text-transform.
export function textoVisivel(texto, transformacao = 'none') {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (transformacao === 'uppercase') return limpo.toLocaleUpperCase('pt-BR');
  if (transformacao === 'lowercase') return limpo.toLocaleLowerCase('pt-BR');
  if (transformacao === 'capitalize') {
    return limpo.replace(/(^|\s)(\S)/g, (_, espaco, letra) => espaco + letra.toLocaleUpperCase('pt-BR'));
  }
  return limpo;
}

// Shorthand aceito pelo canvas 2D a partir do estilo computado do elemento.
export function fonteDoCanvas({ fontStyle, fontWeight, fontSize, fontFamily }) {
  return [fontStyle || 'normal', fontWeight || '400', fontSize || '16px', fontFamily || 'sans-serif']
    .join(' ');
}

/*
 * Linha de base de uma linha de texto no modelo do CSS: a "meia entrelinha"
 * (sobra entre a altura da linha e a área do conteúdo da fonte) fica metade
 * acima e metade abaixo.
 */
export const linhaDeBase = (topo, alturaLinha, ascendente, descendente) =>
  topo + (alturaLinha - (ascendente + descendente)) / 2 + ascendente;

// x inicial do texto conforme text-align (start/end dependem da direção).
export function inicioDoTexto(alinhamento, direcao, esquerda, largura, larguraTexto) {
  const rtl = direcao === 'rtl';
  const lado = {
    start: rtl ? 'right' : 'left',
    end: rtl ? 'left' : 'right',
    left: 'left',
    right: 'right',
    center: 'center',
    justify: rtl ? 'right' : 'left',
  }[alinhamento] ?? 'left';
  if (lado === 'center') return esquerda + (largura - larguraTexto) / 2;
  if (lado === 'right') return esquerda + largura - larguraTexto;
  return esquerda;
}

const arredondar = (valor, passo) => Math.round(valor / passo) * passo;

/*
 * Resumo de um elemento marcado como a textura de fundo o mostra. Muda só
 * quando ele anda, muda de tamanho, de opacidade ou de texto: aí vale
 * redesenhar a região dele. Frações abaixo de 1/4 px não aparecem na tela.
 */
export function chaveDoItem(m) {
  const partes = [
    m.tipo,
    m.visivel ? 1 : 0,
    arredondar(m.x, 0.25),
    arredondar(m.y, 0.25),
    arredondar(m.w, 0.25),
    arredondar(m.h, 0.25),
    arredondar(m.alpha, 0.005),
  ];
  if (m.recorte) {
    const r = m.recorte;
    partes.push(arredondar(r.x, 0.25), arredondar(r.y, 0.25), arredondar(r.w, 0.25), arredondar(r.h, 0.25));
  }
  if (m.texto !== undefined) partes.push(m.texto);
  return partes.join('|');
}

/*
 * Área que o desenho de um elemento pode tocar: a caixa dele com folga
 * (acentos, itálicos e antialias saem um pouco da caixa do texto).
 */
export function caixaDoDesenho(m) {
  const folga = 4 + m.h * 0.25;
  return { x: m.x - folga, y: m.y - folga, w: m.w + folga * 2, h: m.h + folga * 2 };
}

// Menor retângulo que contém os dois (null conta como vazio).
export function uniao(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

// Retângulo em px CSS para px do canvas, alinhado para fora e dentro dos limites.
export function emPixels(r, escala, largura, altura) {
  const x = Math.max(0, Math.floor(r.x * escala));
  const y = Math.max(0, Math.floor(r.y * escala));
  const fimX = Math.min(largura, Math.ceil((r.x + r.w) * escala));
  const fimY = Math.min(altura, Math.ceil((r.y + r.h) * escala));
  return fimX > x && fimY > y ? { x, y, w: fimX - x, h: fimY - y } : null;
}

/*
 * Passos da simulação a 60 Hz fixos, independente da taxa da tela (o plugin
 * original anda um passo por quadro, então ondas correriam 2× mais rápido em
 * 120 Hz). `maximo` evita a avalanche depois de uma aba parada.
 */
export function passosFixos(acumulado, passo, maximo) {
  const passos = Math.floor(acumulado / passo);
  if (passos > maximo) return { passos: maximo, resto: 0 };
  return { passos, resto: acumulado - passos * passo };
}
