// Cache das fontes de dados (Milldesk, Sino.Licença), renovado quando alguém
// pede um dado velho. Sem agendamento: quem abre a página dispara a busca, e os
// acessos seguintes reaproveitam o resultado até ele passar de IDADE_MAXIMA_MS.
//
// Uma trava no armazém garante uma busca por vez para cada fonte: quem chega
// durante uma busca recebe o dado anterior em vez de disparar outra.
import { setTimeout as esperar } from 'node:timers/promises';

export const IDADE_MAXIMA_MS = 15 * 60_000;
// Se uma busca morrer no meio (função encerrada), a trava expira sozinha. Cobre
// a busca mais lenta (Legislação Digital com novas tentativas: perto de 2 min).
const TRAVA_SEGUNDOS = 180;
// Depois de uma busca que falhou, ninguém tenta de novo por este tempo: a página é
// pública, e sem isso cada visita refaria a busca inteira com a fonte fora do ar.
export const PAUSA_APOS_FALHA_SEGUNDOS = 60;

/**
 * @typedef {{ dados: unknown, geradoEm: string }} Registro
 * @typedef {{
 *   ler(chave: string): Promise<Registro | null>,
 *   lerPrefixo(prefixo: string): Promise<Map<string, Registro>>,
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
   * `opcoes.idadeMaximaMs` troca a idade máxima só para esta fonte (0 força a busca).
   * @returns {Promise<Registro & { situacao: Situacao, aviso?: string }>}
   */
  // Última falha de cada chave nesta instância: durante a pausa, quem chega recebe
  // o aviso certo na hora (em vez de "atualizando" ou de esperar à toa).
  const falhas = new Map();

  return async function obter(chave, buscar, { idadeMaximaMs: idade = idadeMaximaMs } = {}) {
    const atual = await armazem.ler(chave);
    if (atual && agora() - Date.parse(atual.geradoEm) < idade) {
      return { ...atual, situacao: 'recente' };
    }

    const falha = falhas.get(chave);
    if (falha && agora() < falha.ate) {
      if (atual) return { ...atual, situacao: 'antigo', aviso: mensagemDe(falha.erro) };
      throw falha.erro;
    }

    if (await armazem.travar(chave, TRAVA_SEGUNDOS)) {
      try {
        const novo = { dados: await buscar(), geradoEm: new Date(agora()).toISOString() };
        await armazem.gravar(chave, novo);
        falhas.delete(chave);
        return { ...novo, situacao: 'atualizado' };
      } catch (erro) {
        falhas.set(chave, { erro, ate: agora() + PAUSA_APOS_FALHA_SEGUNDOS * 1000 });
        // A trava fica como pausa para as outras instâncias (a desta é o Map acima).
        await armazem.destravar(chave).catch(() => {});
        await armazem.travar(chave, PAUSA_APOS_FALHA_SEGUNDOS).catch(() => {});
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
export function armazemMemoria({ agora = Date.now } = {}) {
  const registros = new Map();
  const travas = new Map();
  return {
    async ler(chave) {
      return registros.get(chave) ?? null;
    },
    async lerPrefixo(prefixo) {
      return new Map([...registros].filter(([chave]) => chave.startsWith(prefixo)));
    },
    async gravar(chave, registro) {
      registros.set(chave, registro);
      travas.delete(chave);
    },
    async travar(chave, segundos) {
      if ((travas.get(chave) ?? 0) > agora()) return false;
      travas.set(chave, agora() + segundos * 1000);
      return true;
    },
    async destravar(chave) {
      travas.delete(chave);
    },
  };
}
