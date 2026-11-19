/*
 * Seletores que o cursor customizado consulta a cada troca de alvo do ponteiro.
 * ZONA_NATIVA precisa bater com a regra `cursor: none` de src/styles/global.css:
 * lá, ela esconde o cursor nativo em tudo, MENOS nestas zonas.
 */

// Classe posta no <html> enquanto o cursor customizado está ativo.
export const CLASSE_ATIVO = 'cursor-customizado';

// Campos de digitação: o I-beam nativo mostra onde o texto entra.
const CAMPOS_TEXTO = [
  'input:not([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"])',
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
];

// `:modal` existe desde 2022; num navegador sem ele, o closest() lançaria erro.
const suportaModal = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('selector(:modal)');

/*
 * Onde o cursor customizado some e o nativo volta:
 * - `[data-cursor="nativo"]`: contrato com a tela do computador da seção Sistemas;
 * - `dialog:modal`: o <dialog> aberto com showModal() fica na top layer, acima
 *   de qualquer elemento fixed, então o cursor customizado ficaria por baixo;
 * - campos de texto.
 */
export const zonaNativa = () =>
  ['[data-cursor="nativo"]', ...(suportaModal() ? ['dialog:modal'] : []), ...CAMPOS_TEXTO].join(
    ', ',
  );

// Alvos clicáveis: o disco recolhe e o ponto cresce. `data-cursor="link"`
// marca à mão o que for clicável sem ser um elemento interativo nativo.
export const ALVO_INTERATIVO = [
  'a[href]',
  'button:not(:disabled)',
  'select:not(:disabled)',
  'summary',
  'label[for]',
  'input:is([type="button"], [type="submit"], [type="reset"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="file"], [type="image"]):not(:disabled)',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="option"]',
  '[data-cursor="link"]',
].join(', ');
