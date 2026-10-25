// Cache das fontes de dados (Milldesk, Sino.Licença), renovado quando alguém
// pede um dado velho. Sem agendamento: quem abre a página dispara a busca, e os
// acessos seguintes reaproveitam o resultado até ele passar de IDADE_MAXIMA_MS.
//
// Uma trava no armazém garante uma busca por vez para cada fonte: quem chega
// durante uma busca recebe o dado anterior em vez de disparar outra.
import { setTimeout as esperar } from 'node:timers/promises';

export const IDADE_MAXIMA_MS = 15 * 60_000;
// Se uma busca morrer no meio (função encerrada), a trava expira sozinha.
const TRAVA_SEGUNDOS = 90;

/**
 * @typedef {{ dados: unknown, geradoEm: string }} Registro
 * @typedef {{
 *   ler(chave: string): Promise<Registro | null>,
 *   gravar(chave: string, registro: Registro): Promise<void>,
 *   travar(chave: string, segundos: number): Promise<boolean>,
 *   destravar(chave: string): Promise<void>,
 * }} Armazem
 * @typedef {'recente' | 'atualizado' | 'atualizando' | 'antigo'} Situacao
 */

/**
 * @param {{
 *   armazem: Armazem,
 *   mensagemDe?: (erro: unknown) => string,
 *   agora?: () => number,
 *   idadeMaximaMs?: number,
 *   esperaMs?: number,
 *   tentativasEspera?: number,
 * }} opcoes
 */
export function criarCache({
  armazem,
  mensagemDe = () => 'Não foi possível atualizar os dados agora.',
  agora = Date.now,
  idadeMaximaMs = IDADE_MAXIMA_MS,
  esperaMs = 500,
  tentativasEspera = 30,
}) {
  /**
   * Devolve o dado da `chave`, buscando de novo com `buscar()` se estiver velho.
   * @returns {Promise<Registro & { situacao: Situacao, aviso?: string }>}
   */
  return async function obter(chave, buscar) {
    const atual = await armazem.ler(chave);
    if (atual && agora() - Date.parse(atual.geradoEm) < idadeMaximaMs) {
      return { ...atual, situacao: 'recente' };
    }

    if (await armazem.travar(chave, TRAVA_SEGUNDOS)) {
      try {
        const novo = { dados: await buscar(), geradoEm: new Date(agora()).toISOString() };
        await armazem.gravar(chave, novo);
        return { ...novo, situacao: 'atualizado' };
      } catch (erro) {
        await armazem.destravar(chave).catch(() => {});
        // Melhor o dado de antes, avisando, do que uma página vazia.
        if (atual) return { ...atual, situacao: 'antigo', aviso: mensagemDe(erro) };
        throw erro;
      }
    }

    // Outro acesso está buscando agora.
    if (atual) return { ...atual, situacao: 'atualizando' };

    // Ainda não existe nenhum dado: espera a primeira busca terminar.
    for (let i = 0; i < tentativasEspera; i += 1) {
      await esperar(esperaMs);
      const pronto = await armazem.ler(chave);
      if (pronto) return { ...pronto, situacao: 'atualizado' };
    }
    throw new Error('A primeira busca dos dados ainda não terminou. Tente de novo em instantes.');
  };
}

// Armazém em memória: para desenvolvimento local e testes. Na Vercel cada
// instância teria o seu, por isso lá o armazém é o Supabase.
export function armazemMemoria() {
  const registros = new Map();
  const travas = new Map();
  return {
    async ler(chave) {
      return registros.get(chave) ?? null;
    },
    async gravar(chave, registro) {
      registros.set(chave, registro);
      travas.delete(chave);
    },
    async travar(chave, segundos) {
      if ((travas.get(chave) ?? 0) > Date.now()) return false;
      travas.set(chave, Date.now() + segundos * 1000);
      return true;
    },
    async destravar(chave) {
      travas.delete(chave);
    },
  };
}
