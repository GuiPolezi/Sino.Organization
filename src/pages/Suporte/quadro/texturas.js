/*
 * Texturas do quadro da equipe, desenhadas em canvas: o fundo do quadro branco
 * e as anotações "escritas à mão". Cada anotação só existe quando há dado para
 * ela (a função devolve null), então o quadro acompanha o que o backend enviar.
 */
import * as THREE from 'three';

// Caveat vem de @fontsource/caveat (importada em Quadro.jsx).
const MAO = '"Caveat", "Segoe Print", "Comic Sans MS", cursive';
const META_SLA = 95;

const TINTA = { escura: '#3B3A4A', suave: '#6B6A7A', azul: '#24407A', alerta: '#B8423A', pincel: '#2E8C93' };

const decimal = (valor) => valor.toFixed(1).replace('.', ',');

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

export function texturaQuadroBranco() {
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
    ctx.fillText('equipe técnica', w - 36, h - 40);
    ctx.strokeStyle = TINTA.pincel;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w - 270, h - 22);
    ctx.quadraticCurveTo(w - 150, h - 10, w - 40, h - 24);
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

// Papel rasgado com o mini gráfico dos atendimentos dos últimos dias.
export function texturaPapelRasgado(resumo) {
  const { dias } = resumo;
  if (!dias.length) return null;

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
    ctx.fillText('Atendimentos', 36, 82);
    ctx.fillStyle = TINTA.suave;
    ctx.font = `600 38px ${MAO}`;
    ctx.fillText(`últimos ${dias.length} dias`, 36, 124);

    barrasDosDias(ctx, w, dias);
  });
}

// Uma linha por meta que tem dado; `alerta` pinta a linha de vermelho.
function metasDaSemana(resumo) {
  const { slaMedio, atendimentosHoje, chamados, avaliacaoMedia, tempoMedioPrimeiraResposta } = resumo;
  const metas = [];
  if (slaMedio !== null) {
    metas.push({ texto: `${slaMedio >= META_SLA ? '✓' : '•'} SLA ${slaMedio}%  (meta ${META_SLA}%)` });
  }
  if (atendimentosHoje !== null) metas.push({ texto: `✓ ${atendimentosHoje} atendimentos hoje` });
  if (chamados?.atrasadas > 0) metas.push({ texto: `• ${chamados.atrasadas} atrasados → zerar!`, alerta: true });
  else if (chamados) metas.push({ texto: '✓ nenhum chamado atrasado' });
  if (avaliacaoMedia !== null) metas.push({ texto: `✓ nota média ${decimal(avaliacaoMedia)}` });
  if (tempoMedioPrimeiraResposta !== null) {
    metas.push({ texto: `• 1ª resposta: ${tempoMedioPrimeiraResposta} min` });
  }
  return metas;
}

// Folha pautada com as metas da semana.
export function texturaFolhaPautada(resumo) {
  const metas = metasDaSemana(resumo);
  if (!metas.length) return null;

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
    ctx.fillText('Metas da semana', 58, 58);
    ctx.strokeStyle = TINTA.azul;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(58, 68);
    ctx.lineTo(380, 70);
    ctx.stroke();

    ctx.font = `600 40px ${MAO}`;
    metas.forEach(({ texto, alerta }, i) => {
      ctx.fillStyle = alerta ? TINTA.alerta : TINTA.azul;
      ctx.fillText(texto, 58, 140 + i * 80);
    });
  });
}

// Post-it: o total de atendimentos do mês ou, sem esse dado, o tamanho da equipe.
function destaqueDoPostIt(resumo) {
  if (resumo.chamados) return { numero: resumo.chamados.concluidasMes, linhas: ['atendimentos', 'no mês ★'] };
  if (resumo.totalTecnicos > 0) return { numero: resumo.totalTecnicos, linhas: ['técnicos', 'na equipe ★'] };
  return null;
}

export function texturaPostIt(resumo) {
  const destaque = destaqueDoPostIt(resumo);
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
    ctx.font = `700 150px ${MAO}`;
    ctx.fillText(String(destaque.numero), w / 2, 230);
    ctx.font = `600 54px ${MAO}`;
    destaque.linhas.forEach((linha, i) => ctx.fillText(linha, w / 2, 310 + i * 60));
  });
}
