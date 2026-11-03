// Tipos de norma do Legislação Digital (ModulosNorma) e os "baldes" dos cards.
//
// Os baldes são as 6 chaves de TIPOS_DE_NORMA (src/pages/Compilacao/dados.js)
// mais "outros". CUIDADO: no sistema a sigla `L` é "Lei do Legislativo" (41),
// e NÃO Lei Ordinária (23); por isso tudo aqui é por moduloId, nunca por sigla.

export const BALDES = ['leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros'];

// A confirmar em F0: o nome e a sigla de 53, 54 e 56 e dos demais módulos (o
// sistema tem 31). Na execução, prefira montar o catálogo com
// catalogoDeModulos(await ModulosNorma/Get): o nome vem do próprio sistema.
export const CATALOGO = Object.freeze([
  { id: 21, sigla: 'atm', nomeSingular: 'Ato da Mesa' },
  { id: 22, sigla: 'atp', nomeSingular: 'Ato da Presidência' },
  { id: 23, sigla: 'lo', nomeSingular: 'Lei Ordinária' },
  { id: 24, sigla: 'lc', nomeSingular: 'Lei Complementar' },
  { id: 25, sigla: 'dl', nomeSingular: 'Decreto Legislativo' },
  { id: 26, sigla: 'dm', nomeSingular: 'Decreto Municipal' },
  { id: 27, sigla: 'elom', nomeSingular: 'Emenda à Lei Orgânica' },
  { id: 28, sigla: 'res', nomeSingular: 'Resolução' },
  { id: 29, sigla: 'ptr', nomeSingular: 'Portaria' },
  { id: 31, sigla: null, nomeSingular: 'Lei Orgânica' },
  { id: 41, sigla: 'l', nomeSingular: 'Lei do Legislativo' },
  { id: 51, sigla: 'rsefin', nomeSingular: 'Resolução SEFIN' },
]);

const BALDE_POR_MODULO = new Map([
  [23, 'leis'],
  [26, 'decretos'],
  [25, 'decretos'],
  [53, 'decretos'],
  [28, 'resolucoes'],
  [51, 'resolucoes'],
  [54, 'resolucoes'],
  [56, 'resolucoes'],
  [29, 'portarias'],
  [24, 'complementares'],
  [27, 'emendas'],
]);

/** Balde do card de um moduloId; qualquer outro (ou inválido) vai para "outros". */
export const baldeDoModulo = (moduloId) => BALDE_POR_MODULO.get(moduloId) ?? 'outros';

// Minúsculas, sem acento, espaços simples.
export const normalizar = (texto) =>
  String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Catálogo a partir da lista de ModulosNorma/Get ({ id, sigla, nomeSingular }). */
export const catalogoDeModulos = (modulos) =>
  (Array.isArray(modulos) ? modulos : [])
    .filter((m) => m && Number.isInteger(m.id) && typeof m.nomeSingular === 'string' && m.nomeSingular.trim())
    .map((m) => ({ id: m.id, sigla: m.sigla ?? null, nomeSingular: m.nomeSingular }));

const PREFIXOS = /^\s*(?:(?:altera|revoga|prorroga|relacionada|regulamenta)\s*:\s*)+/i;
// O tipo vai até " nº" (aceita º, ° ou o).
const ATE_NUMERO = /^(.*?)\s+n[º°o]\.?(?=\s|\d)/i;

// O tipo e o número estão sempre no começo da descrição. Cortar antes evita que um
// texto enorme (ex.: milhares de espaços) deixe as expressões lentas.
export const MAX_DESCRICAO = 300;

/** Só o nome do tipo (antes de " nº"), sem prefixo "altera:" etc.; null se não achar. */
export function nomeDoTipo(descricao) {
  if (typeof descricao !== 'string') return null;
  const casou = descricao.slice(0, MAX_DESCRICAO).replace(PREFIXOS, '').match(ATE_NUMERO);
  return casou ? casou[1] : null;
}

/** moduloId do tipo que abre a descrição da Auditoria, ou null se desconhecido. */
export function tipoDaDescricao(descricao, catalogo = CATALOGO) {
  const nome = nomeDoTipo(descricao);
  if (!nome) return null;
  const alvo = normalizar(nome);
  return catalogo.find((t) => normalizar(t.nomeSingular) === alvo)?.id ?? null;
}
