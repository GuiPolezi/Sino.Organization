// Armazém do cache no Supabase (tabela `cache`, ver supabase/migrations), pela
// API REST do próprio Supabase: sem dependência extra. Só o servidor usa a chave
// secreta; o navegador nunca fala com o Supabase direto.
const TIMEOUT_MS = 8000;

export class SupabaseError extends Error {}

/** @param {{ url: string, chave: string }} config */
export function armazemSupabase({ url, chave }) {
  const base = `${url.replace(/\/+$/, '')}/rest/v1`;
  const cabecalhos = {
    apikey: chave,
    // As chaves antigas (service_role) são JWT e vão também no Authorization;
    // as novas (sb_secret_...) só no apikey.
    ...(chave.startsWith('eyJ') && { authorization: `Bearer ${chave}` }),
    'content-type': 'application/json',
  };

  const pedir = async (caminho, opcoes = {}) => {
    const resposta = await fetch(`${base}${caminho}`, {
      ...opcoes,
      headers: { ...cabecalhos, ...opcoes.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch(() => {
      throw new SupabaseError('Não foi possível conectar ao Supabase.');
    });
    if (!resposta.ok) throw new SupabaseError(`O Supabase respondeu HTTP ${resposta.status}.`);
    return resposta.status === 204 ? null : resposta.json();
  };

  const filtro = (chaveCache) => `chave=eq.${encodeURIComponent(chaveCache)}`;

  return {
    async ler(chaveCache) {
      const [linha] = await pedir(`/cache?${filtro(chaveCache)}&select=dados,gerado_em`);
      if (!linha?.gerado_em) return null;
      return { dados: linha.dados, geradoEm: new Date(linha.gerado_em).toISOString() };
    },
    async gravar(chaveCache, { dados, geradoEm }) {
      await pedir('/cache', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ chave: chaveCache, dados, gerado_em: geradoEm, atualizando_ate: null }),
      });
    },
    async travar(chaveCache, segundos) {
      return (await pedir('/rpc/pegar_trava', {
        method: 'POST',
        body: JSON.stringify({ p_chave: chaveCache, p_segundos: segundos }),
      })) === true;
    },
    async destravar(chaveCache) {
      await pedir(`/cache?${filtro(chaveCache)}`, {
        method: 'PATCH',
        headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ atualizando_ate: null }),
      });
    },
  };
}
