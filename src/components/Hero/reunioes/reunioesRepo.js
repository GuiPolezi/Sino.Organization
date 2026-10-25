// Repositório das reuniões: fala com a API do site (/api/reunioes), que grava
// no Supabase. As reuniões são as mesmas para todos que abrem o site.
//
// O servidor repete a validação de reunioes.js antes de gravar (o site não tem
// login, então o navegador não é confiável). Os ids continuam sendo gerados
// aqui (gerarId), para a tela mostrar a reunião na hora, antes da resposta.
//
// Antes, as reuniões ficavam no localStorage de cada navegador. Na primeira
// visita depois da troca, as que existirem lá vão para o servidor uma vez
// (migrarReunioesLocais); as de exemplo da antiga demonstração ficam de fora.

export const CHAVE_STORAGE = 'sino.reunioes.v1';
// Marca que as reuniões deste navegador já foram enviadas ao servidor.
export const CHAVE_MIGRADA = 'sino.reunioes.migradas.v1';

// Títulos das reuniões de exemplo que a demonstração semeava no navegador.
export const TITULOS_EXEMPLO = new Set([
  'Revisão de chamados críticos',
  'Alinhamento semanal do Suporte',
  'Demo do módulo de Licenças',
  'Planejamento da Sprint 42',
  'Implantação — Câmara de Araras',
  'Treinamento do novo portal da Prefeitura',
  'Retrospectiva da Sprint 41',
  'Atendimento — Prefeitura de Limeira',
  'Alinhamento Suporte × Desenvolvimento',
  'Revisão do contrato de manutenção',
]);

// ---------- API ----------

export class ErroReunioes extends Error {}

async function pedir(caminho = '', { metodo = 'GET', corpo } = {}) {
  const resposta = await fetch(`/api/reunioes${caminho}`, {
    method: metodo,
    ...(corpo !== undefined && {
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  }).catch(() => {
    throw new ErroReunioes('Sem conexão com o servidor.');
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const erro = new ErroReunioes(
      dados?.erro ?? Object.values(dados?.erros ?? {})[0] ?? `O servidor respondeu HTTP ${resposta.status}.`,
    );
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

const caminhoDe = (id) => `/${encodeURIComponent(id)}`;

/** Todas as reuniões (não apagadas). */
export const listarReunioes = async () => (await pedir()).reunioes;

/** Uma reunião, ou null se não existir. */
export const obterReuniao = async (id) => {
  try {
    return (await pedir(caminhoDe(id))).reuniao;
  } catch (erro) {
    if (erro.status === 404) return null;
    throw erro;
  }
};

export const enviarNovaReuniao = (reuniao) => pedir('', { metodo: 'POST', corpo: reuniao });

export const enviarEdicaoReuniao = (reuniao) => pedir(caminhoDe(reuniao.id), { metodo: 'PUT', corpo: reuniao });

// Já apagada por outra pessoa (404) conta como apagada.
export const apagarReuniaoNoServidor = (id) =>
  pedir(caminhoDe(id), { metodo: 'DELETE' }).catch((erro) => {
    if (erro.status !== 404) throw erro;
    return null;
  });

// ---------- Migração do localStorage ----------

// localStorage pode não existir (SSR/testes) ou lançar (modo privado/bloqueado).
const obterStorage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const ehTexto = (v) => typeof v === 'string' && v.length > 0;

// Descarta itens fora do formato esperado em vez de quebrar a tela.
const ehReuniaoValida = (r) =>
  r != null &&
  typeof r === 'object' &&
  ehTexto(r.id) &&
  ehTexto(r.titulo) &&
  ehTexto(r.dataHora) &&
  ehTexto(r.modalidade) &&
  (r.horaFim == null || ehTexto(r.horaFim)) &&
  Array.isArray(r.membros) &&
  r.membros.every((m) => m != null && ehTexto(m.id) && ehTexto(m.nome));

/** Reuniões gravadas no navegador pela versão antiga (tolera dado quebrado). */
export const lerReunioesLocais = (storage = obterStorage()) => {
  try {
    const bruto = storage?.getItem(CHAVE_STORAGE);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter(ehReuniaoValida) : [];
  } catch {
    return [];
  }
};

/** As reuniões locais que devem ir para o servidor (sem as de exemplo). */
export const reunioesParaMigrar = (storage = obterStorage()) =>
  lerReunioesLocais(storage).filter((r) => !TITULOS_EXEMPLO.has(r.titulo));

/*
 * Envia as reuniões deste navegador ao servidor, uma vez. Reunião repetida
 * (409) ou inválida (422) é pulada; sem conexão, tenta de novo na próxima
 * visita. O localStorage antigo não é apagado: fica como cópia de segurança.
 * Devolve quantas foram enviadas.
 */
export async function migrarReunioesLocais(storage = obterStorage(), enviar = enviarMigrada) {
  try {
    if (!storage || storage.getItem(CHAVE_MIGRADA) != null) return 0;
  } catch {
    return 0;
  }
  let enviadas = 0;
  for (const reuniao of reunioesParaMigrar(storage)) {
    try {
      await enviar(reuniao);
      enviadas += 1;
    } catch (erro) {
      if (erro.status !== 409 && erro.status !== 422) return enviadas;
    }
  }
  try {
    storage.setItem(CHAVE_MIGRADA, new Date().toISOString());
  } catch {
    // Sem como marcar: na próxima visita as repetidas voltam como 409.
  }
  return enviadas;
}

const enviarMigrada = (reuniao) => pedir('?migracao=1', { metodo: 'POST', corpo: reuniao });
