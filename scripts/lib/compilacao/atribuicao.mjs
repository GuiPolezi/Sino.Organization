// Projetos Novos com memória (fase F3): a atribuição gravada (cidade + tipos) só
// troca depois de 2 dias com ação seguidos no projeto novo; a correção manual
// ganha sempre (plano de dados, 4.2 e 4.3).
import { dataDoItem, ehDoModulo, instanteDoItem } from './itens.mjs';
import { inferirProjeto } from './projeto.mjs';
import { CATALOGO } from './tipos.mjs';

export const DIAS_PARA_TROCAR = 2;

const doDia = (lista, data) => (lista ?? []).filter((item) => dataDoItem(item) === data);

/**
 * Os últimos `dias` dias com ação, cada um inferido sozinho, com a hora da
 * primeira ação do dia ("AAAA-MM-DDTHH:MM", hora de Brasília).
 */
export function inferirPorDia(entrada, catalogo = CATALOGO, dias = DIAS_PARA_TROCAR) {
  if (!entrada) return [];
  const acoes = [
    ...(entrada.versoes ?? []).filter((i) => ehDoModulo(i, 'Versões')),
    ...(entrada.normas ?? []).filter((i) => ehDoModulo(i, 'Normas')),
  ].filter(dataDoItem);
  const datas = [...new Set(acoes.map(dataDoItem))].sort().reverse().slice(0, dias);
  return datas.map((data) => ({
    data,
    projeto: inferirProjeto({ versoes: doDia(entrada.versoes, data), normas: doDia(entrada.normas, data) }, catalogo),
    primeiraAcao: acoes
      .filter((i) => dataDoItem(i) === data)
      .map(instanteDoItem)
      .sort()[0],
  }));
}

const mesmoConjunto = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
export const mesmoProjeto = (a, b) => Boolean(a && b) && a.cidadeUf === b.cidadeUf && mesmoConjunto(a.moduloIds, b.moduloIds);

// Cada um dos últimos dias foi na cidade nova e só com tipos do conjunto novo.
function confirmado(inferido, porDia) {
  return (
    porDia.length >= DIAS_PARA_TROCAR &&
    porDia.every(
      ({ projeto }) =>
        projeto &&
        projeto.cidadeUf === inferido.cidadeUf &&
        projeto.moduloIds.length > 0 &&
        projeto.moduloIds.every((id) => inferido.moduloIds.includes(id)),
    )
  );
}

/**
 * O que fazer com a atribuição de uma pessoa.
 * @param {{
 *   atual: { cidadeUf: string, moduloIds: number[], origem: 'inferida' | 'manual' } | null,
 *   inferido: { cidadeUf: string, moduloIds: number[] } | null,
 *   porDia: ReturnType<typeof inferirPorDia>,
 * }} entrada
 * @returns {{ acao: 'manter' | 'abrir' | 'trocar' | 'nada', projeto: object | null }}
 *   manter: fica a atual; abrir: primeira atribuição; trocar: fecha a atual e abre
 *   a inferida; nada: sem atribuição para gravar (mostra a inferida, se houver).
 */
export function decidirAtribuicao({ atual, inferido, porDia }) {
  if (atual?.origem === 'manual') return { acao: 'manter', projeto: atual };
  const gravavel = inferido && inferido.moduloIds.length > 0;
  if (!gravavel) return atual ? { acao: 'manter', projeto: atual } : { acao: 'nada', projeto: inferido ?? null };
  if (!atual) return { acao: 'abrir', projeto: inferido };
  if (mesmoProjeto(atual, inferido)) return { acao: 'manter', projeto: atual };
  return confirmado(inferido, porDia) ? { acao: 'trocar', projeto: inferido } : { acao: 'manter', projeto: atual };
}

/** "AAAA-MM-DDTHH:MM" de Brasília (sem horário de verão desde 2019) -> ISO. */
export const instanteParaIso = (instante) => new Date(`${instante}:00-03:00`).toISOString();
