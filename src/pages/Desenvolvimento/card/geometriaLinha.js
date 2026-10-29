/*
 * Geometria do gráfico de linha da "Carga por Local" (GraficoLocais.jsx): onde
 * fica cada ponto, o número dele e o nome do local, para a largura do painel.
 * Tudo em px, a partir da largura medida, porque o painel vai de ~288px (celular)
 * a ~728px (celular deitado), passando pelos ~404px do desktop.
 *
 * - Cada local tem uma coluna de largura igual e o ponto fica no meio dela.
 * - Os nomes ficam deitados quando cabem na coluna; senão, inclinados a 45°,
 *   cortados num limite (com reticências; o nome inteiro está na dica), e a
 *   margem esquerda cresce o bastante para o primeiro nome não sair do painel.
 * - O número fica acima do ponto. Quando o maior número não cabe na coluna, os
 *   números se alternam acima e abaixo dos pontos, para os vizinhos não se
 *   encostarem.
 */

/** Raio do ponto, em px. */
export const RAIO = 4;
// Espaço entre o ponto e o número dele.
const ESPACO_VALOR = 6;
// Folga dos lados do gráfico e entre o nome e a coluna.
const FOLGA = 4;
const SENO_45 = Math.SQRT1_2;

const limitar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);
const formato = new Intl.NumberFormat('pt-BR');

/** O número escrito no gráfico ("1.234"). */
export const textoDoValor = (total) => formato.format(total);

/** Tamanho da fonte dos nomes e números, em px: acompanha a largura, de 11 a 13. */
export const tamanhoDaFonte = (largura) => Math.round(limitar(largura * 0.032, 11, 13));

/**
 * O texto cortado com reticências para caber em `maximo` px.
 * @param {string} texto
 * @param {number} maximo
 * @param {(texto: string) => number} medir
 */
export function encurtar(texto, maximo, medir) {
  if (medir(texto) <= maximo) return texto;
  for (let fim = texto.length - 1; fim > 0; fim -= 1) {
    const curto = `${texto.slice(0, fim).trimEnd()}…`;
    if (medir(curto) <= maximo) return curto;
  }
  return '…';
}

/*
 * Margem esquerda para os nomes inclinados não passarem da borda: o nome i
 * desce para a esquerda (largura × sen 45°) a partir do ponto dele. A largura da
 * coluna depende da margem, então a conta se refaz até assentar.
 */
function margemParaInclinados(larguras, largura, fonte) {
  const n = larguras.length;
  let esquerda = FOLGA;
  for (let vez = 0; vez < 6; vez += 1) {
    const coluna = (largura - esquerda - FOLGA) / n;
    const precisa = Math.max(
      ...larguras.map((medida, i) => (medida + fonte / 2) * SENO_45 - (i + 0.5) * coluna),
    );
    esquerda = Math.max(FOLGA, Math.ceil(precisa) + 1);
  }
  return esquerda;
}

/**
 * @typedef {object} PontoDaLinha
 * @property {string} local    nome inteiro (a chave e a dica)
 * @property {string} texto    o nome escrito no eixo (talvez cortado)
 * @property {number} total
 * @property {number} x
 * @property {number} y
 * @property {number} xValor   onde o número fica (centro), sem sair do gráfico
 * @property {number} yValor   linha de base do número
 * @property {boolean} valorAbaixo
 *
 * @param {{ local: string, rotulo: string, total: number }[]} locais do maior para o menor
 * @param {number} largura largura do gráfico, em px
 * @param {(texto: string) => number} medir largura de um texto na fonte do gráfico
 * @param {number} fonte tamanho da fonte em px (tamanhoDaFonte)
 */
export function montarLinha(locais, largura, medir, fonte) {
  const n = locais.length;
  if (n === 0 || largura <= 0) return null;

  const altoTexto = Math.ceil(fonte * 1.25);
  const colunaSemMargem = (largura - 2 * FOLGA) / n;
  const deitados = locais.every(({ rotulo }) => medir(rotulo) <= colunaSemMargem - FOLGA);

  const limite = Math.round(limitar(largura * 0.3, 64, 128));
  const textos = deitados ? locais.map(({ rotulo }) => rotulo) : locais.map(({ rotulo }) => encurtar(rotulo, limite, medir));
  const larguras = textos.map(medir);
  const esquerda = deitados ? FOLGA : margemParaInclinados(larguras, largura, fonte);
  const coluna = (largura - esquerda - FOLGA) / n;

  const larguraValores = locais.map(({ total }) => medir(textoDoValor(total)));
  const alternar = n > 1 && Math.max(...larguraValores) > coluna - FOLGA;

  // De cima para baixo: o número do ponto mais alto, a área dos pontos, o espaço
  // dos números de baixo (quando alternam), o eixo e os nomes.
  const topo = altoTexto + RAIO + ESPACO_VALOR;
  const alturaPontos = Math.round(limitar(largura * 0.4, 130, 190));
  const zero = topo + alturaPontos;
  const eixo = zero + (alternar ? altoTexto + RAIO + ESPACO_VALOR : RAIO + FOLGA);
  const alturaNomes = deitados
    ? altoTexto + 8
    : Math.ceil(Math.max(...larguras) * SENO_45 + fonte * SENO_45) + 10;

  const maximo = Math.max(1, ...locais.map(({ total }) => total));
  const pontos = locais.map(({ local, total }, i) => {
    const x = esquerda + coluna * (i + 0.5);
    const y = zero - (alturaPontos * total) / maximo;
    const valorAbaixo = alternar && i % 2 === 1;
    const meia = larguraValores[i] / 2;
    return {
      local,
      texto: textos[i],
      total,
      x,
      y,
      xValor: limitar(x, meia, largura - meia),
      // A linha de base do texto: acima, fica a ESPACO_VALOR do ponto; abaixo, a altura do texto mais isso.
      yValor: valorAbaixo ? y + RAIO + ESPACO_VALOR + fonte * 0.8 : y - RAIO - ESPACO_VALOR,
      valorAbaixo,
    };
  });

  const linha = pontos.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const primeiro = pontos[0];
  const ultimo = pontos.at(-1);
  const area = `${linha} L${ultimo.x.toFixed(1)} ${zero} L${primeiro.x.toFixed(1)} ${zero} Z`;

  return {
    altura: eixo + alturaNomes,
    eixo,
    esquerda,
    coluna,
    deitados,
    alternar,
    // Onde os nomes começam: logo abaixo do eixo.
    yNomes: eixo + 8,
    pontos,
    linha,
    area,
  };
}
