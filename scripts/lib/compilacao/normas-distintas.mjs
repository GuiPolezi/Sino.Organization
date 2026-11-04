// Normas distintas (I13). A Auditoria tem uma linha por AÇÃO: a mesma norma com
// 2 versões aparece 2 vezes. Aqui uma norma vale 1, identificada por
// cidade + tipo + número/ano. Itens: { cidadeUf, descricao }.
import { BALDES, CATALOGO, MAX_DESCRICAO, baldeDoModulo, nomeDoTipo, normalizar, tipoDaDescricao } from './tipos.mjs';

// Dois formatos na Auditoria: "nº 500/2026" e "nº 1.234 / 15/10/2026" (número e a
// data inteira; o ano é o do fim da data).
const NUMERO_ANO = /\bn[º°o]\.?\s*(\d[\d.]*(?:-?[A-Za-z])?)\s*\/\s*(?:\d{1,2}\/\d{1,2}\/)?(\d{4})\b/i;

/**
 * Chave da norma, ou null se não der para identificar (sem cidade, sem número/ano).
 * Tipo desconhecido mas com número/ano válido tem chave própria (vai para "outros").
 */
export function chaveDaNorma(item, catalogo = CATALOGO) {
  const descricao = typeof item?.descricao === 'string' ? item.descricao.slice(0, MAX_DESCRICAO) : item?.descricao;
  const cidade = typeof item?.cidadeUf === 'string' ? item.cidadeUf.trim() : '';
  if (!cidade || typeof descricao !== 'string') return null;
  const nome = nomeDoTipo(descricao);
  const numero = descricao.replace(/^.*?(?=\bn[º°o]\.?\s*\d)/i, '').match(NUMERO_ANO);
  if (!nome || !numero) return null;
  const moduloId = tipoDaDescricao(descricao, catalogo);
  const tipo = moduloId ?? `?${normalizar(nome)}`;
  return `${cidade}|${tipo}|${numero[1].replaceAll('.', '')}/${numero[2]}`;
}

/** Quantas normas distintas há, e quantos itens não deram para identificar. */
export function contarDistintas(itens, catalogo = CATALOGO) {
  const lista = Array.isArray(itens) ? itens : [];
  const chaves = new Set();
  let naoReconhecidas = 0;
  for (const item of lista) {
    const chave = chaveDaNorma(item, catalogo);
    if (chave) chaves.add(chave);
    else naoReconhecidas += 1;
  }
  return { distintas: chaves.size, naoReconhecidas };
}

/**
 * Distintas por balde. `versoes` é o total de itens recebidos: distintas
 * + naoReconhecidas <= versoes sempre. Quem chama deve registrar
 * naoReconhecidas no log (só a contagem, nunca o texto).
 */
export function agruparPorBalde(itens, catalogo = CATALOGO) {
  const lista = Array.isArray(itens) ? itens : [];
  const porBalde = Object.fromEntries(BALDES.map((b) => [b, 0]));
  const vistas = new Set();
  let naoReconhecidas = 0;
  for (const item of lista) {
    const chave = chaveDaNorma(item, catalogo);
    if (!chave) {
      naoReconhecidas += 1;
    } else if (!vistas.has(chave)) {
      vistas.add(chave);
      porBalde[baldeDoModulo(tipoDaDescricao(item.descricao, catalogo))] += 1;
    }
  }
  return { distintas: vistas.size, porBalde, naoReconhecidas, versoes: lista.length };
}

/**
 * Cada norma distinta da lista, com o balde e a primeira data em que apareceu:
 * Map<chave, { balde, data }>. A mesma regra dos períodos (I13): sem tipo ou
 * número/ano reconhecido, conta uma vez por texto (cidade + descrição) em "outros";
 * item sem descrição em texto não conta. Base do Mês e do Todo o Tempo (F6).
 */
export function normasComBalde(itens, catalogo = CATALOGO, dataDe = () => null) {
  const normas = new Map();
  for (const item of Array.isArray(itens) ? itens : []) {
    const reconhecida = chaveDaNorma(item, catalogo);
    if (!reconhecida && typeof item?.descricao !== 'string') continue;
    const chave = reconhecida ?? `?|${item.cidadeUf ?? ''}|${normalizar(item.descricao)}`;
    const balde = reconhecida ? baldeDoModulo(tipoDaDescricao(item.descricao, catalogo)) : 'outros';
    const data = dataDe(item);
    const antes = normas.get(chave);
    if (!antes) normas.set(chave, { balde, data });
    else if (data && (!antes.data || data < antes.data)) normas.set(chave, { ...antes, data });
  }
  return normas;
}
