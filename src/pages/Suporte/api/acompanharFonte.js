/*
 * Mantém um dado da API atualizado enquanto a página está aberta, sem F5.
 *
 * A API responde com `situacao` (server/cache.mjs). 'atualizando' e 'antigo'
 * querem dizer que veio a versão anterior do cache, que pode ser de horas
 * atrás: nesse caso, e quando a busca falha, a página tenta de novo logo. Com
 * o dado em dia, busca de novo a cada 15 minutos, o tempo do cache do servidor.
 */

export const ATUALIZAR_A_CADA_MS = 15 * 60_000;
export const ESPERA_CURTA_MS = 20_000;
// Tentativas rápidas seguidas antes de voltar ao ritmo normal (servidor fora do ar).
export const TENTATIVAS_CURTAS = 3;

const ehVelho = (situacao) => situacao === 'atualizando' || situacao === 'antigo';

/**
 * Quanto esperar até a próxima busca.
 * @param {{ ok: boolean, situacao?: string, seguidas: number }} resultado
 *   seguidas: quantas tentativas rápidas já vieram em sequência
 * @returns {{ espera: number, seguidas: number }}
 */
export function proximaEspera({ ok, situacao, seguidas }) {
  const tentarLogo = !ok || ehVelho(situacao);
  if (!tentarLogo) return { espera: ATUALIZAR_A_CADA_MS, seguidas: 0 };
  if (seguidas < TENTATIVAS_CURTAS) return { espera: ESPERA_CURTA_MS, seguidas: seguidas + 1 };
  return { espera: ATUALIZAR_A_CADA_MS, seguidas };
}

/**
 * Busca agora e agenda as próximas buscas.
 *
 * @template T
 * @param {{
 *   buscar: () => Promise<T & { situacao?: string }>,
 *   aoReceber: (resposta: T) => void,
 *   aoFalhar: (erro: unknown) => void,
 *   relogio?: { agendar: typeof setTimeout, cancelar: typeof clearTimeout, agora: () => number },
 * }} opcoes
 * @returns {{ agora: () => Promise<void>, atrasado: () => boolean, parar: () => void }}
 *   agora: busca já (o botão "Tentar de novo"); atrasado: a última busca passou
 *   de 15 minutos (aba que ficou em segundo plano); parar: ao sair da página
 */
export function acompanharFonte({
  buscar,
  aoReceber,
  aoFalhar,
  // Embrulhadas: no navegador, setTimeout chamado como método de outro objeto
  // lança "Illegal invocation".
  relogio = {
    agendar: (fn, ms) => setTimeout(fn, ms),
    cancelar: (timer) => clearTimeout(timer),
    agora: () => Date.now(),
  },
}) {
  let timer = null;
  let seguidas = 0;
  let parado = false;
  let buscando = false;
  let ultimaBusca = 0;

  async function rodar() {
    if (parado || buscando) return;
    relogio.cancelar(timer);
    timer = null;
    buscando = true;
    ultimaBusca = relogio.agora();

    let resultado;
    try {
      const resposta = await buscar();
      if (parado) return;
      aoReceber(resposta);
      resultado = { ok: true, situacao: resposta?.situacao };
    } catch (erro) {
      if (parado) return;
      aoFalhar(erro);
      resultado = { ok: false };
    } finally {
      buscando = false;
    }

    const proxima = proximaEspera({ ...resultado, seguidas });
    seguidas = proxima.seguidas;
    timer = relogio.agendar(rodar, proxima.espera);
  }

  rodar();

  return {
    agora() {
      seguidas = 0;
      return rodar();
    },
    atrasado: () => relogio.agora() - ultimaBusca >= ATUALIZAR_A_CADA_MS,
    parar() {
      parado = true;
      relogio.cancelar(timer);
      timer = null;
    },
  };
}
