// Fontes de dados da API: chave do cache -> como buscar o dado já filtrado e
// por quanto tempo ele vale. Toda a busca reaproveita scripts/lib (a mesma
// lógica que os antigos `npm run sync:*` usavam), então o que sai daqui tem
// os mesmos filtros de privacidade: nada de e-mail, telefone, descrição etc.
//
// Os JSON de configuração (quem aparece em cada equipe, municípios, exceções do
// mapa) são importados, e não lidos com readFile, para irem junto com a função
// na Vercel.
import municipios from '../scripts/data/municipios.json' with { type: 'json' };
import overridesClientes from '../scripts/data/client-overrides.json' with { type: 'json' };
import equipeSuporte from '../scripts/data/support-team.json' with { type: 'json' };
import equipeDesenvolvimento from '../scripts/data/dev-team.json' with { type: 'json' };
import { STATUS_FECHADO, contarAtendimentos } from '../scripts/lib/build-atendimentos.mjs';
import { montarClientes } from '../scripts/lib/build-clients.mjs';
import { montarLicencas } from '../scripts/lib/build-licencas.mjs';
import { buildRoster } from '../scripts/lib/build-team.mjs';
import { baixarPaginas } from '../scripts/lib/licenca.mjs';
import { setTimeout as esperar } from 'node:timers/promises';
import { MilldeskError, fetchMilldesk, toRecords } from '../scripts/lib/milldesk.mjs';

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

// Pausa entre pedidos seguidos ao Milldesk, para não esbarrar no limite dele.
const PAUSA_ENTRE_PEDIDOS_MS = 400;

/**
 * Busca um endpoint do Milldesk e devolve a lista de registros. Quando a API
 * pede para esperar (HTTP 429), espera cada vez mais e tenta de novo.
 */
export async function buscarMilldesk(endpoint, { tentativas = 3, esperaMs = 5000 } = {}) {
  for (let tentativa = 1; ; tentativa += 1) {
    try {
      return toRecords(await fetchMilldesk(endpoint));
    } catch (erro) {
      const limitado = erro instanceof MilldeskError && erro.message.includes('HTTP 429');
      if (!limitado || tentativa >= tentativas) throw erro;
      await esperar(esperaMs * tentativa);
    }
  }
}

// Hoje em Brasília, "AAAA-MM-DD".
export const hojeEmBrasilia = (agora = Date.now()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);

export function inicioDoMesAnterior(data) {
  const ano = Number(data.slice(0, 4));
  const mes = Number(data.slice(5, 7));
  return mes === 1 ? `${ano - 1}-12-01` : `${ano}-${String(mes - 1).padStart(2, '0')}-01`;
}

// Em /desenvolvimento os nomes saem abreviados: o Milldesk guarda o nome
// completo dos desenvolvedores, comprido demais para o rótulo do boneco.
const EQUIPES = {
  suporte: { roster: equipeSuporte.team, file: 'support-team.json' },
  desenvolvimento: { roster: equipeDesenvolvimento.team, file: 'dev-team.json', shortNames: true },
};

// `team`: a equipe atual (os bonecos). `former`: quem saiu (desabilitado no
// Milldesk), para o histórico de tickets continuar no quadro.
const fonteEquipe = ({ roster, file, shortNames }) => ({
  idadeMaximaMs: DIA,
  buscar: async () => buildRoster(await buscarMilldesk('listAgents'), roster, { file, shortNames }),
});

/** @type {Record<string, { buscar: () => Promise<unknown>, idadeMaximaMs?: number }>} */
export const FONTES = {
  // Sino.Licença: as tabelas de vencidas e de vencimento próximo.
  licencas: {
    buscar: async () => {
      const { totalClientes, licencas } = montarLicencas(await baixarPaginas());
      return { totalClientes, licencas };
    },
  },

  'equipe-suporte': fonteEquipe(EQUIPES.suporte),
  'equipe-desenvolvimento': fonteEquipe(EQUIPES.desenvolvimento),

  // Atendimentos por dia (desde o dia 1 do mês anterior) e tickets em aberto
  // de cada técnico de suporte. Assunto, descrição e cliente não saem daqui.
  atendimentos: {
    buscar: async () => {
      const hoje = hojeEmBrasilia();
      const inicio = inicioDoMesAnterior(hoje);
      const periodo = await buscarMilldesk(`showTicketsPerPeriod?start=${inicio}&end=${hoje}`);
      const statusAbertos = (await buscarMilldesk('listTicketStatus'))
        .map(({ status }) => status)
        .filter((status) => status && status !== STATUS_FECHADO);
      const emAberto = [];
      // Um status por vez, com pausa, para não sobrecarregar a API.
      for (const status of statusAbertos) {
        await esperar(PAUSA_ENTRE_PEDIDOS_MS);
        emAberto.push(...(await buscarMilldesk(`showTicketsByStatus?status=${encodeURIComponent(status)}`)));
      }
      const { tecnicos } = contarAtendimentos(periodo, emAberto, EQUIPES.suporte.roster);
      return { periodo: { inicio, fim: hoje }, tecnicos };
    },
  },

  // Clientes do mapa da home, agrupados por cidade.
  clientes: {
    idadeMaximaMs: DIA,
    buscar: async () =>
      montarClientes(await buscarMilldesk('listLocals'), { municipios, overrides: overridesClientes }).clientes,
  },
};

export { EQUIPES };
