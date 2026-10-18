/*
 * Geometria da pizza do painel do quadro: fatias e rótulos. Tudo em pixels da
 * tela (o SVG tem a largura medida do gráfico), para o texto sair sempre do
 * mesmo tamanho. Os ângulos partem do topo (0) e crescem no sentido horário; um
 * ponto a `r` do centro no ângulo `a` fica em (cx + r·sen a, cy − r·cos a).
 */

/** Altura de uma linha de rótulo, para o texto de 11px. */
export const ALTURA_LINHA = 13;
/** O círculo não passa disso, mesmo com espaço sobrando… */
export const RAIO_MAX = 76;
/** …e não fica menor que isso: antes, os rótulos quebram em linhas. */
export const RAIO_MIN = 46;
// Numa largura menor que a de qualquer painel, os rótulos não cabem, mas o círculo continua um círculo.
const RAIO_PISO = 12;

// Respiro mínimo entre dois rótulos do mesmo lado.
const VAO_ROTULOS = 5;
// Da borda do círculo até o texto, e do texto até a borda do gráfico.
const AFASTAMENTO = 16;
const MARGEM = 4;
// Acima e abaixo do círculo.
const MARGEM_VERTICAL = 14;
// Quanto a fatia sob o mouse se afasta do centro (px).
const SALTO = 3;
const VOLTA = Math.PI * 2;

/**
 * @typedef {object} ItemPizza
 * @property {string} chave   identidade da fatia (id do desenvolvedor, nome da categoria)
 * @property {string} rotulo  texto do rótulo
 * @property {number} valor
 * @property {string} cor
 */

/**
 * Porcentagens inteiras que somam 100: cada valor fica com o piso e as
 * unidades que faltam vão para os maiores restos (no empate, o primeiro).
 * @param {number[]} valores
 */
export function percentuais(valores) {
  const total = valores.reduce((soma, valor) => soma + valor, 0);
  if (total <= 0) return valores.map(() => 0);

  const brutos = valores.map((valor) => (valor / total) * 100);
  const pisos = brutos.map(Math.floor);
  const faltam = 100 - pisos.reduce((soma, valor) => soma + valor, 0);
  const ganham = new Set(
    brutos
      .map((bruto, i) => ({ resto: bruto - pisos[i], i }))
      .toSorted((a, b) => b.resto - a.resto || a.i - b.i)
      .slice(0, faltam)
      .map(({ i }) => i),
  );
  return pisos.map((piso, i) => piso + (ganham.has(i) ? 1 : 0));
}

/** "12%"; fatia com chamado que arredonda para zero vira "<1%". */
export const textoPercentual = (valor, percentual) => (valor > 0 && percentual === 0 ? '<1%' : `${percentual}%`);

/**
 * As fatias com valor, em sequência a partir do topo.
 * @param {ItemPizza[]} itens
 */
export function fatiar(itens) {
  const comValor = itens.filter(({ valor }) => valor > 0);
  const total = comValor.reduce((soma, { valor }) => soma + valor, 0);
  const porcentos = percentuais(comValor.map(({ valor }) => valor));

  let acumulado = 0;
  return comValor.map((item, i) => {
    const inicio = (acumulado / total) * VOLTA;
    acumulado += item.valor;
    const fim = i === comValor.length - 1 ? VOLTA : (acumulado / total) * VOLTA;
    return { ...item, inicio, fim, meio: (inicio + fim) / 2, percentual: porcentos[i] };
  });
}

/**
 * Afasta posições (já em ordem) até ficarem a `minimo` umas das outras, dentro
 * de [topo, base], mexendo o mínimo possível: desce o que encosta e, se a
 * última passar da base, sobe o grupo de baixo para cima.
 * @param {number[]} desejados
 */
export function espalhar(desejados, minimo, topo, base) {
  const ys = [];
  desejados.forEach((desejado, i) => {
    ys.push(Math.max(Math.min(desejado, base), i === 0 ? topo : ys[i - 1] + minimo));
  });
  if (ys.length > 0 && ys.at(-1) > base) {
    ys[ys.length - 1] = base;
    for (let i = ys.length - 2; i >= 0; i -= 1) ys[i] = Math.min(ys[i], ys[i + 1] - minimo);
  }
  return ys;
}

// Quebra o texto nas palavras para nenhuma linha passar do limite.
function quebrar(texto, medir, limite) {
  return texto.split(' ').reduce((linhas, palavra) => {
    const juntas = linhas.length > 0 ? `${linhas.at(-1)} ${palavra}` : null;
    return juntas !== null && medir(juntas) <= limite ? [...linhas.slice(0, -1), juntas] : [...linhas, palavra];
  }, []);
}

const larguraMaior = (linhas, medir) => Math.max(0, ...linhas.flat().map(medir));

/*
 * O texto de cada rótulo e o raio do círculo. Os rótulos ficam dos dois lados,
 * então o círculo leva o que sobra da largura. Se, com rótulos de uma linha,
 * ele ficaria pequeno demais, os rótulos compridos quebram nas palavras.
 */
function linhasERaio(textos, largura, medir) {
  const disponivel = largura / 2 - AFASTAMENTO - MARGEM;
  const umaLinha = textos.map((texto) => [texto]);
  const raio = disponivel - larguraMaior(umaLinha, medir);
  if (raio >= RAIO_MIN) return { linhas: umaLinha, raio: Math.min(raio, RAIO_MAX) };

  const quebradas = textos.map((texto) => quebrar(texto, medir, disponivel - RAIO_MIN));
  const raioQuebrado = disponivel - larguraMaior(quebradas, medir);
  return { linhas: quebradas, raio: Math.min(Math.max(raioQuebrado, RAIO_PISO), RAIO_MAX) };
}

