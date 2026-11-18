/*
 * Contas puras da camada de ondas (sem DOM, sem WebGL), testadas em
 * geometria.test.mjs. Todas as medidas em px CSS relativos ao painel, com a
 * origem no canto superior esquerdo.
 */

// Teto do devicePixelRatio: acima disso o custo cresce e o ganho some.
export const ESCALA_MAXIMA = 1.5;

export const escalaDoDispositivo = (dpr, maximo = ESCALA_MAXIMA) =>
  Math.min(Math.max(Number(dpr) || 1, 1), maximo);

/*
 * Escala que cabe na maior textura que a GPU aceita (MAX_TEXTURE_SIZE):
 * painel alto no celular × 1,5 pode passar do limite, e aí o envio do fundo
 * falharia em silêncio. Pode ficar abaixo de 1 (fundo um pouco mais suave).
 */
export function escalaQueCabe(largura, altura, escala, maximo) {
  const lado = Math.max(largura, altura, 1);
  if (!(maximo > 0)) return escala;
  return Math.min(escala, Math.floor(maximo) / Math.ceil(lado));
}

/*
 * A simulação é um quadrado que cobre o lado maior do painel (como no
 * jquery.ripples): a razão diz quanto desse quadrado cada eixo usa.
 */
export function razaoDoPainel(largura, altura) {
  const lado = Math.max(largura, altura, 1);
  return [largura / lado, altura / lado];
}

// Centro de uma gota em [-1, 1] no espaço da simulação (y para cima).
export function centroDaGota(x, y, largura, altura) {
  const lado = Math.max(largura, altura, 1);
  return [(2 * x - largura) / lado, (altura - 2 * y) / lado];
}

// Raio em px convertido para fração do lado da simulação.
export const raioDaGota = (raio, largura, altura) => raio / Math.max(largura, altura, 1);

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
 * Resumo do que a textura de fundo mostra. Muda só quando algum elemento
 * marcado anda, muda de tamanho, de opacidade ou de texto: aí vale redesenhar
 * e reenviar a textura. Frações abaixo de 1/4 px não aparecem na tela.
 */
export function assinatura(medidas, largura, altura, escala) {
  const partes = [arredondar(largura, 0.25), arredondar(altura, 0.25), escala];
  for (const m of medidas) {
    partes.push(
      m.tipo,
      m.visivel ? 1 : 0,
      arredondar(m.x, 0.25),
      arredondar(m.y, 0.25),
      arredondar(m.w, 0.25),
      arredondar(m.h, 0.25),
      arredondar(m.alpha, 0.005),
    );
    if (m.recorte) {
      const r = m.recorte;
      partes.push(arredondar(r.x, 0.25), arredondar(r.y, 0.25), arredondar(r.w, 0.25), arredondar(r.h, 0.25));
    }
    if (m.texto !== undefined) partes.push(m.texto);
  }
  return partes.join('|');
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
