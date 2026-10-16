/*
 * Contas do card do desenvolvedor. Tudo sai da lista de chamados dele: o filtro
 * de período escolhe os chamados e, deles, saem os totais por status, o total
 * atribuído, o quanto já foi feito, as categorias e o gráfico. Datas são sempre
 * "AAAA-MM-DD" no horário de Brasília, com a aritmética em UTC sobre essa data.
 */

/**
 * Um chamado atribuído ao desenvolvedor (api/chamados.js).
 *
 * @typedef {object} Chamado
 * @property {string} data       dia em que o chamado foi atribuído, "AAAA-MM-DD"
 * @property {string} status     status atual, com o nome do Milldesk
 * @property {string} categoria  sistema do chamado ("Siscam 9", "Site"…)
 * @property {string} tipo       tipo da solicitação ("Bug/Erro"…)
 * @property {string} [local]    cidade do cliente que abriu o chamado
 *
 * @typedef {object} ChamadosDesenvolvedor
 * @property {boolean} [ficticio] dados de demonstração, ainda sem backend
 * @property {Chamado[]} lista
 *
 * @typedef {'tudo' | '30d' | '7d' | 'hoje'} Periodo
 */

const UM_DIA_MS = 864e5;

/** Opções do filtro de período, na ordem do menu. `dias` conta hoje. */
export const PERIODOS = [
  { id: 'tudo', rotulo: 'Todo o Tempo' },
  { id: '30d', rotulo: '30 Dias', dias: 30 },
  { id: '7d', rotulo: '7 Dias', dias: 7 },
  { id: 'hoje', rotulo: 'Hoje', dias: 1 },
];

export const FECHADO = 'Fechado';
export const COM_O_DESENVOLVEDOR = 'Com o desenvolvedor';

/*
 * O número grande do card. "Fechado" e não "Com o desenvolvedor": o card abre
 * com o que a pessoa entregou no período (o que o filtro de período mede melhor),
 * e a fila de agora fica na grade, ao lado dos outros status em aberto. Trocar
 * por 'Com o desenvolvedor' devolve "Fechado" à grade, no lugar do design.
 */
export const STATUS_DESTAQUE = FECHADO;

// Sempre na grade do card, mesmo zerados, nesta ordem (a do fluxo do chamado).
const STATUS_FIXOS = [COM_O_DESENVOLVEDOR, 'Em atendimento', FECHADO, 'Aguardando Testes', 'Aguardando Retorno do Solicitante'];
// Só entram na grade de quem tem chamados nesses status.
const STATUS_EVENTUAIS = ['Pendente', 'Aguardando Deploy'];

/**
 * Ordena status pelo fluxo do chamado; os que o card não conhece vão para o fim,
 * em ordem alfabética.
 * @param {string} a
 * @param {string} b
 */
export function compararStatus(a, b) {
  const fluxo = [...STATUS_FIXOS, ...STATUS_EVENTUAIS];
  const posicao = (status) => (fluxo.includes(status) ? fluxo.indexOf(status) : fluxo.length);
  return posicao(a) - posicao(b) || porNome(a, b);
}

/** Tipos de solicitação do gráfico, sempre nesta ordem, mesmo zerados. */
export const TIPOS = ['Bug/Erro', 'Melhoria/Função', 'Implantação', 'Dúvidas', 'Migração/Dados'];

/** Categorias (sistemas) dos chamados, na ordem dos botões de Desempenho do quadro. */
export const CATEGORIAS = [
  'Cartórios',
  'Siscam 9',
  'Siscam 8',
  'Site',
  'App Mobile',
  'Painel',
  'Sistema (Outros)',
  'Legislação Digital',
];

const paraUtc = (data) => Date.parse(`${data}T00:00:00Z`);
const somarDias = (data, dias) => new Date(paraUtc(data) + dias * UM_DIA_MS).toISOString().slice(0, 10);
const porNome = (a, b) => a.localeCompare(b, 'pt-BR');

