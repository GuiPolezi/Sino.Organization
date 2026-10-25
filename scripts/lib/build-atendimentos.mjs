// Contagem dos atendimentos e dos tickets em aberto de cada técnico de suporte,
// a partir dos tickets crus do Milldesk. Sem acesso à rede: a API (server/fontes.mjs) busca, aqui só se conta.
//
// Atendimento é um ticket com uma destas tags no assunto:
//   "API ..."              técnico na linha "Técnico: Nome" da descrição; sem
//                          essa linha, vale o campo Técnico do ticket
//   "AtendimentoDiario ..." técnico no campo Técnico do ticket
// O dia do atendimento é a data de criação do ticket.
//
// Ticket em aberto é qualquer ticket com status diferente de "Fechado", contado
// pelo campo Técnico.

export const STATUS_FECHADO = 'Fechado';

const TAG_API = /^\s*API\b/;
const TAG_ATENDIMENTO_DIARIO = /\bAtendimentoDi[aá]rio\b/i;
const LINHA_TECNICO = /T[ée]cnico\s*:\s*([^\n]+)/i;
const DATA_MILLDESK = /^(\d{2})\/(\d{2})\/(\d{4})/;

// "Fábio " -> "fabio": compara nomes sem acento, caixa ou espaços sobrando.
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
const primeiroNome = (texto) => normalizar(texto).split(' ')[0];

// HTML da descrição vira texto, uma linha por <br> ou parágrafo.
const textoDaDescricao = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, '\n')
    .replace(/&nbsp;/g, ' ');

/** "01/10/2026" -> "2026-10-01"; null quando não é uma data do Milldesk. */
export function dataIso(dataMilldesk) {
  const partes = DATA_MILLDESK.exec(String(dataMilldesk ?? ''));
  return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : null;
}

/**
 * Quem fez o atendimento, como escrito no Milldesk, e de onde o nome saiu.
 * null quando o ticket não é um atendimento.
 * @returns {{ nome: string, origem: 'descricao' | 'campo' } | null}
 */
export function tecnicoDoAtendimento(ticket) {
  const assunto = String(ticket.ticket ?? '');
  if (TAG_API.test(assunto)) {
    const linha = LINHA_TECNICO.exec(textoDaDescricao(ticket.description));
    const nome = linha?.[1].trim();
    if (nome) return { nome, origem: 'descricao' };
    return ticket.agent ? { nome: ticket.agent, origem: 'campo' } : null;
  }
  if (TAG_ATENDIMENTO_DIARIO.test(assunto)) {
    return ticket.agent ? { nome: ticket.agent, origem: 'campo' } : null;
  }
  return null;
}

/**
 * Encontra o técnico da equipe pelo nome. O campo Técnico traz o nome exato do
 * Milldesk ("Guilherme P."); a descrição traz só o primeiro nome ("Guilherme"),
 * aceito quando um único técnico da equipe começa com ele.
 * @param {{ id: string, agent: string }[]} equipe
 * @returns {string | null} id do técnico
 */
export function idNaEquipe(equipe, nome, origem) {
  const exato = equipe.find(({ agent }) => normalizar(agent) === normalizar(nome));
  if (exato) return exato.id;
  if (origem !== 'descricao') return null;
  const mesmoPrimeiroNome = equipe.filter(({ agent }) => primeiroNome(agent) === primeiroNome(nome));
  return mesmoPrimeiroNome.length === 1 ? mesmoPrimeiroNome[0].id : null;
}

/**
 * @param {object[]} ticketsDoPeriodo  showTicketsPerPeriod
 * @param {object[]} ticketsEmAberto   showTicketsByStatus de cada status que não é "Fechado"
 * @param {{ id: string, agent: string }[]} equipe
 */
export function contarAtendimentos(ticketsDoPeriodo, ticketsEmAberto, equipe) {
  const tecnicos = Object.fromEntries(equipe.map(({ id }) => [id, { porDia: {}, chamadosAtribuidos: 0 }]));
  // Técnicos que não estão na equipe e tickets sem data: só para relatórios (a API não os devolve).
  const foraDaEquipe = {};
  let semData = 0;
  const vistos = new Set();

  for (const ticket of ticketsDoPeriodo) {
    if (vistos.has(ticket.id)) continue;
    vistos.add(ticket.id);
    const tecnico = tecnicoDoAtendimento(ticket);
    if (!tecnico) continue;
    const id = idNaEquipe(equipe, tecnico.nome, tecnico.origem);
    if (!id) {
      foraDaEquipe[tecnico.nome] = (foraDaEquipe[tecnico.nome] ?? 0) + 1;
      continue;
    }
    const dia = dataIso(ticket.start);
    if (!dia) {
      semData += 1;
      continue;
    }
    const { porDia } = tecnicos[id];
    porDia[dia] = (porDia[dia] ?? 0) + 1;
  }

  const abertosVistos = new Set();
  for (const ticket of ticketsEmAberto) {
    if (ticket.status === STATUS_FECHADO || abertosVistos.has(ticket.id)) continue;
    abertosVistos.add(ticket.id);
    const id = idNaEquipe(equipe, ticket.agent, 'campo');
    if (id) tecnicos[id].chamadosAtribuidos += 1;
  }

  // Dias em ordem, para o JSON gerado ficar fácil de ler.
  for (const tecnico of Object.values(tecnicos)) {
    tecnico.porDia = Object.fromEntries(Object.entries(tecnico.porDia).toSorted(([a], [b]) => a.localeCompare(b)));
  }
  return { tecnicos, foraDaEquipe, semData };
}
