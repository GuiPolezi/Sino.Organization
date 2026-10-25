// Chamados de cada desenvolvedor, desde o início do Milldesk (out/2017).
//
// Buscar todo o histórico leva minutos (o Milldesk só aceita períodos curtos),
// mais do que um carregamento de página ou uma função da Vercel aguentam. Por
// isso o histórico fica no cache em partes, uma por janela de 90 dias
// ('chamados:2017-10-01', 'chamados:2017-12-30', ...):
//   - as duas janelas mais recentes são renovadas pelo próprio acesso (15 min);
//   - as antigas, pelo agendamento diário (api/cron/chamados.js), em rodízio:
//     a cada execução, as que estão há mais tempo sem atualizar;
//   - a primeira carga de todas é feita por `npm run seed:chamados`.
// Título, descrição e solicitante dos tickets nunca saem daqui (build-chamados.mjs).
import { setTimeout as esperar } from 'node:timers/promises';
import equipeDesenvolvimento from '../scripts/data/dev-team.json' with { type: 'json' };
import { montarChamados } from '../scripts/lib/build-chamados.mjs';
import { buscarMilldesk, hojeEmBrasilia } from './fontes.mjs';

// Primeiro ticket do Milldesk: outubro de 2017.
export const INICIO = '2017-10-01';
const DIAS_POR_JANELA = 90;
const UM_DIA_MS = 864e5;
export const PREFIXO = 'chamados:';
// Quantas janelas (as mais novas) se renovam pelo acesso.
export const JANELAS_RECENTES = 2;
// Pausa entre janelas seguidas, para não sobrecarregar a API.
const PAUSA_MS = 2500;

const somarDias = (data, dias) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + dias * UM_DIA_MS).toISOString().slice(0, 10);

/** Janelas de 90 dias de INICIO até `fim`: [{ inicio, fim, chave }], da mais antiga à mais nova. */
export function janelas(fim = hojeEmBrasilia()) {
  const lista = [];
  for (let de = INICIO; de <= fim; de = somarDias(de, DIAS_POR_JANELA)) {
    const ate = somarDias(de, DIAS_POR_JANELA - 1);
    lista.push({ inicio: de, fim: ate < fim ? ate : fim, chave: `${PREFIXO}${de}` });
  }
  return lista;
}

/**
 * Busca no Milldesk e filtra os chamados de uma janela. Quando a API pede para
 * esperar (HTTP 429), espera cada vez mais e tenta de novo, até `tentativas`.
 */
export function buscadorDaJanela({ inicio, fim }, { tentativas = 3, esperaMs = 5000 } = {}) {
  return async () => {
    const tickets = await buscarMilldesk(`showTicketsPerPeriod?start=${inicio}&end=${fim}`, { tentativas, esperaMs });
    const { desenvolvedores } = montarChamados(tickets, equipeDesenvolvimento.team);
    return { inicio, fim, desenvolvedores };
  };
}

/**
 * Junta as janelas numa lista por desenvolvedor, do chamado mais novo ao mais
 * antigo (cada janela já vem assim; as janelas vão da mais nova à mais antiga).
 */
export function juntarJanelas(registrosDasJanelas) {
  const desenvolvedores = Object.fromEntries(equipeDesenvolvimento.team.map(({ id }) => [id, []]));
  const ordenadas = [...registrosDasJanelas].sort((a, b) => b.inicio.localeCompare(a.inicio));
  for (const janela of ordenadas) {
    for (const [id, lista] of Object.entries(janela.desenvolvedores ?? {})) {
      if (desenvolvedores[id]) desenvolvedores[id].push(...lista);
    }
  }
  return desenvolvedores;
}

/**
 * Os chamados de todo o histórico, para /api/chamados: renova as janelas
 * recentes (pelo cache de 15 min) e junta com as antigas já guardadas.
 * @param {{ cache: Function, armazem: { lerPrefixo: Function } }} servicos
 */
export async function obterChamados({ cache, armazem }) {
  const todas = janelas();
  const recentes = todas.slice(-JANELAS_RECENTES);

  // Uma de cada vez: o Milldesk limita pedidos seguidos.
  const renovadas = [];
  for (const janela of recentes) renovadas.push(await cache(janela.chave, buscadorDaJanela(janela)));

  const guardadas = await armazem.lerPrefixo(PREFIXO);
  const registros = todas.map((janela, i) => {
    const recente = i >= todas.length - JANELAS_RECENTES;
    return recente ? renovadas[i - (todas.length - JANELAS_RECENTES)].dados : guardadas.get(janela.chave)?.dados;
  });
  const carregadas = registros.filter(Boolean);

  const avisos = renovadas.map((r) => r.aviso).filter(Boolean);
  return {
    dados: {
      periodo: { inicio: INICIO, fim: todas.at(-1).fim },
      janelas: { total: todas.length, carregadas: carregadas.length },
      desenvolvedores: juntarJanelas(carregadas),
    },
    // A data que importa é a das janelas recentes (as antigas quase não mudam).
    geradoEm: renovadas.map((r) => r.geradoEm).sort()[0],
    situacao: renovadas.some((r) => r.situacao === 'antigo') ? 'antigo' : renovadas[0].situacao,
    ...(avisos.length && { aviso: avisos[0] }),
  };
}

/**
 * Renova as janelas antigas que estão há mais tempo sem atualizar (as que
 * nunca foram buscadas primeiro), até `limite` janelas ou até passar `prazoMs`.
 * Usado pelo agendamento diário e pela primeira carga (`npm run seed:chamados`).
 * @returns {Promise<{ renovadas: string[], falhas: { chave: string, erro: string }[], faltando: number }>}
 */
export async function renovarJanelasAntigas(
  { cache, armazem },
  { limite = 10, prazoMs = 200_000, mensagemDe = (e) => e.message, aoRenovar = () => {} } = {},
) {
  const comeco = Date.now();
  const antigas = janelas().slice(0, -JANELAS_RECENTES);
  const guardadas = await armazem.lerPrefixo(PREFIXO);
  const idade = (janela) => (guardadas.has(janela.chave) ? Date.parse(guardadas.get(janela.chave).geradoEm) : 0);
  const fila = [...antigas].sort((a, b) => idade(a) - idade(b)).slice(0, limite);

  const renovadas = [];
  const falhas = [];
  for (const [i, janela] of fila.entries()) {
    if (Date.now() - comeco > prazoMs) break;
    if (i > 0) await esperar(PAUSA_MS);
    try {
      // idadeMaximaMs 0: busca de novo mesmo que exista.
      await cache(janela.chave, buscadorDaJanela(janela, { tentativas: 8 }), { idadeMaximaMs: 0 });
      renovadas.push(janela.chave);
      aoRenovar(janela, i + 1, fila.length);
    } catch (erro) {
      falhas.push({ chave: janela.chave, erro: mensagemDe(erro) });
    }
  }
  const faltando = antigas.filter((j) => !guardadas.has(j.chave) && !renovadas.includes(j.chave)).length;
  return { renovadas, falhas, faltando };
}
