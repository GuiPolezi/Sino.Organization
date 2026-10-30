/*
 * A folha que a estátua de Têmis segura, desenhada em canvas com a letra à mão
 * do quadro das outras equipes (Suporte/quadro/texturas.js): é o quadro geral
 * de /compilacao, com o mesmo que o painel mostra, em resumo. O que ela diz vem
 * pronto de resumo.js (resumoCompilacao).
 */
import { MAO, TINTA, escreverCabendo, novaTextura } from '../../Suporte/quadro/texturas.js';

const PAPEL = '#FBFAF4';
const VERDE = '#4FA46B';
const formato = new Intl.NumberFormat('pt-BR');
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });

// Folha de caderno: linhas azuis claras e a margem vermelha.
function papel(ctx, w, h) {
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(110,170,215,0.32)';
  ctx.lineWidth = 2;
  for (let y = 190; y < h - 20; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(229,143,143,0.6)';
  ctx.beginPath();
  ctx.moveTo(74, 0);
  ctx.lineTo(74, h);
  ctx.stroke();
}

function cabecalho(ctx, w) {
  const titulo = 'Compilação';
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.azul;
  ctx.font = `700 76px ${MAO}`;
  ctx.fillText(titulo, 100, 104);
  ctx.strokeStyle = TINTA.azul;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(100, 118);
  ctx.quadraticCurveTo(100 + ctx.measureText(titulo).width / 2, 128, 108 + ctx.measureText(titulo).width, 116);
  ctx.stroke();
  ctx.fillStyle = TINTA.suave;
  escreverCabendo(ctx, `quadro geral · ${MES.format(Date.now())}`, 100, 168, w - 130, 600, 40);
}

// O total do mês bem grande, com a legenda ao lado.
function totalDoMes(ctx, w, resumo) {
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.escura;
  const numero = formato.format(resumo.normasMes);
  escreverCabendo(ctx, numero, 96, 330, 360, 700, 170);
  const depois = 96 + Math.min(ctx.measureText(numero).width, 360) + 22;
  ctx.fillStyle = TINTA.suave;
  ctx.font = `600 44px ${MAO}`;
  ['normas', 'compiladas', 'no mês ★'].forEach((linha, i) => ctx.fillText(linha, depois, 236 + i * 44));
  ctx.fillStyle = TINTA.pincel;
  escreverCabendo(ctx, `${resumo.normasHoje} hoje · ${resumo.normasSemana} na semana`, 100, 386, w - 130, 600, 38);
}

// A barra da meta, desenhada à mão, e quanto dela já foi.
function meta(ctx, w, resumo) {
  const x = 100;
  const y = 420;
  const largura = w - 150;
  const fracao = Math.min(resumo.metaCumprida, 100) / 100;
  ctx.fillStyle = VERDE;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(largura * fracao, 14), 34, 14);
  ctx.fill();
  ctx.strokeStyle = TINTA.escura;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, largura, 34, 14);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillStyle = TINTA.escura;
  ctx.font = `700 38px ${MAO}`;
  ctx.fillText(`meta ${formato.format(resumo.meta)} → ${resumo.metaCumprida}%`, x + largura, y + 76);
}

// As colunas dos últimos dias, como o papel rasgado do quadro do suporte.
function ultimosDias(ctx, w, dias) {
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.azul;
  ctx.font = `700 44px ${MAO}`;
  ctx.fillText('últimos dias', 100, 560);
  const maximo = Math.max(...dias.map(({ valor }) => valor), 1);
  const base = 760;
  const alturaMaxima = 140;
  const esquerda = 100;
  const passo = (w - esquerda - 50) / dias.length;
  const largura = passo * 0.66;
  dias.forEach((dia, i) => {
    const altura = Math.max((dia.valor / maximo) * alturaMaxima, 4);
    const x = esquerda + i * passo + (passo - largura) / 2;
    ctx.fillStyle = dia.hoje ? '#F2B632' : '#9DB4D6';
    ctx.beginPath();
    ctx.roundRect(x, base - altura, largura, altura, 8);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 36px ${MAO}`;
    ctx.fillText(String(dia.valor), x + largura / 2, base - altura - 10);
    ctx.fillStyle = TINTA.suave;
    ctx.font = `600 32px ${MAO}`;
    ctx.fillText(dia.rotulo.toLowerCase(), x + largura / 2, base + 36);
  });
  ctx.strokeStyle = TINTA.escura;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(90, base + 2);
  ctx.lineTo(w - 40, base + 4);
  ctx.stroke();
}

// Os três tipos de norma mais compilados, cada um com a bolinha da cor dele.
function porTipo(ctx, w, tipos) {
  const maiores = tipos.toSorted((a, b) => b.valor - a.valor).slice(0, 3);
  maiores.forEach(({ rotulo, valor, cor }, i) => {
    const y = 852 + i * 46;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(112, y - 12, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = TINTA.azul;
    escreverCabendo(ctx, rotulo, 136, y, w - 300, 600, 38);
    ctx.textAlign = 'right';
    ctx.fillStyle = TINTA.escura;
    ctx.font = `700 38px ${MAO}`;
    ctx.fillText(formato.format(valor), w - 50, y);
  });
}

function rodape(ctx, w, h, resumo) {
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.alerta;
  ctx.font = `700 36px ${MAO}`;
  ctx.fillText(`• ${resumo.emFila} na fila`, 100, h - 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = TINTA.pincel;
  ctx.font = `700 36px ${MAO}`;
  ctx.fillText('equipe de compilação ★', w - 40, h - 26);
}

/**
 * @param {ReturnType<typeof import('../resumo.js').resumoCompilacao>} resumo
 */
export function texturaFolhaTemis(resumo) {
  return novaTextura(768, 1000, (ctx, w, h) => {
    papel(ctx, w, h);
    cabecalho(ctx, w);
    totalDoMes(ctx, w, resumo);
    meta(ctx, w, resumo);
    if (resumo.dias.length) ultimosDias(ctx, w, resumo.dias);
    porTipo(ctx, w, resumo.porTipo);
    rodape(ctx, w, h, resumo);
  });
}
