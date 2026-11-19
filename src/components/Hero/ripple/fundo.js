import {
  caixaDoDesenho,
  chaveDoItem,
  emPixels,
  fonteDoCanvas,
  inicioDoTexto,
  linhaDeBase,
  pixels,
  recorteDe,
  textoVisivel,
  uniao,
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
 *
 * O painel pode ser a página inteira: a cada quadro só a região dos
 * elementos que mudaram é redesenhada (e reenviada à GPU pelo motor).
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

// Mesmos elementos, na mesma ordem?
const mesmaLista = (a, b) => a.length === b.length && a.every((item, i) => item.alvo === b[i].alvo);

const intersectam = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function criarFundo(painel) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  // Pedaço do canvas que vai para a GPU quando só uma região muda.
  const pedaco = document.createElement('canvas');
  const ctxPedaco = pedaco.getContext('2d');
  // Imagem rasterizada de cada <svg>: a última pronta segue em uso até a nova carregar.
  const imagens = new Map();
  let itens = coletar(painel);
  let recoletar = false;
  let sujo = true;
  let escalaAtual = 0;
  let pendentes = 0;
  // Algum <svg> não rasterizou: o original seria escondido sem substituto.
  let falhou = false;
  // Como cada elemento estava no último desenho: chave (geometria.js) e área tocada.
  let anteriores = new Map();

  // Qualquer mudança no DOM do painel (janela de app, listas...) pede nova coleta;
  // o fundo só é redesenhado inteiro se a lista de marcados mudou de fato.
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

  function desenharItem(m, escala) {
    if (!m.visivel || m.alpha <= 0.001 || (m.recorte && (m.recorte.w <= 0 || m.recorte.h <= 0))) return;
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

  // Pinta o painel inteiro ou só `regiao` (px CSS): fundo liso e os elementos que a tocam.
  function pintar(medidas, largura, altura, escala, regiao) {
    const area = regiao ?? { x: 0, y: 0, w: largura, h: altura };
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    ctx.globalAlpha = 1;
    ctx.clearRect(area.x, area.y, area.w, area.h);
    ctx.fillStyle = getComputedStyle(painel).backgroundColor;
    ctx.fillRect(area.x, area.y, area.w, area.h);
    for (const m of medidas) {
      if (!regiao || intersectam(caixaDoDesenho(m), regiao)) desenharItem(m, escala);
    }
    ctx.restore();
  }

  // Compara com o último desenho: devolve a área (px CSS) que mudou, ou null.
  function regiaoQueMudou(medidas) {
    let regiao = null;
    const atuais = new Map();
    for (const m of medidas) {
      const atual = { chave: chaveDoItem(m), caixa: caixaDoDesenho(m) };
      const antes = anteriores.get(m.item.alvo);
      atuais.set(m.item.alvo, atual);
      if (!antes || antes.chave !== atual.chave) regiao = uniao(uniao(regiao, antes?.caixa), atual.caixa);
    }
    for (const [alvo, antes] of anteriores) {
      if (!atuais.has(alvo)) regiao = uniao(regiao, antes.caixa);
    }
    anteriores = atuais;
    return regiao;
  }

  return {
    canvas,

    // Medidas atuais de cada elemento marcado, relativas ao retângulo do painel.
    medir(base) {
      if (recoletar) {
        const novos = coletar(painel);
        if (!mesmaLista(novos, itens)) sujo = true;
        itens = novos;
        recoletar = false;
      }
      return itens.map((item) => medirItem(item, base));
    },

    // Força o próximo redesenho completo (fontes carregadas, imagem do svg pronta).
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

    /*
     * Redesenha o que mudou desde a última vez. Devolve 'tudo' (o canvas
     * inteiro mudou), a região em px do canvas { x, y, w, h }, ou null.
     */
    atualizar(medidas, largura, altura, escala) {
      const w = Math.max(1, Math.round(largura * escala));
      const h = Math.max(1, Math.round(altura * escala));
      if (canvas.width !== w || canvas.height !== h || escala !== escalaAtual) {
        canvas.width = w;
        canvas.height = h;
        escalaAtual = escala;
        sujo = true;
      }
      for (const m of medidas) if (m.tipo === 'svg') imagemDoSvg(m, escala);

      const regiao = regiaoQueMudou(medidas);
      if (sujo) {
        sujo = false;
        pintar(medidas, largura, altura, escala, null);
        return 'tudo';
      }
      const px = regiao && emPixels(regiao, escala, w, h);
      if (!px) return null;
      // Pinta a região alinhada aos pixels, para não sobrar meio pixel velho na borda.
      pintar(medidas, largura, altura, escala, { x: px.x / escala, y: px.y / escala, w: px.w / escala, h: px.h / escala });
      return px;
    },

    // Cópia da região (px do canvas) num canvas do tamanho dela, para o envio parcial.
    pedacoDe({ x, y, w, h }) {
      if (pedaco.width !== w || pedaco.height !== h) {
        pedaco.width = w;
        pedaco.height = h;
      } else {
        ctxPedaco.clearRect(0, 0, w, h);
      }
      ctxPedaco.drawImage(canvas, x, y, w, h, 0, 0, w, h);
      return pedaco;
    },

    destruir() {
      observador.disconnect();
      imagens.clear();
      anteriores.clear();
      canvas.width = 0;
      canvas.height = 0;
      pedaco.width = 0;
      pedaco.height = 0;
    },
  };
}
