// Períodos das reuniões: status do selo, filtros, contagem e paginação.
// Funções puras; o "agora" chega por parâmetro. Tudo no horário de Brasília
// (ver paraDate em reunioes.js: offset fixo -03:00).

import { paraDate, paraDataHoraLocal } from './reunioes.js';

export const FUSO = 'America/Sao_Paulo';

export const FILTROS = Object.freeze([
  { id: 'todas', rotulo: 'Todas' },
  { id: 'em-breve', rotulo: 'Em Breve' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'encerradas', rotulo: 'Encerradas' },
]);

export const STATUS = Object.freeze({
  'em-breve': { id: 'em-breve', rotulo: 'Em breve' },
  hoje: { id: 'hoje', rotulo: 'Hoje' },
  encerrada: { id: 'encerrada', rotulo: 'Encerrada' },
});

export const POR_PAGINA = 5;

const DURACAO_PADRAO_MS = 60 * 60_000; // registros antigos sem horaFim
const DIA_MS = 24 * 60 * 60_000;

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-Feira',
  'Terça-Feira',
  'Quarta-Feira',
  'Quinta-Feira',
  'Sexta-Feira',
  'Sábado',
];

// Date -> "YYYY-MM-DD" em Brasília.
export const diaDe = (data) => paraDataHoraLocal(data).slice(0, 10);

// Date do início, ou null se dataHora for inválida.
export const inicioDe = (reuniao) => paraDate(reuniao?.dataHora);

// Date do fim (mesmo dia do início). Sem horaFim válido: início + 60 min.
export const fimDe = (reuniao) => {
  const inicio = inicioDe(reuniao);
  if (!inicio) return null;
  const fim = paraDate(`${diaDe(inicio)}T${String(reuniao.horaFim ?? '').slice(0, 5)}`);
  return fim && fim > inicio ? fim : new Date(inicio.getTime() + DURACAO_PADRAO_MS);
};

const ms = (d) => (d ? d.getTime() : -Infinity); // inválida = passado remoto

// 'encerrada' | 'hoje' | 'em-breve'. Em andamento conta como 'hoje'.
export const statusDe = (reuniao, agora = new Date()) => {
  const inicio = inicioDe(reuniao);
  if (!inicio || ms(fimDe(reuniao)) <= agora.getTime()) return 'encerrada';
  return diaDe(inicio) === diaDe(agora) ? 'hoje' : 'em-breve';
};

// Cada filtro mostra só as reuniões com o selo correspondente (statusDe):
// não se sobrepõem, e Em Breve + Hoje + Encerradas = Todas.
const REGRAS = {
  todas: () => true,
  'em-breve': (r, agora) => statusDe(r, agora) === 'em-breve',
  hoje: (r, agora) => statusDe(r, agora) === 'hoje',
  encerradas: (r, agora) => statusDe(r, agora) === 'encerrada',
};

const CRESCENTE = new Set(['em-breve', 'hoje']);

const filtroValido = (id) => (Object.hasOwn(REGRAS, id) ? id : 'todas');

// Lista filtrada e ordenada (nova; não muta a entrada).
// 'todas'/'encerradas': início decrescente; 'em-breve'/'hoje': crescente.
export const filtrarReunioes = (reunioes, filtroId, agora = new Date()) => {
  const id = filtroValido(filtroId);
  const sinal = CRESCENTE.has(id) ? 1 : -1;
  return (Array.isArray(reunioes) ? reunioes : [])
    .filter((r) => REGRAS[id](r, agora))
    .map((r) => [r, ms(inicioDe(r))])
    .sort(([, a], [, b]) => (a === b ? 0 : a < b ? -sinal : sinal))
    .map(([r]) => r);
};

// { todas, 'em-breve', hoje, encerradas }
export const contarPorFiltro = (reunioes, agora = new Date()) => {
  const lista = Array.isArray(reunioes) ? reunioes : [];
  return Object.fromEntries(
    FILTROS.map(({ id }) => [id, lista.filter((r) => REGRAS[id](r, agora)).length]),
  );
};

// Página 1-based, limitada a [1, totalPaginas]. inicio/fim 1-based ("1–5 de 12").
export const paginar = (lista, pagina, porPagina = POR_PAGINA) => {
  const itensTodos = Array.isArray(lista) ? lista : [];
  const por = Math.max(1, Math.trunc(Number(porPagina)) || POR_PAGINA);
  const total = itensTodos.length;
  const totalPaginas = Math.max(1, Math.ceil(total / por));
  const p = Math.min(totalPaginas, Math.max(1, Math.trunc(Number(pagina)) || 1));
  const de = (p - 1) * por;
  const itens = itensTodos.slice(de, de + por);
  return {
    itens,
    pagina: p,
    totalPaginas,
    total,
    inicio: total ? de + 1 : 0,
    fim: total ? de + itens.length : 0,
  };
};

// { diaSemana: 'Terça-Feira', data: '20/10/2026', horario: '16:20 às 17:20' }
export const partesDataHora = (reuniao) => {
  const inicio = inicioDe(reuniao);
  if (!inicio) return { diaSemana: '', data: '', horario: '' };
  const local = paraDataHoraLocal(inicio);
  const [ano, mes, dia] = local.slice(0, 10).split('-');
  const semana = new Date(Date.UTC(+ano, +mes - 1, +dia)).getUTCDay();
  return {
    diaSemana: DIAS_SEMANA[semana],
    data: `${dia}/${mes}/${ano}`,
    horario: `${local.slice(11)} às ${paraDataHoraLocal(fimDe(reuniao)).slice(11)}`,
  };
};

// Próxima meia-noite de Brasília depois de `agora`.
const proximaMeiaNoite = (agora) =>
  new Date(paraDate(`${diaDe(agora)}T00:00`).getTime() + DIA_MS);

// ms até a próxima troca de status/filtro de alguma reunião (início, fim ou
// meia-noite de Brasília), ou null se nada mais muda. Use para agendar um
// setTimeout que recalcula a lista.
export const msAteProximaMudanca = (reunioes, agora = new Date()) => {
  const t = agora.getTime();
  const hoje = diaDe(agora);
  let proximo = Infinity;
  let meiaNoiteImporta = false;
  for (const r of Array.isArray(reunioes) ? reunioes : []) {
    const inicio = inicioDe(r);
    if (!inicio) continue;
    for (const x of [inicio.getTime(), fimDe(r).getTime()]) {
      if (x > t && x < proximo) proximo = x;
    }
    if (diaDe(inicio) >= hoje) meiaNoiteImporta = true;
  }
  if (meiaNoiteImporta) proximo = Math.min(proximo, proximaMeiaNoite(agora).getTime());
  return Number.isFinite(proximo) ? proximo - t : null;
};
