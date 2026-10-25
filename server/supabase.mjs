// Acesso ao Supabase pela API REST do próprio Supabase: sem dependência extra.
// Só o servidor usa a chave secreta; o navegador nunca fala com o Supabase direto.
// Tabelas em supabase/migrations: `cache` (fontes de dados) e `reunioes`.
const TIMEOUT_MS = 15_000;

export class SupabaseError extends Error {}

// Erro de um pedido que o banco recusou por conflito (ex.: id repetido).
export class SupabaseConflito extends SupabaseError {}

/** @param {{ url: string, chave: string }} config */
export function criarClienteSupabase({ url, chave }) {
  const base = `${url.replace(/\/+$/, '')}/rest/v1`;
  const cabecalhos = {
    apikey: chave,
    // As chaves antigas (service_role) são JWT e vão também no Authorization;
    // as novas (sb_secret_...) só no apikey.
    ...(chave.startsWith('eyJ') && { authorization: `Bearer ${chave}` }),
    'content-type': 'application/json',
  };

  return async function pedir(caminho, opcoes = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
      ...opcoes,
      headers: { ...cabecalhos, ...opcoes.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {
      throw new SupabaseError('Não foi possível conectar ao Supabase.');
    });
    if (resposta.status === 409) throw new SupabaseConflito('O registro já existe.');
    if (!resposta.ok) throw new SupabaseError(`O Supabase respondeu HTTP ${resposta.status}.`);
    const texto = await resposta.text();
    return texto ? JSON.parse(texto) : null;
  };
}

const igual = (coluna, valor) => `${coluna}=eq.${encodeURIComponent(valor)}`;

/** Armazém do cache das fontes (ver server/cache.mjs). */
export function armazemSupabase(pedir) {
  return {
    async ler(chave) {
      const [linha] = await pedir(`/cache?${igual('chave', chave)}&select=dados,gerado_em`);
      if (!linha?.gerado_em) return null;
      return { dados: linha.dados, geradoEm: new Date(linha.gerado_em).toISOString() };
    },
    // Todas as linhas cuja chave começa com `prefixo` (ex.: as janelas 'chamados:').
    async lerPrefixo(prefixo) {
      const linhas = await pedir(`/cache?chave=like.${encodeURIComponent(prefixo)}*&select=chave,dados,gerado_em`);
      return new Map(
        linhas
          .filter((linha) => linha.gerado_em)
          .map((linha) => [linha.chave, { dados: linha.dados, geradoEm: new Date(linha.gerado_em).toISOString() }]),
      );
    },
    async gravar(chave, { dados, geradoEm }) {
      await pedir('/cache', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ chave, dados, gerado_em: geradoEm, atualizando_ate: null }),
      });
    },
    async travar(chave, segundos) {
      return (await pedir('/rpc/pegar_trava', {
        method: 'POST',
        body: JSON.stringify({ p_chave: chave, p_segundos: segundos }),
      })) === true;
    },
    async destravar(chave) {
      await pedir(`/cache?${igual('chave', chave)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ atualizando_ate: null }),
      });
    },
  };
}

// Reunião (como o site usa) <-> linha da tabela `reunioes`.
const paraLinha = (r) => ({
  id: r.id,
  titulo: r.titulo,
  data_hora: r.dataHora,
  hora_fim: r.horaFim,
  modalidade: r.modalidade,
  membros: r.membros,
  criada_em: r.criadaEm,
  editada_em: r.editadaEm ?? null,
});

const daLinha = (l) => ({
  id: l.id,
  titulo: l.titulo,
  dataHora: l.data_hora,
  horaFim: l.hora_fim,
  modalidade: l.modalidade,
  membros: l.membros,
  criadaEm: new Date(l.criada_em).toISOString(),
  ...(l.editada_em && { editadaEm: new Date(l.editada_em).toISOString() }),
});

const ATIVA = 'apagada_em=is.null';

/** Repositório das reuniões (ver server/reunioes.mjs). Apagar só marca apagada_em. */
export function reunioesSupabase(pedir) {
  return {
    async listar() {
      return (await pedir(`/reunioes?${ATIVA}&select=*&order=data_hora.desc`)).map(daLinha);
    },
    async obter(id) {
      const [linha] = await pedir(`/reunioes?${igual('id', id)}&${ATIVA}&select=*`);
      return linha ? daLinha(linha) : null;
    },
    async inserir(reuniao) {
      await pedir('/reunioes', {
        method: 'POST',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify(paraLinha(reuniao)),
      });
    },
    async atualizar(reuniao) {
      const { id, criada_em: _criada, ...campos } = paraLinha(reuniao);
      const linhas = await pedir(`/reunioes?${igual('id', id)}&${ATIVA}`, {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify(campos),
      });
      return linhas.length > 0;
    },
    async apagar(id, quando) {
      const linhas = await pedir(`/reunioes?${igual('id', id)}&${ATIVA}`, {
        method: 'PATCH',
        headers: { prefer: 'return=representation' },
        body: JSON.stringify({ apagada_em: quando }),
      });
      return linhas.length > 0;
    },
  };
}
