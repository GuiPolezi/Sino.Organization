// Tradução das siglas das planilhas de Atualizações para o tipo do sistema.
// Sigla fora da tabela é erro de propósito: obriga alguém a decidir (I16).
// Atenção: `L` na planilha é Lei Ordinária (23). No sistema, 41 é "Lei do Legislativo".

const LEIS = 'leis';
const DECRETOS = 'decretos';
const OUTROS = 'outros';

const SEM_SINAL = { sigla_duvidosa: false, nao_municipal: false };
const DUVIDOSA = { sigla_duvidosa: true, nao_municipal: false };
const NAO_MUNICIPAL = { sigla_duvidosa: false, nao_municipal: true };

const TABELA = new Map([
  ['L', { moduloId: 23, balde: LEIS, flags: SEM_SINAL }],
  ['LC', { moduloId: 24, balde: 'complementares', flags: SEM_SINAL }],
  ['D', { moduloId: 26, balde: DECRETOS, flags: SEM_SINAL }],
  ['DL', { moduloId: 25, balde: DECRETOS, flags: SEM_SINAL }],
  ['ELOM', { moduloId: 27, balde: 'emendas', flags: SEM_SINAL }],
  ['R', { moduloId: 28, balde: 'resolucoes', flags: SEM_SINAL }],
  ['R SEFIN', { moduloId: 51, balde: 'resolucoes', flags: SEM_SINAL }],
  ['P', { moduloId: 29, balde: 'portarias', flags: SEM_SINAL }],
  ['AM', { moduloId: 21, balde: OUTROS, flags: SEM_SINAL }],
  ['AP', { moduloId: 22, balde: OUTROS, flags: SEM_SINAL }],
  // Decisão D8: "Outros" com sinal, até a equipe dizer o que são.
  ['AM/ELOM', { moduloId: null, balde: OUTROS, flags: DUVIDOSA }],
  ['LL', { moduloId: null, balde: OUTROS, flags: DUVIDOSA }],
  // Deliberações dos comitês de bacia (bloco PCJ da Nathalia): não são municipais.
  ['CHB-PCJ', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['CBH-PJ1', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['CHB-PJ1', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['CONJUNTA CHB-PCJ - PCJ FEDERAL - CBH-PJ1', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['CONJUNTA CHB-PCJ / PCJ FEDERAL', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['COMITES PCJ', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
  ['PCJ-FEDERAL', { moduloId: null, balde: OUTROS, flags: NAO_MUNICIPAL }],
]);

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * @param {unknown} sigla texto da planilha (com espaços e caixa como vier)
 * @returns {{ moduloId: number | null, balde: string, flags: { sigla_duvidosa: boolean, nao_municipal: boolean } }}
 */
export function traduzirSigla(sigla) {
  const chave = normalizar(sigla);
  if (!chave) throw new Error('Sigla vazia.');
  const achada = TABELA.get(chave);
  if (!achada) throw new Error(`Sigla desconhecida na planilha: "${chave}". Defina o tipo em siglas.mjs.`);
  return { ...achada, flags: { ...achada.flags } };
}

/** A sigla da linha é a de C (Diário Oficial); se C for "-" ou vazia, a de E (SISCAM). */
export function escolherSigla(c, e) {
  const limpar = (v) => String(v ?? '').trim();
  const doC = limpar(c);
  if (doC && doC !== '-') return doC;
  const doE = limpar(e);
  return doE === '-' ? '' : doE;
}
