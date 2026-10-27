/*
 * Texturas do quadro da equipe, desenhadas em canvas: o fundo do quadro branco
 * e as anotações "escritas à mão". O que cada uma diz vem pronto da página
 * (AnotacoesQuadro, montado em quadro/anotacoes.js); a anotação que vier null
 * não existe (a função devolve null), então o quadro acompanha o que o backend enviar.
 */
import * as THREE from 'three';

/**
 * O que vai escrito no quadro. Cada página monta o seu a partir do resumo da equipe.
 *
 * @typedef {object} AnotacoesQuadro
 * @property {string} assinatura  escrita de pincel no canto do quadro
 * @property {{ titulo: string, subtitulo: string, dias: { rotulo: string, valor: number, hoje: boolean }[] }
 *   | { titulo: string, subtitulo: string, barras: { rotulo: string, valor: number, cor: string, percentual: string }[] }
 *   | null} grafico
 *   papel rasgado com as colunas dos últimos dias, ou com até seis barras deitadas (cada uma com a parte do total)
 * @property {{ titulo: string, linhas: { texto: string, alerta?: boolean }[] }
 *   | { titulo: string, barras: { rotulo: string, valor: number, partes: { cor: string, valor: number }[] }[] } | null} lista
 *   folha pautada com até cinco linhas (`alerta` pinta a linha de vermelho), ou com até cinco barras deitadas
 * @property {{ numero: number | string, linhas: string[] } | null} postit  o número grande e duas linhas embaixo
 */

// Caveat vem de @fontsource/caveat (importada em Quadro.jsx).
const MAO = '"Caveat", "Segoe Print", "Comic Sans MS", cursive';

const TINTA = { escura: '#3B3A4A', suave: '#6B6A7A', azul: '#24407A', alerta: '#B8423A', pincel: '#2E8C93' };

// Escreve na largura dada: se o texto não couber, a letra diminui até caber.
function escreverCabendo(ctx, texto, x, y, larguraMaxima, peso, tamanho) {
  ctx.font = `${peso} ${tamanho}px ${MAO}`;
  const largura = ctx.measureText(texto).width;
  if (largura > larguraMaxima) ctx.font = `${peso} ${Math.floor((tamanho * larguraMaxima) / largura)}px ${MAO}`;
  ctx.fillText(texto, x, y);
}

function novaTextura(largura, altura, desenhar) {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext('2d'), largura, altura);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
}

