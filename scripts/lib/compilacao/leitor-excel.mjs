// Lê um .xlsx com o exceljs e devolve um modelo simples, só com o que o
// importador usa: texto, trechos com cor, fórmula e valor guardado, preenchimento
// e mesclagem. O resto do importador (planilha.mjs) trabalha só sobre esse modelo,
// então os testes podem montar planilhas sintéticas e passar por aqui.
import ExcelJS from 'exceljs';

const SALMAO = 'FFFBE4D5';

/**
 * @typedef {{
 *   valor: string | number | boolean | Date | null,
 *   texto: string,
 *   trechos: { texto: string, vermelho: boolean }[],
 *   formula: string | null,
 *   fundo: 'vermelho' | 'salmao' | null,
 *   escrava: boolean,
 * }} Celula
 * @typedef {{ nome: string, ultimaLinha: number, ultimaColuna: number, celula: (linha: number, coluna: number) => Celula }} Aba
 */

// Vermelho de verdade (FFFF0000, C00000...), não marrom nem rosa.
export function ehVermelho(cor) {
  const argb = cor?.argb;
  if (typeof argb !== 'string' || argb.length !== 8) return false;
  const [r, g, b] = [2, 4, 6].map((i) => parseInt(argb.slice(i, i + 2), 16));
  return r >= 0xc0 && g <= 0x60 && b <= 0x60;
}

function fundoDe(celula) {
  const { fill } = celula;
  if (fill?.type !== 'pattern' || fill.pattern !== 'solid') return null;
  if (fill.fgColor?.argb === SALMAO) return 'salmao';
  return ehVermelho(fill.fgColor) ? 'vermelho' : null;
}

function lerValor(bruto) {
  if (bruto && typeof bruto === 'object' && !(bruto instanceof Date)) {
    if ('richText' in bruto) return { valor: bruto.richText.map((t) => t.text).join(''), formula: null };
    if ('formula' in bruto || 'sharedFormula' in bruto) {
      const { result } = bruto;
      const util = typeof result === 'number' || typeof result === 'string' ? result : null;
      return { valor: util, formula: bruto.formula ?? bruto.sharedFormula ?? '' };
    }
    if ('text' in bruto) return { valor: String(bruto.text?.richText ? bruto.text.richText.map((t) => t.text).join('') : bruto.text), formula: null };
    return { valor: null, formula: null };
  }
  return { valor: bruto ?? null, formula: null };
}

function trechosDe(celula, texto) {
  const bruto = celula.value;
  if (bruto && typeof bruto === 'object' && 'richText' in bruto) {
    const inteira = ehVermelho(celula.font?.color);
    return bruto.richText.map((t) => ({ texto: t.text, vermelho: t.font?.color ? ehVermelho(t.font.color) : inteira }));
  }
  return texto ? [{ texto, vermelho: ehVermelho(celula.font?.color) }] : [];
}

/** @returns {Celula} */
function converterCelula(celula) {
  const escrava = celula.isMerged && celula.master.address !== celula.address;
  if (escrava) return { valor: null, texto: '', trechos: [], formula: null, fundo: null, escrava: true };
  const lido = lerValor(celula.value);
  // Numa fórmula compartilhada, a célula filha só guarda o endereço da mestra
  // (ex.: "G170"); `celula.formula` do exceljs devolve a fórmula já traduzida
  // para a coluna da filha (ex.: "SUM(H4:H169)").
  const formula = lido.formula === null ? null : (celula.formula ?? lido.formula);
  const { valor } = lido;
  const texto = typeof valor === 'string' ? valor : '';
  return { valor, texto, trechos: trechosDe(celula, texto), formula, fundo: fundoDe(celula), escrava: false };
}

function converterAba(planilha) {
  const cache = new Map();
  return {
    nome: planilha.name,
    ultimaLinha: planilha.rowCount,
    ultimaColuna: planilha.columnCount,
    celula(linha, coluna) {
      const id = linha * 1000 + coluna;
      if (!cache.has(id)) cache.set(id, converterCelula(planilha.getCell(linha, coluna)));
      return cache.get(id);
    },
  };
}

/** @param {string} caminho @returns {Promise<{ abas: Aba[] }>} */
export async function lerArquivoExcel(caminho) {
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.readFile(caminho);
  return { abas: livro.worksheets.map(converterAba) };
}