const ponto = (cx, cy, raio, angulo) => [cx + raio * Math.sin(angulo), cy - raio * Math.cos(angulo)];
const xy = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;

// Distância do ponto P ao segmento AB.
function distanciaAoSegmento([px, py], [ax, ay], [bx, by]) {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.min(Math.max(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0), 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/*
 * A linha da fatia até o rótulo: sai da borda e vai reto até ele. Quando os
 * rótulos se amontoam e um deles é empurrado para longe da fatia, a reta
 * cortaria o círculo; aí ela contorna, por fora, pela coluna ao lado dos rótulos.
 */
function tracarGuia(angulo, { cx, cy, raio }, [x, y], direita) {
  const borda = ponto(cx, cy, raio + 2, angulo);
  const cotovelo = ponto(cx, cy, raio + 8, angulo);
  const fim = [x + (direita ? -4 : 4), y];
  if (distanciaAoSegmento([cx, cy], cotovelo, fim) >= raio + 2) return [borda, cotovelo, fim];
  const coluna = cx + (direita ? 1 : -1) * (raio + 10);
  return [borda, cotovelo, [coluna, cotovelo[1]], [coluna, y], fim];
}

/**
 * Tudo o que o SVG desenha, para a largura dada.
 *
 * @param {object} opcoes
 * @param {ItemPizza[]} opcoes.itens
 * @param {number} opcoes.largura largura do gráfico, em px
 * @param {(texto: string) => number} opcoes.medir largura de um texto do rótulo, em px
 */
export function montarPizza({ itens, largura, medir }) {
  const fatias = fatiar(itens);
  const textos = fatias.map(({ rotulo, valor, percentual }) => `${rotulo} (${textoPercentual(valor, percentual)})`);
  const { linhas, raio } = linhasERaio(textos, largura, medir);
  const alturaRotulo = Math.max(1, ...linhas.map((texto) => texto.length)) * ALTURA_LINHA + VAO_ROTULOS;

  // Uma fatia só tem o rótulo à direita, na altura do centro.
  const sozinha = fatias.length === 1;
  const lados = fatias.map(({ meio }) => (sozinha || meio <= Math.PI ? 'direita' : 'esquerda'));
  const maisCheio = Math.max(...['direita', 'esquerda'].map((lado) => lados.filter((l) => l === lado).length));
  const altura = Math.max(2 * (raio + MARGEM_VERTICAL), maisCheio * alturaRotulo);
  const cx = largura / 2;
  const cy = altura / 2;

  const desejados = fatias.map(({ meio }) => (sozinha ? cy : cy - (raio + AFASTAMENTO / 2) * Math.cos(meio)));
  const ys = new Array(fatias.length);
  for (const lado of ['direita', 'esquerda']) {
    const indices = fatias.map((_, i) => i).filter((i) => lados[i] === lado);
    indices.sort((a, b) => desejados[a] - desejados[b]);
    const espalhados = espalhar(
      indices.map((i) => desejados[i]),
      alturaRotulo,
      alturaRotulo / 2,
      altura - alturaRotulo / 2,
    );
    indices.forEach((indice, posicao) => {
      ys[indice] = espalhados[posicao];
    });
  }

  return {
    largura,
    altura,
    cx,
    cy,
    raio,
    alturaRotulo,
    fatias: fatias.map((fatia, i) => {
      const direita = lados[i] === 'direita';
      const x = cx + (direita ? 1 : -1) * (raio + AFASTAMENTO);
      const y = ys[i];
      // A fatia sozinha liga o rótulo pelo lado, e não pelo meio dela (que fica embaixo).
      const guia = tracarGuia(sozinha ? Math.PI / 2 : fatia.meio, { cx, cy, raio }, [x, y], direita);
      return {
        ...fatia,
        caminho: caminhoFatia(fatia, { cx, cy, raio }),
        guia: `M${guia.map(xy).join(' L')}`,
        etiqueta: { lado: lados[i], x, y, linhas: linhas[i] },
        // Para onde a fatia salta no hover: para fora, pelo meio dela (a sozinha não tem para onde ir).
        salto: sozinha ? [0, 0] : [SALTO * Math.sin(fatia.meio), -SALTO * Math.cos(fatia.meio)],
      };
    }),
  };
}

/**
 * Contorno da fatia: o que é pintado e a área do mouse.
 * @param {{ inicio: number, fim: number }} fatia
 * @param {{ cx: number, cy: number, raio: number }} centro
 */
export function caminhoFatia({ inicio, fim }, { cx, cy, raio }) {
  if (fim - inicio >= VOLTA - 1e-9) {
    return `M${xy([cx, cy - raio])} A${raio} ${raio} 0 1 1 ${xy([cx, cy + raio])} A${raio} ${raio} 0 1 1 ${xy([cx, cy - raio])}Z`;
  }
  const grande = fim - inicio > Math.PI ? 1 : 0;
  return `M${xy([cx, cy])} L${xy(ponto(cx, cy, raio, inicio))} A${raio} ${raio} 0 ${grande} 1 ${xy(ponto(cx, cy, raio, fim))}Z`;
}
