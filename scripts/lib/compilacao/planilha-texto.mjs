// Pequenas funções de texto do importador: erro com mensagem, endereço de
// célula, nome de aba, nome de cidade e leitura de números inteiros.

export class ErroPlanilha extends Error {}

const MESES = ['JANEIRO', 'FEVEREIRO', 'MARCO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos']);

/** Sem acento, maiúsculo, espaços juntos e sem sobra nas pontas. */
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

export const nomeDoMes = (mes) => MESES[mes - 1];

export function letraDaColuna(coluna) {
  let resto = coluna;
  let letras = '';
  while (resto > 0) {
    letras = String.fromCharCode(65 + ((resto - 1) % 26)) + letras;
    resto = Math.floor((resto - 1) / 26);
  }
  return letras;
}

export const endereco = (linha, coluna) => `${letraDaColuna(coluna)}${linha}`;

/** @returns {{ mes: number, ano: number } | null} */
export function identificarAba(nome) {
  const m = /^([A-Z]+)\s*-?\s*(\d{2}|\d{4})$/.exec(normalizar(nome));
  const mes = m ? MESES.indexOf(m[1]) + 1 : 0;
  if (!mes) return null;
  return { mes, ano: m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]) };
}

function capitalizar(texto) {
  return texto
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L}+)/gu, (_, antes, palavra) =>
      antes === ' ' && PARTICULAS.has(palavra) ? antes + palavra : antes + palavra[0].toUpperCase() + palavra.slice(1),
    );
}

/** Nome da cidade como vem da planilha ("CIDADE A-SP (nota)") para cidade, UF e situação. */
export function lerNomeDaCidade(bruto) {
  let texto = String(bruto ?? '').replace(/\s+/g, ' ').trim();
  const saiu = /N[ÃA]O [ÉE] MAIS CLIENTE/i.test(texto);
  texto = texto
    .replace(/N[ÃA]O [ÉE] MAIS CLIENTE/i, '')
    .replace(/\(.*$/, '')
    .split(/\s+tipo\s+/i)[0]
    .replace(/[\s-]+$/, '')
    .trim();
  const m = /-\s*([A-Z]{2})$/.exec(texto);
  const uf = m && UFS.has(m[1]) ? m[1] : '';
  if (uf) texto = texto.slice(0, m.index).trim();
  const cidade = texto === texto.toUpperCase() ? capitalizar(texto) : texto;
  return { cidade, uf, status: saiu ? 'saiu' : 'ativa' };
}

/**
 * Inteiro >= 0 de uma célula de TOTAL/DÉFICIT. Vazio vale 0; só espaços vale 0 com aviso.
 * @returns {number}
 */
export function lerInteiro(celula, ondeEsta, avisos) {
  const { valor } = celula;
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === 'string' && valor.trim() === '') {
    avisos.push(`${ondeEsta}: texto vazio tratado como 0.`);
    return 0;
  }
  if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 0) return valor;
  throw new ErroPlanilha(`${ondeEsta}: esperava um número inteiro, 0 ou maior.`);
}
