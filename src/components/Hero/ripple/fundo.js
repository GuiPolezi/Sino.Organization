import {
  fonteDoCanvas,
  inicioDoTexto,
  linhaDeBase,
  pixels,
  recorteDe,
  textoVisivel,
} from './geometria.js';

/*
 * Fundo que a água refrata: um canvas 2D com a cor do painel e cada elemento
 * marcado com `data-ripple` redesenhado na posição atual dele.
 *
 *   data-ripple="texto"  uma linha de texto (fonte, cor, letter-spacing,
 *                        text-transform e text-align do próprio elemento)
 *   data-ripple="svg"    um <svg> (no próprio elemento ou o primeiro dentro dele)
 *   data-ripple="linha"  um bloco liso com o background-color do elemento
 *
 * Opacidade e visibilidade vêm do elemento e dos ancestrais até o painel
 * (o intro do GSAP usa autoAlpha); ancestrais com overflow ≠ visible recortam
 * (máscaras de "subir a linha"). Rotação e escala não são suportadas: o
 * desenho usa o retângulo do getBoundingClientRect.
 */

const TIPOS = new Set(['texto', 'svg', 'linha']);
const PROPRIEDADES_SVG = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'opacity'];

function ancestraisAte(el, painel) {
  const lista = [];
  for (let atual = el.parentElement; atual && atual !== painel; atual = atual.parentElement) {
    lista.push(atual);
  }
  return lista;
}

const recorta = (el) => {
  const { overflowX, overflowY } = getComputedStyle(el);
  return overflowX !== 'visible' || overflowY !== 'visible';
};

function coletar(painel) {
  return [...painel.querySelectorAll('[data-ripple]')]
    .map((el) => {
      const tipo = el.dataset.ripple;
      const alvo = tipo === 'svg' && el.localName !== 'svg' ? el.querySelector('svg') : el;
      if (!TIPOS.has(tipo) || !alvo) return null;
      const ancestrais = ancestraisAte(alvo, painel);
      return { tipo, alvo, ancestrais, recortes: ancestrais.filter(recorta) };
    })
    .filter(Boolean);
}

const relativo = (r, base) => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });

function medirItem(item, base) {
  const { tipo, alvo, ancestrais, recortes } = item;
  const estilo = getComputedStyle(alvo);
  const caixa = relativo(alvo.getBoundingClientRect(), base);
  let alpha = pixels(estilo.opacity);
  for (const a of ancestrais) alpha *= pixels(getComputedStyle(a).opacity);
  const recorte = recorteDe(recortes.map((el) => relativo(el.getBoundingClientRect(), base)));
  return {
    ...caixa,
    item,
    tipo,
    alpha,
    visivel: estilo.visibility !== 'hidden' && estilo.display !== 'none' && caixa.w > 0 && caixa.h > 0,
    recorte,
    texto: tipo === 'texto' ? alvo.textContent : undefined,
  };
}

// Clona o <svg> com as cores computadas (variáveis CSS não sobrevivem fora da página).
function serializarSvg(svg, largura, altura) {
  const copia = svg.cloneNode(true);
  const origens = [svg, ...svg.querySelectorAll('*')];
  const copias = [copia, ...copia.querySelectorAll('*')];
  origens.forEach((el, i) => {
    const estilo = getComputedStyle(el);
    PROPRIEDADES_SVG.forEach((p) => copias[i].setAttribute(p, estilo.getPropertyValue(p)));
    copias[i].removeAttribute('class');
    copias[i].removeAttribute('style');
  });
  // A opacidade do <svg> já entra no globalAlpha.
  copia.setAttribute('opacity', '1');
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copia.setAttribute('width', largura);
  copia.setAttribute('height', altura);
  copia.setAttribute('preserveAspectRatio', 'none');
  const xml = new XMLSerializer().serializeToString(copia);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}

