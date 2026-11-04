// A responsabilidade de cada pessoa do /compilacao, escolhida no botão "Alterar"
// do card. A página é pública (sem login): quem alterar, altera para todos.
// Tabelas e função da migração 0006: a escolha atual, o histórico de trocas (para
// desfazer à mão) e alterar_responsabilidade, que faz a troca inteira numa
// transação com trava. Sem escolha gravada, a página usa a função da configuração.
// Sem a migração, a lista vem vazia (com aviso) e a troca responde 503.
import { SupabaseError } from './supabase.mjs';

export const RESPONSABILIDADES = Object.freeze(['atualizacoes', 'projetos', 'projetos_finalizando', 'projetos_sem_normas']);

// As mesmas regras da função alterar_responsabilidade (migração 0006), contra enxurrada:
// a mesma pessoa só muda de novo depois de 3 s, e a equipe toda faz no máximo 60
// trocas por minuto. O histórico guarda 90 dias e no máximo 5.000 trocas.
export const INTERVALO_MINIMO_MS = 3000;
export const TETO_POR_MINUTO = 60;
export const HISTORICO_DIAS = 90;
export const HISTORICO_MAX = 5000;

const AVISO_SEM_TABELA = 'Rode a migração 0006 no Supabase para guardar as responsabilidades.';
const ERRO_SEM_TABELA = 'Rode a migração 0006 no Supabase para poder alterar a responsabilidade.';
const ERRO_CHAVE = 'Escolha uma das responsabilidades da lista.';

// Migração não rodada: tabela que não existe (PGRST205 no PostgREST 12+, 42P01 do
// Postgres) ou função que não existe (PGRST202, 42883). Outro 404 é falha comum.
const CODIGOS_SEM_MIGRACAO = new Set(['PGRST205', '42P01', 'PGRST202', '42883']);
const semMigracao = (erro) => erro instanceof SupabaseError && CODIGOS_SEM_MIGRACAO.has(erro.codigo);
// 55P03 (lock_not_available): a função desistiu da fila depois de 2 s.
const filaCheia = (erro) => erro instanceof SupabaseError && erro.codigo === '55P03';

const RESULTADOS = new Set(['gravada', 'igual', 'cedo', 'lotado', 'invalida']);

const daLinha = (l) => ({ personagem: l.personagem, chave: l.responsabilidade, alteradaEm: new Date(l.alterada_em).toISOString() });

/** Acesso às tabelas e à função da 0006 pela API REST do Supabase (`pedir` de server/supabase.mjs). */
export function repositorioResponsabilidades(pedir) {
  const foraDoFormato = () => new SupabaseError('O Supabase respondeu fora do formato esperado.');
  return {
    async listar() {
      const linhas = await pedir('/compilacao_responsabilidades?select=personagem,responsabilidade,alterada_em');
      if (!Array.isArray(linhas)) throw foraDoFormato();
      return linhas.map(daLinha);
    },
    // Um pedido só: ler, conferir e gravar acontecem dentro da função, no banco
    // (a hora é a do banco; `agora` só serve à versão em memória).
    async alterar({ personagem, para }) {
      const resposta = await pedir('/rpc/alterar_responsabilidade', {
        method: 'POST',
        body: JSON.stringify({ p_personagem: personagem, p_para: para }),
      });
      if (!RESULTADOS.has(resposta?.resultado)) throw foraDoFormato();
      const { resultado } = resposta;
      if (resultado !== 'gravada' && resultado !== 'igual') return { resultado };
      const linhaValida =
        typeof resposta.personagem === 'string' &&
        RESPONSABILIDADES.includes(resposta.responsabilidade) &&
        !Number.isNaN(Date.parse(resposta.alterada_em));
      if (!linhaValida) throw foraDoFormato();
      return { resultado, linha: daLinha(resposta) };
    },
  };
}

