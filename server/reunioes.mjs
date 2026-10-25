// Regras das reuniões no servidor. O site não tem login, então o servidor não
// confia no navegador: repete a validação de reunioes.js (a mesma função que a
// tela usa) e só grava os campos conhecidos, já normalizados.
import {
  camposDaReuniao,
  validarReuniao,
} from '../src/components/Hero/reunioes/reunioes.js';
import { SupabaseConflito } from './supabase.mjs';

// Ids gerados pelo navegador (crypto.randomUUID ou o fallback de gerarId).
export const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;

/**
 * Resultado das operações: { ok: true, reuniao } ou { ok: false, status, erros }.
 * `status` é o HTTP que a API devolve (404 não achou, 422 dados inválidos).
 */
const falha = (status, erros) => ({ ok: false, status, erros });

export function criarServicoReunioes(repo, agora = () => new Date()) {
  return {
    listar: () => repo.listar(),

    async obter(id) {
      const reuniao = ID_VALIDO.test(id) ? await repo.obter(id) : null;
      return reuniao ? { ok: true, reuniao } : falha(404, { geral: 'Reunião não encontrada.' });
    },

    // `migracao`: reunião que estava no localStorage de um navegador. Pode já ter
    // passado (vale como "data não alterada" na validação) e mantém o criadaEm.
    async criar(dados, { migracao = false } = {}) {
      if (!ID_VALIDO.test(String(dados?.id ?? ''))) return falha(422, { geral: 'Id da reunião inválido.' });
      const quando = agora();
      const original = migracao ? { dataHora: dados.dataHora } : undefined;
      const erros = validarReuniao(dados, quando, { original });
      if (Object.keys(erros).length > 0) return falha(422, erros);
      const criadaEm = migracao && !Number.isNaN(Date.parse(dados.criadaEm)) ? new Date(dados.criadaEm) : quando;
      const reuniao = { id: dados.id, ...camposDaReuniao(dados), criadaEm: criadaEm.toISOString() };
      await repo.inserir(reuniao);
      return { ok: true, reuniao };
    },

    async editar(id, dados) {
      const original = ID_VALIDO.test(id) ? await repo.obter(id) : null;
      if (!original) return falha(404, { geral: 'Reunião não encontrada.' });
      const quando = agora();
      const erros = validarReuniao(dados, quando, { original });
      if (Object.keys(erros).length > 0) return falha(422, erros);
      const reuniao = { ...original, ...camposDaReuniao(dados), editadaEm: quando.toISOString() };
      if (!(await repo.atualizar(reuniao))) return falha(404, { geral: 'Reunião não encontrada.' });
      return { ok: true, reuniao };
    },

    async apagar(id) {
      const apagou = ID_VALIDO.test(id) && (await repo.apagar(id, agora().toISOString()));
      return apagou ? { ok: true } : falha(404, { geral: 'Reunião não encontrada.' });
    },
  };
}

// Repositório em memória: desenvolvimento sem Supabase e testes.
export function reunioesMemoria() {
  const reunioes = new Map();
  return {
    async listar() {
      return [...reunioes.values()].filter((r) => !r.apagadaEm).map(({ apagadaEm, ...r }) => r);
    },
    async obter(id) {
      const r = reunioes.get(id);
      if (!r || r.apagadaEm) return null;
      const { apagadaEm, ...reuniao } = r;
      return reuniao;
    },
    async inserir(reuniao) {
      if (reunioes.has(reuniao.id)) throw new SupabaseConflito('O registro já existe.');
      reunioes.set(reuniao.id, reuniao);
    },
    async atualizar(reuniao) {
      if (!(await this.obter(reuniao.id))) return false;
      reunioes.set(reuniao.id, reuniao);
      return true;
    },
    async apagar(id, quando) {
      if (!(await this.obter(id))) return false;
      reunioes.set(id, { ...reunioes.get(id), apagadaEm: quando });
      return true;
    },
  };
}
