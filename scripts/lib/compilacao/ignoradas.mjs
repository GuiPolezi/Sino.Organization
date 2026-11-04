// Projetos Novos: normas sem versão que não serão compiladas e, por isso, ficam
// fora do "aguardando compilação" (decisão do líder, 04/11/2026). Basta UMA regra:
// - situação "Eficácia prejudicada" (ou a caixa "Eficácia Prejudicada" marcada);
// - classificação "Finanças e orçamento público" (só esse nome; "Finanças e
//   orçamento" e as combinações com outros assuntos continuam contando);
// - observações ou ementa/assunto dizendo que o arquivo está ilegível ou corrompido.
// Tudo pelo nome, sem acento e sem diferença de maiúsculas, com os campos que a
// listagem de Normas/Get já traz: nenhum id fixo e nenhum pedido a mais.

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const SITUACAO = 'eficacia prejudicada';
const CLASSIFICACAO = 'financas e orcamento publico';

// "ilegível" é marca do arquivo por si só; "danificado" e "não abre" só valem
// perto de arquivo/PDF/documento (sozinhos falam de muro, hidrômetro, "não abre mão").
const ILEGIVEL = /\bilegive(?:l|is)\b/;
const CORROMPIDO = /\bcorrompid[oa]s?\b/;
const ARQUIVO = '(?:arquivo|pdf|documento|anexo|imagem|texto)s?';
const DEFEITO = '(?:danificad[oa]s?|nao abre|nao abrem|nao abriu)';
const PERTO = '(?:\\W+\\w+){0,3}?\\W+';
const ARQUIVO_COM_DEFEITO = new RegExp(`\\b${ARQUIVO}${PERTO}${DEFEITO}\\b|\\b${DEFEITO}${PERTO}${ARQUIVO}\\b`);

/** O texto livre diz que o arquivo está ilegível, corrompido, danificado ou não abre? */
export function textoIndicaArquivoRuim(texto) {
  const t = normalizar(texto);
  return t !== '' && (ILEGIVEL.test(t) || CORROMPIDO.test(t) || ARQUIVO_COM_DEFEITO.test(`${t} `));
}

/** Quais regras a norma (item da listagem de Normas/Get) aciona. */
export function motivosDaNorma(norma) {
  return {
    situacao: normalizar(norma?.situacaoSingular) === SITUACAO || norma?.eficaciaPrejudicada === true,
    classificacao: normalizar(norma?.classificacao) === CLASSIFICACAO,
    texto: textoIndicaArquivoRuim(norma?.observacoes) || textoIndicaArquivoRuim(norma?.ementaAssunto),
  };
}

// Campos que a regra lê. Se a listagem deixar de trazer algum, a regra deixaria de
// ignorar em silêncio: quem chama recusa a lista e o número fica "—".
const CAMPOS = ['situacaoSingular', 'eficaciaPrejudicada', 'classificacao', 'observacoes', 'ementaAssunto'];

/** A norma tem todos os campos que a regra lê (null vale; campo ausente, não)? */
export function normaNoFormato(norma) {
  return norma !== null && typeof norma === 'object' && CAMPOS.every((campo) => Object.hasOwn(norma, campo));
}

/**
 * Quantas normas são ignoradas (cada uma uma vez) e quantas caem em cada regra;
 * `ambas` = situação E classificação.
 */
export function contarIgnoradas(normas) {
  const conta = { ignoradas: 0, situacao: 0, classificacao: 0, ambas: 0, texto: 0 };
  for (const norma of normas) {
    const m = motivosDaNorma(norma);
    if (m.situacao) conta.situacao += 1;
    if (m.classificacao) conta.classificacao += 1;
    if (m.situacao && m.classificacao) conta.ambas += 1;
    if (m.texto) conta.texto += 1;
    if (m.situacao || m.classificacao || m.texto) conta.ignoradas += 1;
  }
  return conta;
}
