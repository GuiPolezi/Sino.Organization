/*
 * A folha que a estátua de Têmis segura, desenhada em canvas com a letra à mão
 * do quadro das outras equipes (Suporte/quadro/texturas.js): é o quadro geral
 * de /compilacao escrito à mão, com as mesmas seções do painel, na mesma ordem
 * (card/CardQuadroCompilacao.jsx): os totais do mês, da semana e do dia, o
 * destaque, as normas por tipo, a fila de cada um e os destaques. Os números
 * vêm prontos de resumo.js (resumoCompilacao) e destaques.js (primeirosLugares):
 * sem número é "—" (nunca "+—"), e a soma com card faltando leva "parcial".
 *
 * Cada linha escrita fica em cima de uma pauta: as pautas vão de LINHA em LINHA
 * a partir de TOPO, e a linha n do texto é TOPO + n * LINHA.
 */
import { MAO, TINTA, escreverCabendo, novaTextura } from '../../Suporte/quadro/texturas.js';
import { comMais, numeroOuTraco } from '../atuacao.js';

const PAPEL = '#FBFAF4';
const OURO = '#C98A12';
const TOPO = 190;
const LINHA = 36;
const ESQUERDA = 100;
const DIREITA = 50;
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });

const pauta = (n) => TOPO + n * LINHA;
const primeiroNome = (nome) => nome.split(' ')[0];

// O que cada slide de "Destaques" vira na folha.
const DESTAQUES = [
  { chave: 'compiladas', rotulo: 'compiladas no mês' },
  { chave: 'fila', rotulo: 'aguardando compilação' },
  { chave: 'cidades', rotulo: 'cidades em atuação' },
];

// Folha de caderno: linhas azuis claras e a margem vermelha.
function papel(ctx, w, h) {
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(110,170,215,0.32)';
  ctx.lineWidth = 2;
  for (let y = TOPO; y < h - 20; y += LINHA) {
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
  ctx.fillText(titulo, ESQUERDA, 104);
  const largura = ctx.measureText(titulo).width;
  ctx.strokeStyle = TINTA.azul;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ESQUERDA, 118);
  ctx.quadraticCurveTo(ESQUERDA + largura / 2, 128, ESQUERDA + 8 + largura, 116);
  ctx.stroke();
  ctx.fillStyle = TINTA.suave;
  escreverCabendo(ctx, `quadro geral · ${MES.format(Date.now())}`, ESQUERDA, 168, w - 130, 600, 40);
}

// Título de seção, em azul e sublinhado curto.
function secao(ctx, texto, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.azul;
  ctx.font = `700 40px ${MAO}`;
  ctx.fillText(texto, ESQUERDA, y);
  ctx.strokeStyle = TINTA.azul;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ESQUERDA, y + 7);
  ctx.lineTo(ESQUERDA + ctx.measureText(texto).width, y + 5);
  ctx.stroke();
}

// Texto à esquerda e número à direita, na mesma pauta (as listas da folha).
function linhaComNumero(ctx, texto, numero, x, y, largura, cor = TINTA.escura) {
  ctx.textAlign = 'right';
  ctx.fillStyle = TINTA.escura;
  ctx.font = `700 34px ${MAO}`;
  ctx.fillText(numero, x + largura, y);
  const larguraDoNumero = ctx.measureText(numero).width;
  ctx.textAlign = 'left';
  ctx.fillStyle = cor;
  escreverCabendo(ctx, texto, x, y, largura - larguraDoNumero - 16, 600, 34);
}

function estrela(ctx, x, y, raio) {
  ctx.fillStyle = '#F2B632';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? raio * 0.45 : raio;
    const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + r * Math.cos(angulo), y + r * Math.sin(angulo));
  }
  ctx.closePath();
  ctx.fill();
}

