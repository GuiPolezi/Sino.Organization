// Só para os testes: gera um .xlsx sintético (cidades e números inventados) com
// o mesmo esqueleto das planilhas reais, para exercitar os três layouts.
import path from 'node:path';
import ExcelJS from 'exceljs';

const VERMELHO = { argb: 'FFFF0000' };

export const LAYOUTS = {
  damaris: { totalColuna: 'B', totalTexto: 'Total', formulaInicio: 2, cabecalhoJ: 'SISCAM ' },
  gdressano: { totalColuna: 'A', totalTexto: 'TOTAL', formulaInicio: 4, cabecalhoJ: 'SISCAM' },
  nathalia: { totalColuna: 'B', totalTexto: 'TOTAL', formulaInicio: 4, cabecalhoJ: 'SISCAM' },
};

// Texto simples, ou lista de [texto, vermelho?] para texto formatado.
function valorDe(entrada) {
  if (!Array.isArray(entrada)) return entrada;
  return { richText: entrada.map(([text, vermelho]) => ({ text, font: vermelho ? { color: VERMELHO } : { color: { theme: 1 } } })) };
}

function escrever(aba, endereco, entrada, { vermelho = false, fundo = null } = {}) {
  if (entrada === undefined && !fundo) return;
  const celula = aba.getCell(endereco);
  if (entrada !== undefined) celula.value = valorDe(entrada);
  if (vermelho) celula.font = { color: VERMELHO };
  if (fundo) celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fundo } };
}

function cabecalho(aba, layout, def) {
  escrever(aba, 'A1', def.titulo);
  aba.mergeCells('A1:J1');
  escrever(aba, 'A2', def.periodo);
  const textos = { A3: 'N°', B3: 'CLIENTE', C3: 'DIÁRIO OFICIAL', E3: 'SISCAM', G3: 'DÉFICIT', H3: 'TOTAL', I3: 'ÚLTIMA ED. DO D.O.', J3: layout.cabecalhoJ };
  for (const [endereco, texto] of Object.entries(textos)) escrever(aba, endereco, texto);
  aba.mergeCells('C3:D3');
  aba.mergeCells('E3:F3');
}

function linhaDeTipo(aba, r, l) {
  escrever(aba, `C${r}`, l.c, { vermelho: l.siglaVermelha });
  escrever(aba, `D${r}`, l.d);
  escrever(aba, `E${r}`, l.e, { vermelho: l.siglaVermelha });
  escrever(aba, `F${r}`, l.f);
  escrever(aba, `G${r}`, l.g, { fundo: l.gVermelho ? 'FFFF0000' : null });
  escrever(aba, `H${r}`, l.h);
  escrever(aba, `I${r}`, l.i);
  escrever(aba, `J${r}`, l.j);
  if (l.mesclarComProxima) for (const col of ['C', 'G', 'H']) aba.mergeCells(`${col}${r}:${col}${r + 1}`);
}

function bloco(aba, inicio, b) {
  b.linhas.forEach((l, i) => linhaDeTipo(aba, inicio + i, l));
  const fim = inicio + b.linhas.length - 1;
  escrever(aba, `A${inicio}`, b.numero);
  escrever(aba, `B${inicio}`, b.cidade);
  if (fim > inicio) {
    aba.mergeCells(`A${inicio}:A${fim}`);
    aba.mergeCells(`B${inicio}:B${fim}`);
  }
  return fim + 1;
}

const soma = (blocos, campo) =>
  blocos.flatMap((b) => b.linhas).reduce((acc, l) => acc + (typeof l[campo] === 'number' ? l[campo] : 0), 0);

function linhaTotal(aba, r, layout, def) {
  const { totalColuna, totalTexto, formulaInicio } = layout;
  escrever(aba, `${totalColuna}${r}`, totalTexto);
  const fim = r - 1;
  const g = def.totalG ?? soma(def.blocos, 'g');
  const h = def.totalH ?? soma(def.blocos, 'h');
  aba.getCell(`G${r}`).value = { formula: `SUM(G4:G${fim})`, result: g };
  aba.getCell(`H${r}`).value = { formula: `SUM(H${formulaInicio}:H${fim})`, result: h };
}

/** Escreve o .xlsx em `pasta` e devolve o caminho. */
export async function gerarArquivo(pasta, nome, { layout, abas }) {
  const livro = new ExcelJS.Workbook();
  for (const def of abas) {
    const aba = livro.addWorksheet(def.nome);
    cabecalho(aba, layout, def);
    let r = 4;
    for (const b of def.blocos) r = bloco(aba, r, b);
    linhaTotal(aba, r, layout, def);
    for (const [endereco, valor] of Object.entries(def.extras ?? {})) escrever(aba, endereco, valor);
  }
  const caminho = path.join(pasta, nome);
  await livro.xlsx.writeFile(caminho);
  return caminho;
}