/** O mesmo repositório em memória (sem Supabase, só para desenvolvimento), com as mesmas regras. */
export function responsabilidadesMemoria() {
  const atuais = new Map();
  const historico = [];
  return {
    historico,
    async listar() {
      return [...atuais.values()];
    },
    // Sem await entre ler e gravar: no Node, isto já roda inteiro de uma vez.
    async alterar({ personagem, para, agora }) {
      if (!RESPONSABILIDADES.includes(para)) return { resultado: 'invalida' };
      const ms = agora.getTime();
      const atual = atuais.get(personagem);
      if (atual?.chave === para) return { resultado: 'igual', linha: atual };
      const passou = atual ? ms - Date.parse(atual.alteradaEm) : Infinity;
      if (passou >= 0 && passou < INTERVALO_MINIMO_MS) return { resultado: 'cedo' };
      // O histórico está em ordem de hora: basta olhar o fim.
      let noUltimoMinuto = 0;
      for (let i = historico.length - 1; i >= 0 && Date.parse(historico[i].alteradaEm) > ms - 60_000; i -= 1) noUltimoMinuto += 1;
      if (noUltimoMinuto >= TETO_POR_MINUTO) return { resultado: 'lotado' };
      const linha = { personagem, chave: para, alteradaEm: agora.toISOString() };
      atuais.set(personagem, linha);
      historico.push({ personagem, de: atual?.chave ?? null, para, alteradaEm: linha.alteradaEm });
      const limite = ms - HISTORICO_DIAS * 86_400_000;
      let corte = Math.max(historico.length - HISTORICO_MAX, 0);
      while (corte < historico.length && Date.parse(historico[corte].alteradaEm) < limite) corte += 1;
      historico.splice(0, corte);
      return { resultado: 'gravada', linha };
    },
  };
}

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const CEDO = 'Essa responsabilidade acabou de mudar. Espere alguns segundos e tente de novo.';
const LOTADO = 'Muitas trocas agora. Espere um minuto e tente de novo.';
const FILA = 'Muitas trocas agora. Tente de novo em instantes.';

/**
 * @param {ReturnType<typeof responsabilidadesMemoria>} repo
 * @param {{ equipe: () => { personagem: string }[], agora?: () => Date }} opcoes
 *   `equipe` lê a configuração a cada pedido (lerEquipe de COMPILACAO_EQUIPE).
 */
export function criarServicoResponsabilidades(repo, { equipe, agora = () => new Date() }) {
  const daEquipe = () => new Set(equipe().map((m) => m.personagem));

  return {
    /** { responsabilidades: { personagem: { chave, alteradaEm } }, aviso? } */
    async listar() {
      let linhas;
      try {
        linhas = await repo.listar();
      } catch (erro) {
        if (semMigracao(erro)) return { responsabilidades: {}, aviso: AVISO_SEM_TABELA };
        throw erro;
      }
      const pessoas = daEquipe();
      const responsabilidades = {};
      for (const { personagem, chave, alteradaEm } of linhas) {
        if (pessoas.has(personagem) && RESPONSABILIDADES.includes(chave)) responsabilidades[personagem] = { chave, alteradaEm };
      }
      return { responsabilidades };
    },

    /** Resultado { status, corpo, esperarSegundos? } para a resposta HTTP. */
    async alterar(personagem, dados) {
      if (!daEquipe().has(personagem)) return { status: 404, corpo: { erro: 'Essa pessoa não está na equipe do /compilacao.' } };
      const para = ehObjeto(dados) ? dados.responsabilidade : undefined;
      const invalida = { status: 400, corpo: { erros: { responsabilidade: ERRO_CHAVE } } };
      if (typeof para !== 'string' || !RESPONSABILIDADES.includes(para)) return invalida;
      let resultado;
      let linha;
      try {
        ({ resultado, linha } = await repo.alterar({ personagem, para, agora: agora() }));
      } catch (erro) {
        if (semMigracao(erro)) return { status: 503, corpo: { erro: ERRO_SEM_TABELA } };
        if (filaCheia(erro)) return { status: 429, corpo: { erro: FILA }, esperarSegundos: 3 };
        throw erro;
      }
      if (resultado === 'cedo') return { status: 429, corpo: { erro: CEDO }, esperarSegundos: INTERVALO_MINIMO_MS / 1000 };
      if (resultado === 'lotado') return { status: 429, corpo: { erro: LOTADO }, esperarSegundos: 60 };
      if (resultado === 'invalida') return invalida;
      return { status: 200, corpo: linha };
    },
  };
}
