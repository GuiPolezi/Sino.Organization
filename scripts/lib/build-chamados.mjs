// Chamados de cada desenvolvedor, a partir dos tickets crus do Milldesk. Sem
// acesso à rede: o sync busca, aqui só se classifica e se conta.
//
// De cada ticket saem só campos de classificação: data de criação, status,
// categoria, assunto (a subcategoria do Milldesk), local (o campo Local do
// ticket) e data de fechamento. Título, descrição e solicitante nunca saem daqui.
//
// Só entram tickets cuja categoria está em CATEGORIAS_MILLDESK. Os demais ficam
// fora de tudo (status, total e categorias) e aparecem só no relatório do sync.
import { dataIso } from './build-atendimentos.mjs';

export const FECHADO = 'Fechado';

// "Siscam 8 - WorkFlow " -> "siscam 8 - workflow": compara sem acento, caixa ou espaços sobrando.
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/*
 * Categoria do site -> categorias do Milldesk que entram nela. Os nomes à
 * esquerda são os de src/pages/Desenvolvimento/mappers/chamados.js (CATEGORIAS).
 * "Siscam 9 WEB" e "Site - Transmissão Sessão" são como "Siscam 9" e
 * "Site - Transmissão" estão escritos no Milldesk.
 */
export const CATEGORIAS_MILLDESK = {
  Cartórios: [
    'Cartórios - Selo Digital',
    'Cartórios - Escrituras',
    'Cartórios - Firmas',
    'Cartórios - Financeiro',
    'Cartórios - Cobrança',
  ],
  'Siscam 9': ['Siscam 9', 'Siscam 9 WEB'],
  'Siscam 8': [
    'Siscam 8 - Desktop',
    'Siscam 8 - Siave',
    'Siscam 8 - Workflow',
    'Siscam 8 - Arquivamento',
    'Siscam 8 - Interop',
    'Siscam 8 - Sincronizador',
    'Siscam 8 - Sino.Assinador',
  ],
  Site: [
    'Site',
    'Site - Consulta Pública',
    'Site - Controle de Viagens',
    'Site - Transmissão',
    'Site - Transmissão Sessão',
    'Site - Ouvidoria e SIC',
  ],
  'App Mobile': ['App Mobile', 'Aplicativo Mobile Campinas'],
  Painel: ['Painel de Votação'],
  'Sistema (Outros)': ['Sistema - Gabinete', 'Sistema - Recepção'],
  'Legislação Digital': ['Legislação Digital'],
};

const CATEGORIA_DO_SITE = new Map(
  Object.entries(CATEGORIAS_MILLDESK).flatMap(([site, doMilldesk]) => doMilldesk.map((nome) => [normalizar(nome), site])),
);

/** Categoria do site para a categoria do Milldesk, ou null quando ela não entra. */
export const categoriaDoSite = (categoria) => CATEGORIA_DO_SITE.get(normalizar(categoria)) ?? null;

/*
 * Status com o nome que o card usa. Um status que não está aqui segue como veio
 * do Milldesk e vira mais um quadro no card de quem tem tickets nele. É o caso de
 * "Com o Desenvolvimento", que é outro status, separado de "Com o Desenvolvedor".
 */
const STATUS_CONHECIDOS = [
  FECHADO,
  'Com o desenvolvedor',
  'Em atendimento',
  'Aguardando Testes',
  'Aguardando Retorno do Solicitante',
  'Pendente',
  'Aguardando Deploy',
];
const STATUS_DO_SITE = new Map(STATUS_CONHECIDOS.map((status) => [normalizar(status), status]));

/** @returns {string | null} null quando o ticket não tem status */
export function statusDoSite(status) {
  const nome = String(status ?? '').replace(/\s+/g, ' ').trim();
  if (!nome || nome === 'null') return null;
  return STATUS_DO_SITE.get(normalizar(nome)) ?? nome;
}

export const SEM_ASSUNTO = 'Sem assunto';

/** O assunto do gráfico do card: a subcategoria do Milldesk. */
export function assuntoDoTicket(subcategoria) {
  const nome = String(subcategoria ?? '').replace(/\s+/g, ' ').trim();
  return nome && nome !== 'null' ? nome : SEM_ASSUNTO;
}

/** O local do ticket (o campo Local do Milldesk), ou null quando ele não tem. */
export function localDoTicket(local) {
  const nome = String(local ?? '').replace(/\s+/g, ' ').trim();
  return nome && nome !== 'null' ? nome : null;
}

/**
 * @param {object[]} tickets  showTicketsPerPeriod, de todas as janelas
 * @param {{ id: string, agent: string }[]} equipe  scripts/data/dev-team.json
 */
export function montarChamados(tickets, equipe) {
  const porAgente = new Map(equipe.map(({ id, agent }) => [normalizar(agent), id]));
  const desenvolvedores = Object.fromEntries(equipe.map(({ id }) => [id, []]));
  // Só para o relatório do sync.
  const categoriasIgnoradas = {};
  let semData = 0;
  const vistos = new Set();

  for (const ticket of tickets) {
    if (vistos.has(ticket.id)) continue;
    vistos.add(ticket.id);
    const id = porAgente.get(normalizar(ticket.agent));
    if (!id) continue;

    const categoria = categoriaDoSite(ticket.category);
    if (!categoria) {
      const nome = String(ticket.category ?? 'null');
      categoriasIgnoradas[nome] = (categoriasIgnoradas[nome] ?? 0) + 1;
      continue;
    }
    const data = dataIso(ticket.start);
    const status = statusDoSite(ticket.status);
    if (!data || !status) {
      semData += 1;
      continue;
    }

    const chamado = { data, status, categoria, assunto: assuntoDoTicket(ticket.subcategory) };
    const local = localDoTicket(ticket.location);
    if (local) chamado.local = local;
    const fechadoEm = status === FECHADO ? dataIso(ticket.end) : null;
    if (fechadoEm) chamado.fechadoEm = fechadoEm;
    desenvolvedores[id].push(chamado);
  }

  // Do mais novo para o mais antigo, como a lista que o card recebe.
  for (const lista of Object.values(desenvolvedores)) lista.sort((a, b) => b.data.localeCompare(a.data));
  return { desenvolvedores, categoriasIgnoradas, semData };
}
