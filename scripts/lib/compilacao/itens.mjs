// Leitura tolerante dos registros da Auditoria (a lista vem de uma API interna
// sem documentação: data, hora e ação são lidas de mais de um jeito).
import { normalizar } from './tipos.mjs';

// Módulos que podem aparecer em "Atividade recente" (plano, 5.8). Nada além disso.
const MODULOS_DE_ATIVIDADE = new Map(
  ['Normas', 'Versões', 'Arquivos', 'Datas', 'Classificações', 'Vínculos de Normas', 'Vínculos Externos', 'Iniciativas', 'Revisões'].map(
    (nome) => [normalizar(nome), nome],
  ),
);

// 1 = inclusão é o filtro que o plano usa para versão nova; 2 e 3 são inferidos
// (alteração e exclusão), a conferir no painel em F7.
const ACOES = { 1: 'Inclusão', 2: 'Alteração', 3: 'Exclusão' };
export const LIMITE_DESCRICAO = 160;

/** Data civil AAAA-MM-DD do registro (aceita AAAA-MM-DD..., DD/MM/AAAA); null se não der. */
export function dataDoItem(item) {
  const texto = typeof item?.data === 'string' ? item.data.trim() : '';
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

export function horaDoItem(item) {
  return String(item?.hora ?? '').match(/\d{2}:\d{2}/)?.[0] ?? '00:00';
}

/** Chave para ordenar do mais antigo ao mais novo. */
export const instanteDoItem = (item) => `${dataDoItem(item) ?? ''}T${horaDoItem(item)}`;

/** Inclusão (acao=1). Registro sem o campo vale: o filtro já foi pedido ao sistema. */
export function ehInclusao(item) {
  const acao = item?.acao;
  return acao === undefined || acao === null || String(acao) === '1' || /^inclus/i.test(String(acao));
}

/** O módulo bate (sem acento/caixa); registro sem o campo vale. */
export function ehDoModulo(item, nome) {
  return item?.modulo === undefined || normalizar(item.modulo) === normalizar(nome);
}

export const ehModuloDeAtividade = (item) =>
  typeof item?.modulo === 'string' && MODULOS_DE_ATIVIDADE.has(normalizar(item.modulo));

/** O nome do módulo como está na lista branca (nunca o texto que veio). */
export const moduloCanonico = (modulo) =>
  typeof modulo === 'string' ? (MODULOS_DE_ATIVIDADE.get(normalizar(modulo)) ?? null) : null;

// Só os códigos conhecidos (1, 2, 3); qualquer outra coisa vira '' (nunca texto livre).
export function acaoEmTexto(acao) {
  return Object.hasOwn(ACOES, String(acao)) ? ACOES[String(acao)] : '';
}

const MAX_NOME_CIDADE = 60;
// Classes sem sobreposição (sem backtracking quadrático) e o texto cortado antes.
const DADO_PESSOAL = [
  /[^\s@]+@[^\s@]+/g, // e-mail
  /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, // CPF
  /\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b/g, // telefone
];

/** Texto livre da Auditoria que vai para a página pública: sem e-mail, CPF ou telefone, e com teto. */
export function textoPublico(texto, limite = LIMITE_DESCRICAO) {
  let limpo = String(texto ?? '').slice(0, limite * 2);
  for (const padrao of DADO_PESSOAL) limpo = limpo.replace(padrao, '…');
  return limpo.slice(0, limite);
}

/**
 * "Cidade A-SP" -> { nome: 'Cidade A', uf: 'SP' } (o hífen que vale é o último). Vai para a
 * página pública: nome sem e-mail e com teto; UF só com 2 letras maiúsculas.
 */
export function separarCidadeUf(cidadeUf) {
  const texto = typeof cidadeUf === 'string' ? cidadeUf.trim() : '';
  const corte = texto.lastIndexOf('-');
  const uf = corte > 0 ? texto.slice(corte + 1).trim() : '';
  if (corte <= 0 || !/^[A-Z]{2}$/.test(uf)) return { nome: textoPublico(texto, MAX_NOME_CIDADE), uf: '' };
  return { nome: textoPublico(texto.slice(0, corte).trim(), MAX_NOME_CIDADE), uf };
}

/** Itens da lista que estão entre as duas datas (inclusive). */
export const itensEntre = (itens, inicio, fim) =>
  itens.filter((item) => {
    const data = dataDoItem(item);
    return data !== null && data >= inicio && data <= fim;
  });