function desenharTexto(ctx, m) {
  const estilo = getComputedStyle(m.item.alvo);
  const texto = textoVisivel(m.texto, estilo.textTransform);
  if (!texto) return;
  ctx.font = fonteDoCanvas(estilo);
  ctx.fillStyle = estilo.color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const espaco = pixels(estilo.letterSpacing);
  const nativo = 'letterSpacing' in ctx;
  if (nativo) ctx.letterSpacing = `${espaco}px`;

  const medida = ctx.measureText(texto);
  const tamanho = pixels(estilo.fontSize);
  const asc = medida.fontBoundingBoxAscent ?? tamanho * 0.8;
  const desc = medida.fontBoundingBoxDescent ?? tamanho * 0.2;
  const esquerda = m.x + pixels(estilo.paddingLeft) + pixels(estilo.borderLeftWidth);
  const topo = m.y + pixels(estilo.paddingTop) + pixels(estilo.borderTopWidth);
  const largura = m.w - (esquerda - m.x) - pixels(estilo.paddingRight) - pixels(estilo.borderRightWidth);
  const altura = m.h - (topo - m.y) - pixels(estilo.paddingBottom) - pixels(estilo.borderBottomWidth);
  // Inline: o retângulo já é a área do conteúdo. Bloco: a primeira linha.
  const alturaLinha =
    estilo.display === 'inline' || estilo.lineHeight === 'normal' ? altura : pixels(estilo.lineHeight);
  const larguraTexto = nativo ? medida.width : medida.width + espaco * texto.length;
  let x = inicioDoTexto(estilo.textAlign, estilo.direction, esquerda, largura, larguraTexto);
  const y = linhaDeBase(topo, alturaLinha, asc, desc);

  if (nativo) {
    ctx.fillText(texto, x, y);
    return;
  }
  // Sem ctx.letterSpacing (navegadores antigos): letra a letra.
  for (const letra of texto) {
    ctx.fillText(letra, x, y);
    x += ctx.measureText(letra).width + espaco;
  }
}

function desenharLinha(ctx, m) {
  ctx.fillStyle = getComputedStyle(m.item.alvo).backgroundColor;
  ctx.fillRect(m.x, m.y, m.w, m.h);
}

export function criarFundo(painel) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Imagem rasterizada de cada <svg>: a última pronta segue em uso até a nova carregar.
  const imagens = new Map();
  let itens = coletar(painel);
  let recoletar = false;
  let sujo = true;
  let pendentes = 0;
  // Algum <svg> não rasterizou: o original seria escondido sem substituto.
  let falhou = false;

  const observador = new MutationObserver(() => {
    recoletar = true;
  });
  observador.observe(painel, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-ripple'],
  });

  // Pede a imagem do tamanho atual mesmo com o svg invisível (intro), para
  // ela já estar pronta quando ele aparecer.
  function imagemDoSvg(m, escala) {
    const chave = `${Math.round(m.w * escala)}x${Math.round(m.h * escala)}`;
    const cache = imagens.get(m.item.alvo) ?? { chave: null, imagem: null };
    if (cache.chave !== chave && m.w > 0 && m.h > 0) {
      cache.chave = chave;
      const imagem = new Image();
      pendentes++;
      const fim = (ok) => {
        pendentes--;
        if (!ok) falhou = true;
        if (ok && cache.chave === chave) cache.imagem = imagem;
        sujo = true;
      };
      imagem.onload = () => fim(true);
      imagem.onerror = () => fim(false);
      const [w, h] = chave.split('x');
      imagem.src = serializarSvg(m.item.alvo, w, h);
      imagens.set(m.item.alvo, cache);
    }
    return cache.imagem;
  }

  function desenharSvg(m, escala) {
    const imagem = imagemDoSvg(m, escala);
    if (imagem) ctx.drawImage(imagem, m.x, m.y, m.w, m.h);
  }

  return {
    canvas,

    // Medidas atuais de cada elemento marcado, relativas ao retângulo do painel.
    medir(base) {
      if (recoletar) {
        itens = coletar(painel);
        recoletar = false;
        sujo = true;
      }
      return itens.map((item) => medirItem(item, base));
    },

    // Força o próximo redesenho (fontes carregadas, imagem do svg pronta).
    invalidar() {
      sujo = true;
    },

    get sujo() {
      return sujo;
    },

    // Todas as imagens de svg pedidas já chegaram (ou falharam).
    get pronto() {
      return pendentes === 0;
    },

    // O motor desliga a água (e devolve o DOM) quando isto vira true.
    get falhou() {
      return falhou;
    },

    desenhar(medidas, largura, altura, escala) {
      const w = Math.max(1, Math.round(largura * escala));
      const h = Math.max(1, Math.round(altura * escala));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      sujo = false;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.clearRect(0, 0, largura, altura);
      ctx.globalAlpha = 1;
      ctx.fillStyle = getComputedStyle(painel).backgroundColor;
      ctx.fillRect(0, 0, largura, altura);

      for (const m of medidas) {
        if (m.tipo === 'svg') imagemDoSvg(m, escala);
        if (!m.visivel || m.alpha <= 0.001 || (m.recorte && (m.recorte.w <= 0 || m.recorte.h <= 0))) continue;
        ctx.save();
        if (m.recorte) {
          ctx.beginPath();
          ctx.rect(m.recorte.x, m.recorte.y, m.recorte.w, m.recorte.h);
          ctx.clip();
        }
        ctx.globalAlpha = Math.min(1, m.alpha);
        if (m.tipo === 'texto') desenharTexto(ctx, m);
        else if (m.tipo === 'svg') desenharSvg(m, escala);
        else desenharLinha(ctx, m);
        ctx.restore();
      }
    },

    destruir() {
      observador.disconnect();
      imagens.clear();
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
