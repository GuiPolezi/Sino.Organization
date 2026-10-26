/*
 * Pedidos à API do próprio site (/api/*). Cada caminho é pedido uma vez por
 * carregamento de página e o resultado é dividido entre quem precisar (ex.: a
 * equipe de suporte serve à página /suporte e às reuniões). Se falhar, o
 * próximo pedido tenta de novo. Com `novo: true` o pedido é refeito (para
 * atualizar um dado com a página aberta, sem F5).
 *
 * Devolve o corpo da resposta: { dados, geradoEm, situacao, aviso? }.
 */
const pedidos = new Map();

export function buscarApi(caminho, { novo = false } = {}) {
  if (novo || !pedidos.has(caminho)) {
    const pedido = fetch(caminho).then(async (resposta) => {
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok || !corpo) {
        throw new Error(corpo?.erro ?? `O servidor respondeu HTTP ${resposta.status}.`);
      }
      return corpo;
    });
    pedido.catch(() => pedidos.delete(caminho));
    pedidos.set(caminho, pedido);
  }
  return pedidos.get(caminho);
}

/** Só os dados da resposta. */
export const buscarDados = async (caminho) => (await buscarApi(caminho)).dados;