// "Normas Compiladas": o mês bem grande, a semana e o dia embaixo (a soma da equipe).
function totais(ctx, w, resumo) {
  ctx.textAlign = 'left';
  ctx.fillStyle = TINTA.escura;
  const numero = comMais(resumo.normasMes);
  escreverCabendo(ctx, numero, 92, pauta(3), 380, 700, 160);
  const depois = 92 + Math.min(ctx.measureText(numero).width, 380) + 24;
  ctx.fillStyle = TINTA.suave;
  ctx.font = `600 40px ${MAO}`;
  ['normas', 'compiladas', 'no mês'].forEach((linha, i) => ctx.fillText(linha, depois, pauta(1 + i)));
  ctx.fillStyle = TINTA.pincel;
  const faltam = Math.max(resumo.parcial.mes, resumo.parcial.semana, resumo.parcial.hoje);
  escreverCabendo(
    ctx,
    `semana ${comMais(resumo.normasSemana)} · dia ${comMais(resumo.normasHoje)}${faltam > 0 ? ' · parcial' : ''}`,
    ESQUERDA,
    pauta(4),
    w - ESQUERDA - DIREITA,
    700,
    36,
  );
}

// Quem mais compilou no mês e a parte dela no total da equipe (o anel do painel).
function destaque(ctx, w, resumo, pessoa) {
  const y = pauta(5);
  estrela(ctx, ESQUERDA + 14, y - 12, 15);
  const parte = resumo.normasMes > 0 ? Math.round((pessoa.normasMes / resumo.normasMes) * 100) : 0;
  ctx.textAlign = 'left';
  ctx.fillStyle = OURO;
  escreverCabendo(
    ctx,
    `destaque: ${primeiroNome(pessoa.nome)} · ${numeroOuTraco(pessoa.normasMes)} no mês · ${parte}%`,
    ESQUERDA + 40,
    y,
    w - ESQUERDA - 40 - DIREITA,
    700,
    36,
  );
}

// "Normas por Tipo": os mesmos tipos e a mesma ordem do painel, em duas colunas
// ("outros" sem bolinha de cor).
function porTipo(ctx, w, tipos) {
  secao(ctx, 'normas por tipo', pauta(7));
  const coluna = (w - ESQUERDA - DIREITA - 40) / 2;
  tipos.forEach(({ rotulo, cor, valor }, i) => {
    const x = ESQUERDA + (i % 2) * (coluna + 40);
    const y = pauta(8 + Math.floor(i / 2));
    if (cor) {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(x + 9, y - 11, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    linhaComNumero(ctx, cor ? rotulo : rotulo.toLowerCase(), numeroOuTraco(valor), x + 28, y, coluna - 28, TINTA.azul);
  });
}

// "Fila": quantas normas esperam na fila de cada pessoa, na ordem do painel.
function fila(ctx, w, ranking) {
  secao(ctx, 'fila', pauta(12));
  const coluna = (w - ESQUERDA - DIREITA - 40) / 2;
  // Cabem 8 pessoas (4 pautas, 2 colunas); a equipe tem 7.
  ranking.slice(0, 8).forEach(({ nome, emFila }, i) => {
    const x = ESQUERDA + (i % 2) * (coluna + 40);
    const y = pauta(13 + Math.floor(i / 2));
    linhaComNumero(ctx, primeiroNome(nome), numeroOuTraco(emFila), x, y, coluna);
  });
}

// "Destaques": quem ficou em primeiro em cada slide do painel.
function destaques(ctx, w, primeiros) {
  secao(ctx, 'destaques', pauta(18));
  DESTAQUES.forEach(({ chave, rotulo }, i) => {
    const primeiro = primeiros[chave];
    const quem = primeiro ? `${primeiroNome(primeiro.pessoa.nome)} · ${numeroOuTraco(primeiro.valor)}` : '—';
    linhaComNumero(ctx, `★ ${rotulo}`, quem, ESQUERDA, pauta(19 + i), w - ESQUERDA - DIREITA, TINTA.pincel);
  });
}

/**
 * @param {ReturnType<typeof import('../resumo.js').resumoCompilacao>} resumo
 * @param {ReturnType<typeof import('../destaques.js').primeirosLugares>} primeiros
 */
export function texturaFolhaTemis(resumo, primeiros) {
  return novaTextura(768, 1000, (ctx, w, h) => {
    papel(ctx, w, h);
    cabecalho(ctx, w);
    totais(ctx, w, resumo);
    if (primeiros.compiladas) destaque(ctx, w, resumo, primeiros.compiladas.pessoa);
    porTipo(ctx, w, resumo.porTipo);
    if (resumo.ranking.length) fila(ctx, w, resumo.ranking);
    destaques(ctx, w, primeiros);
  });
}
