/*
 * Nome curto dos locais (o campo Local do ticket) para os gráficos. Os nomes de
 * cartório são longos ("1º Tabelião de Notas e Protesto de Letra e Títulos de
 * Amparo"), então os termos comuns viram abreviações e o complemento depois do
 * nome ("- Tabelião Oliveira Lima", "(Cartório Pires)") sai. O nome inteiro
 * continua na dica do gráfico.
 */

/** Até este tamanho, o nome fica como veio. */
export const LETRAS_SEM_ABREVIAR = 24;

// Na ordem: as expressões maiores antes das que elas contêm.
const ABREVIACOES = [
  [/\bTabeli[aã]o de No[rt]as e (?:de )?Protestos? de Letras? e T[ií]tulos\b/giu, 'Tab. Notas e Prot.'],
  [/\bOf[ií]cio de Registro Civil e Tabelionato de Notas\b/giu, 'Of. RC e Tab. Notas'],
  [/\bRegistro Civil e Tabelionato de Notas\b/giu, 'RC e Tab. Notas'],
  [/\bTabeli[aã]o de Notas\b/giu, 'Tab. Notas'],
  [/\bCart[oó]rio de Notas\b/giu, 'Cart. Notas'],
  [/\bCart[oó]rio\b/giu, 'Cart.'],
  [/\bInstituto de Previd[eê]ncia\b/giu, 'Inst. Previd.'],
];

// O "de" que liga a abreviação à cidade: "Tab. Notas de Piracicaba" -> "Tab. Notas Piracicaba".
const LIGACAO = /(Tab\. Notas(?: e Prot\.)?|Cart\. Notas|Cart\.) de /giu;

// Complemento do nome: " - Tabelião Oliveira Lima" ou " (Rua Prudente)". Curto ("- Empro"), ele fica.
const COMPLEMENTO = /\s+(?:-\s+(?<traco>.+)|\((?<parenteses>[^)]+)\))$/u;
const COMPLEMENTO_CURTO = 8;

function semComplemento(nome) {
  const achado = nome.match(COMPLEMENTO);
  if (!achado) return nome;
  const complemento = achado.groups.traco ?? achado.groups.parenteses;
  return complemento.length > COMPLEMENTO_CURTO ? nome.slice(0, achado.index) : nome;
}

/**
 * @param {string} nome o campo Local do ticket
 * @returns {string} o nome curto; o próprio nome quando ele já é curto
 */
export function abreviarLocal(nome) {
  if (nome.length <= LETRAS_SEM_ABREVIAR) return nome;
  const abreviado = ABREVIACOES.reduce((texto, [termo, curto]) => texto.replace(termo, curto), semComplemento(nome));
  return abreviado.replace(LIGACAO, '$1 ').replace(/\s+/g, ' ').trim();
}

/**
 * O nome curto de cada local. Se dois locais diferentes ficarem com o mesmo nome
 * curto, os dois ficam com o nome inteiro, para não se confundirem no gráfico.
 * @param {string[]} locais
 * @returns {Map<string, string>} local -> nome curto
 */
export function nomesCurtos(locais) {
  const curtos = new Map([...new Set(locais)].map((local) => [local, abreviarLocal(local)]));
  const usos = new Map();
  for (const curto of curtos.values()) usos.set(curto, (usos.get(curto) ?? 0) + 1);
  return new Map([...curtos].map(([local, curto]) => [local, usos.get(curto) > 1 ? local : curto]));
}