/**
 * Os chamados atribuídos dentro do período, de hoje para trás.
 * @param {Chamado[]} chamados
 * @param {Periodo} periodo
 * @param {string} hoje "AAAA-MM-DD"
 */
export function filtrarPorPeriodo(chamados, periodo, hoje) {
  const { dias } = PERIODOS.find(({ id }) => id === periodo) ?? PERIODOS[0];
  if (!dias) return chamados;
  const inicio = somarDias(hoje, 1 - dias);
  return chamados.filter(({ data }) => data >= inicio && data <= hoje);
}

function contarPor(chamados, campo) {
  const totais = new Map();
  for (const chamado of chamados) totais.set(chamado[campo], (totais.get(chamado[campo]) ?? 0) + 1);
  return totais;
}

/*
 * Os status da grade, menos o do destaque. Saem de todos os chamados da pessoa,
 * e não só dos do período, para a grade não mudar de forma a cada troca de
 * período: quem tem chamados "Pendente" mantém o card dele, zerado se for o caso.
 * Um status que o card ainda não conhece entra no fim, em ordem alfabética.
 */
function statusDaGrade(todos) {
  const existentes = new Set(todos.map(({ status }) => status));
  const conhecidos = new Set([...STATUS_FIXOS, ...STATUS_EVENTUAIS]);
  const novos = [...existentes].filter((status) => !conhecidos.has(status)).sort(porNome);
  return [...STATUS_FIXOS, ...STATUS_EVENTUAIS.filter((status) => existentes.has(status)), ...novos].filter(
    (status) => status !== STATUS_DESTAQUE,
  );
}

/*
 * Parte feita, em % inteiro. O arredondamento nunca mostra 100% com chamado em
 * aberto nem 0% com algum fechado. Sem chamados no período, não há o que medir.
 */
function percentual(parte, total) {
  if (!total) return null;
  const valor = Math.round((parte / total) * 100);
  if (parte < total) return Math.max(Math.min(valor, 99), parte > 0 ? 1 : 0);
  return 100;
}

/*
 * Categorias com chamados no período. A ordem vem do total de todos os
 * chamados, para as pílulas não trocarem de lugar a cada troca de período.
 * Cada uma traz os tipos do gráfico: os fixos e, depois, algum novo que ela tenha.
 */
function categoriasDoPeriodo(todos, doPeriodo) {
  const ordem = [...contarPor(todos, 'categoria')].sort(([a, totalA], [b, totalB]) => totalB - totalA || porNome(a, b));
  const noPeriodo = contarPor(doPeriodo, 'categoria');

  return ordem
    .filter(([nome]) => noPeriodo.has(nome))
    .map(([nome]) => {
      const tiposDaCategoria = contarPor(
        doPeriodo.filter(({ categoria }) => categoria === nome),
        'tipo',
      );
      const novos = [...new Set(todos.filter(({ categoria }) => categoria === nome).map(({ tipo }) => tipo))]
        .filter((tipo) => !TIPOS.includes(tipo))
        .sort(porNome);
      return {
        nome,
        total: noPeriodo.get(nome),
        tipos: [...TIPOS, ...novos].map((tipo) => ({ tipo, total: tiposDaCategoria.get(tipo) ?? 0 })),
      };
    });
}

/**
 * Tudo o que o card mostra, para um período.
 *
 * @param {Chamado[]} todos todos os chamados do desenvolvedor
 * @param {Periodo} periodo
 * @param {string} hoje "AAAA-MM-DD"
 */
export function resumirChamados(todos, periodo, hoje) {
  const doPeriodo = filtrarPorPeriodo(todos, periodo, hoje);
  const porStatus = contarPor(doPeriodo, 'status');
  const totalDe = (status) => porStatus.get(status) ?? 0;

  return {
    total: doPeriodo.length,
    destaque: { status: STATUS_DESTAQUE, total: totalDe(STATUS_DESTAQUE) },
    status: statusDaGrade(todos).map((status) => ({ status, total: totalDe(status) })),
    percentualFeito: percentual(totalDe(FECHADO), doPeriodo.length),
    categorias: categoriasDoPeriodo(todos, doPeriodo),
  };
}
