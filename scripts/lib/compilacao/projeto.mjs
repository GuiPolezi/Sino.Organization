// Projetos Novos: cidade e tipo(s) em que a pessoa está, pela Auditoria recente
// (plano de dados, regras 4.2 e 4.3), e os números do estoque do projeto.
// Ainda SEM estado: a histerese de 2 dias e a correção manual entram em F3.
import { dataDoItem, ehDoModulo, instanteDoItem, separarCidadeUf, textoPublico } from './itens.mjs';
import { CATALOGO, tipoDaDescricao } from './tipos.mjs';

// Janela da inferência: os últimos N dias COM ação (feriado e fim de semana não diluem).
export const DIAS_COM_ACAO = 5;
// Tipo com esta fatia ou mais entra no conjunto; com a fatia "só", o conjunto é só ele.
const FATIA_MINIMA = 0.2;
const FATIA_SO = 0.7;
const MAX_TIPOS = 3;

// Rótulos no plural, como no card ("Cidade A - SP · Resoluções").
const ROTULOS = new Map([
  [21, 'Atos da Mesa'],
  [22, 'Atos da Presidência'],
  [23, 'Leis Ordinárias'],
  [24, 'Leis Complementares'],
  [25, 'Decretos Legislativos'],
  [26, 'Decretos'],
  [27, 'Emendas à Lei Orgânica'],
  [28, 'Resoluções'],
  [29, 'Portarias'],
  [31, 'Lei Orgânica'],
  [41, 'Leis do Legislativo'],
  [51, 'Resoluções SEFIN'],
]);

export function rotuloDoTipo(moduloId, catalogo = CATALOGO) {
  const doCatalogo = catalogo.find((t) => t.id === moduloId)?.nomeSingular;
  return ROTULOS.get(moduloId) ?? (doCatalogo ? textoPublico(doCatalogo, 60) : `Tipo ${moduloId}`);
}

const cidadeDe = (item) => (typeof item?.cidadeUf === 'string' ? item.cidadeUf.trim() : '');

// Ações de Versões e Normas dos últimos dias com ação.
function acoesDaJanela({ versoes = [], normas = [] }) {
  const acoes = [
    ...versoes.filter((i) => ehDoModulo(i, 'Versões')),
    ...normas.filter((i) => ehDoModulo(i, 'Normas')),
  ].filter((i) => dataDoItem(i) && cidadeDe(i));
  const dias = new Set([...new Set(acoes.map(dataDoItem))].sort().reverse().slice(0, DIAS_COM_ACAO));
  return acoes.filter((i) => dias.has(dataDoItem(i)));
}

// A cidade com mais ações; empate: a da ação mais recente.
function cidadeComMaisAcoes(acoes) {
  const porCidade = new Map();
  for (const item of acoes) {
    const cidade = cidadeDe(item);
    const conta = porCidade.get(cidade) ?? { n: 0, ultimo: '' };
    conta.n += 1;
    const instante = instanteDoItem(item);
    if (instante > conta.ultimo) conta.ultimo = instante;
    porCidade.set(cidade, conta);
  }
  const [[cidade]] = [...porCidade].sort(([, a], [, b]) => b.n - a.n || b.ultimo.localeCompare(a.ultimo));
  return cidade;
}

// O conjunto de tipos: fatia >= 20%, no máximo 3; quem tem >= 70% fica sozinho.
function tiposDoProjeto(acoes, catalogo) {
  const contagem = new Map();
  for (const item of acoes) {
    const id = tipoDaDescricao(item.descricao, catalogo);
    if (id !== null) contagem.set(id, (contagem.get(id) ?? 0) + 1);
  }
  const ordenados = [...contagem].sort(([ia, a], [ib, b]) => b - a || ia - ib);
  if (ordenados.length === 0) return [];
  if (ordenados[0][1] / acoes.length >= FATIA_SO) return [ordenados[0][0]];
  const conjunto = ordenados
    .filter(([, n]) => n / acoes.length >= FATIA_MINIMA)
    .slice(0, MAX_TIPOS)
    .map(([id]) => id);
  // Tudo espalhado (nenhum tipo com 20%): fica o tipo com mais ações.
  return conjunto.length > 0 ? conjunto : [ordenados[0][0]];
}

/**
 * Cidade (texto "Nome-UF", como na Auditoria) e moduloIds do projeto, ou null
 * se a pessoa não teve ação de Versões/Normas na janela.
 */
export function inferirProjeto(entrada, catalogo = CATALOGO) {
  if (!entrada) return null;
  const acoes = acoesDaJanela(entrada);
  if (acoes.length === 0) return null;
  const cidadeUf = cidadeComMaisAcoes(acoes);
  const naCidade = acoes.filter((i) => cidadeDe(i) === cidadeUf);
  return { cidadeUf, moduloIds: tiposDoProjeto(naCidade, catalogo) };
}

export const chaveDoPar = (cidadeUf, moduloId) => `${cidadeUf}|${moduloId}`;

// I4: inteiros >= 0 e versionadas + não versionadas = total.
export function estoqueFecha(e) {
  const inteiros = [e?.total, e?.versionadas, e?.naoVersionadas].every((n) => Number.isInteger(n) && n >= 0);
  return inteiros && e.versionadas + e.naoVersionadas === e.total;
}

/** Estoque somado dos tipos do projeto; null se faltar algum tipo ou algum não fechar (I4). */
export function estoqueDoProjeto(projeto, estoque, avisar = () => {}) {
  if (!projeto || projeto.moduloIds.length === 0) return null;
  const soma = { total: 0, compiladas: 0, aguardando: 0 };
  for (const id of projeto.moduloIds) {
    const e = estoque?.[chaveDoPar(projeto.cidadeUf, id)];
    if (!e) return null;
    if (!estoqueFecha(e)) {
      avisar('estoque do projeto não fecha (versionadas + não versionadas ≠ total)');
      return null;
    }
    soma.total += e.total;
    soma.compiladas += e.versionadas;
    soma.aguardando += e.naoVersionadas;
  }
  return soma;
}

/** O bloco `projeto` da resposta (sem cidadeId: só nome e UF). */
export function projetoPublico(projeto, estoque, compartilhadaCom, { catalogo = CATALOGO, avisar } = {}) {
  const numeros = estoqueDoProjeto(projeto, estoque, avisar);
  return {
    cidade: separarCidadeUf(projeto.cidadeUf),
    tipos: projeto.moduloIds.map((id) => rotuloDoTipo(id, catalogo)),
    total: numeros?.total ?? null,
    compiladas: numeros?.compiladas ?? null,
    aguardando: numeros?.aguardando ?? null,
    compartilhadaCom,
  };
}

/** I6: colegas de Projetos com a mesma cidade e algum tipo em comum. */
export function colegasNoPar(personagem, projetos) {
  const meu = projetos.get(personagem);
  if (!meu) return [];
  return [...projetos]
    .filter(([outro, p]) => outro !== personagem && p.cidadeUf === meu.cidadeUf && p.moduloIds.some((id) => meu.moduloIds.includes(id)))
    .map(([outro]) => outro);
}