/** @param {string} assinatura escrita de pincel no canto, sublinhada na largura dela */
export function texturaQuadroBranco(assinatura) {
  return novaTextura(1024, 662, (ctx, w, h) => {
    ctx.fillStyle = '#FBFBF8';
    ctx.fillRect(0, 0, w, h);

    // Marcas leves de apagador.
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#8A93A6';
    [[180, 520, 260, 26], [600, 120, 180, 20], [740, 600, 200, 18]].forEach(([x, y, largura, altura]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, largura / 2, altura / 2, -0.05, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Escrita de pincel no canto inferior direito, fora das anotações.
    ctx.fillStyle = TINTA.pincel;
    ctx.font = `700 46px ${MAO}`;
    ctx.textAlign = 'right';
    ctx.fillText(assinatura, w - 36, h - 40);
    // O traço passa um pouco da escrita para a esquerda, com a barriga no meio.
    const inicio = w - 40 - (ctx.measureText(assinatura).width + 14);
    ctx.strokeStyle = TINTA.pincel;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(inicio, h - 22);
    ctx.quadraticCurveTo((inicio + w - 40) / 2 + 5, h - 10, w - 40, h - 24);
    ctx.stroke();
    ctx.fillStyle = '#E58F8F';
    ctx.font = `700 40px ${MAO}`;
    ctx.fillText('★', w - 50, h - 92);
  });
}

// Contorno do papel, com a borda de baixo rasgada (sorteio fixo, sempre igual).
function contornoRasgado(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.lineTo(w - 6, 10);
  ctx.lineTo(w - 10, h - 70);
  let x = w - 10;
  let semente = 7;
  while (x > 10) {
    semente = (semente * 31 + 7) % 23;
    x -= 14 + semente;
    ctx.lineTo(Math.max(x, 10), h - 70 + (semente % 2 ? 26 : -4) + (semente % 5) * 6);
  }
  ctx.lineTo(8, h - 60);
  ctx.closePath();
}

function barrasDosDias(ctx, w, dias) {
  const maximo = Math.max(...dias.map((dia) => dia.valor), 1);
  const base = 392;
  const alturaMaxima = 200;
  const esquerda = 46;
  // As barras dividem a largura do papel, quantos dias vierem.
  const passo = (w - esquerda * 2) / dias.length;
  const largura = passo * 0.74;

  dias.forEach((dia, i) => {
    const altura = (dia.valor / maximo) * alturaMaxima;
    const x = esquerda + i * passo + (passo - largura) / 2;
    ctx.fillStyle = dia.hoje ? '#F2B632' : '#9DB4D6';
    ctx.beginPath();
    ctx.roundRect(x, base - altura, largura, altura, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 34px ${MAO}`;
    ctx.fillText(String(dia.valor), x + largura / 2, base - altura - 10);
    ctx.fillStyle = TINTA.suave;
    ctx.font = `600 30px ${MAO}`;
    ctx.fillText(dia.rotulo.toLowerCase(), x + largura / 2, base + 34);
  });

  ctx.strokeStyle = TINTA.escura;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(36, base + 2);
  ctx.lineTo(w - 36, base + 4);
  ctx.stroke();
}

// Barras deitadas, uma por item: o nome à esquerda do eixo, a barra na cor dele e, na ponta, o total e a parte do total.
function barrasDasCargas(ctx, w, barras) {
  const maximo = Math.max(...barras.map(({ valor }) => valor), 1);
  const eixo = 166;
  // Largura do "123 45%" de cada linha: o número e, depois de um vão, a parte do total.
  const larguraDoTexto = ({ valor, percentual }) => {
    ctx.font = `700 32px ${MAO}`;
    const numero = ctx.measureText(String(valor)).width;
    ctx.font = `600 26px ${MAO}`;
    return numero + 8 + ctx.measureText(percentual).width;
  };
  // A maior barra deixa espaço para o texto mais largo antes da borda do papel (w - 42).
  const larguraMaxima = w - 42 - eixo - 4 - 10 - Math.max(...barras.map(larguraDoTexto));
  // Seis linhas terminam acima da faixa escura do pé do papel.
  const topo = 160;
  const passo = 44;
  const altura = 26;

  barras.forEach(({ rotulo, valor, cor, percentual }, i) => {
    const y = topo + i * passo;
    ctx.textAlign = 'right';
    ctx.fillStyle = TINTA.escura;
    escreverCabendo(ctx, rotulo, eixo - 12, y + altura - 4, eixo - 12 - 36, 600, 32);

    const largura = Math.max((valor / maximo) * larguraMaxima, 4);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.roundRect(eixo + 4, y, largura, altura, [0, 6, 6, 0]);
    ctx.fill();

    ctx.textAlign = 'left';
    const x = eixo + 4 + largura + 10;
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 32px ${MAO}`;
    const numero = String(valor);
    ctx.fillText(numero, x, y + altura - 3);
    const depoisDoNumero = x + ctx.measureText(numero).width + 8;
    ctx.fillStyle = TINTA.suave;
    ctx.font = `600 26px ${MAO}`;
    ctx.fillText(percentual, depoisDoNumero, y + altura - 3);
  });

  ctx.strokeStyle = TINTA.escura;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(eixo, topo - 12);
  ctx.lineTo(eixo + 2, topo + barras.length * passo - 14);
  ctx.stroke();
}

/**
 * Papel rasgado com o mini gráfico dos últimos dias, ou com as barras de carga.
 * @param {AnotacoesQuadro['grafico']} grafico
 */
export function texturaPapelRasgado(grafico) {
  if (!grafico || !(grafico.dias?.length || grafico.barras?.length)) return null;
  const { titulo, subtitulo } = grafico;

  return novaTextura(512, 540, (ctx, w, h) => {
    contornoRasgado(ctx, w, h);
    ctx.fillStyle = '#F1ECDF';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#E6DFCC';
    ctx.fillRect(0, h - 120, w, 120);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 54px ${MAO}`;
    ctx.fillText(titulo, 36, 82);
    ctx.fillStyle = TINTA.suave;
    ctx.font = `600 38px ${MAO}`;
    ctx.fillText(subtitulo, 36, 124);

    if (grafico.barras) barrasDasCargas(ctx, w, grafico.barras);
    else barrasDosDias(ctx, w, grafico.dias);
  });
}

// Barras deitadas, uma por linha: o nome à esquerda do eixo, a barra dividida por tipo e o total na ponta.
function barrasDosLocais(ctx, w, barras) {
  const maximo = Math.max(...barras.map(({ valor }) => valor), 1);
  const eixo = 246;
  const larguraMaxima = w - eixo - 96;
  const topo = 108;
  const passo = 70;
  const altura = 30;

  barras.forEach(({ rotulo, valor, partes }, i) => {
    const y = topo + i * passo;
    ctx.textAlign = 'right';
    ctx.fillStyle = TINTA.azul;
    escreverCabendo(ctx, rotulo, eixo - 14, y + altura - 6, 176, 600, 32);

    const largura = (valor / maximo) * larguraMaxima;
    let x = eixo + 4;
    partes.forEach(({ cor, valor: doTipo }, j) => {
      const parte = (doTipo / valor) * largura - (j < partes.length - 1 ? 3 : 0);
      if (parte <= 0) return;
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.roundRect(x, y, parte, altura, j === partes.length - 1 ? [0, 6, 6, 0] : 2);
      ctx.fill();
      x += parte + 3;
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 32px ${MAO}`;
    ctx.fillText(String(valor), eixo + 4 + largura + 12, y + altura - 5);
  });

  ctx.strokeStyle = TINTA.escura;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(eixo, topo - 14);
  ctx.lineTo(eixo + 2, topo + barras.length * passo - 24);
  ctx.stroke();
}

/**
 * Folha pautada com um título e uma lista curta, ou as barras por local.
 * @param {AnotacoesQuadro['lista']} lista
 */
export function texturaFolhaPautada(lista) {
  if (!lista || !(lista.linhas?.length || lista.barras?.length)) return null;
  const { titulo } = lista;

  return novaTextura(640, 512, (ctx, w, h) => {
    ctx.fillStyle = '#FBFAF4';
    ctx.fillRect(0, 0, w, h);

    // Linhas alternando azul e vermelho.
    for (let y = 70, i = 0; y < h - 10; y += 40, i++) {
      ctx.strokeStyle = i % 2 ? 'rgba(229,143,143,0.55)' : 'rgba(110,170,215,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Furos do fichário.
    ctx.fillStyle = '#E3E1D8';
    [110, 256, 402].forEach((y) => {
      ctx.beginPath();
      ctx.arc(22, y, 9, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.textAlign = 'left';
    ctx.fillStyle = TINTA.azul;
    ctx.font = `700 52px ${MAO}`;
    ctx.fillText(titulo, 58, 58);
    // O sublinhado acompanha o título e passa um pouco dele.
    ctx.strokeStyle = TINTA.azul;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(58, 68);
    ctx.lineTo(58 + ctx.measureText(titulo).width + 6, 70);
    ctx.stroke();

    if (lista.barras) {
      barrasDosLocais(ctx, w, lista.barras);
      return;
    }
    lista.linhas.forEach(({ texto, alerta }, i) => {
      ctx.fillStyle = alerta ? TINTA.alerta : TINTA.azul;
      escreverCabendo(ctx, texto, 58, 140 + i * 80, w - 58 - 24, 600, 40);
    });
  });
}

/**
 * Post-it com um número em destaque.
 * @param {AnotacoesQuadro['postit']} destaque
 */
export function texturaPostIt(destaque) {
  if (!destaque) return null;

  return novaTextura(512, 512, (ctx, w, h) => {
    const dobra = 92;

    // Nota com o canto inferior direito dobrado.
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h - dobra);
    ctx.lineTo(w - dobra, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const degrade = ctx.createLinearGradient(0, 0, 0, h);
    degrade.addColorStop(0, '#FFF6B0');
    degrade.addColorStop(1, '#FFEE8C');
    ctx.fillStyle = degrade;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, h - dobra);
    ctx.lineTo(w - dobra, h);
    ctx.lineTo(w - dobra + 10, h - dobra + 6);
    ctx.closePath();
    ctx.fillStyle = '#EBD46A';
    ctx.fill();

    ctx.fillStyle = '#4A3F12';
    ctx.textAlign = 'center';
    escreverCabendo(ctx, String(destaque.numero), w / 2, 230, w - 56, 700, 150);
    ctx.font = `600 54px ${MAO}`;
    destaque.linhas.forEach((linha, i) => ctx.fillText(linha, w / 2, 310 + i * 60));
  });
}
