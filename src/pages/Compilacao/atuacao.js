/*
 * O card de cada pessoa em /compilacao, a partir dos dados do servidor
 * (/api/compilacao, scripts/lib/build-compilacao.mjs): a responsabilidade, onde
 * ela trabalha, as normas por período e por tipo, o que aguarda compilação e a
 * atividade mais recente. Aqui só se traduz para a tela: as contas são do servidor.
 *
 * Regra de vazio: 0 só quando a fonte respondeu 0; null vira "—" (sem dado, não
 * se aplica, a fonte não respondeu). Nunca "+—".
 *
 * Responsabilidades (fixas por configuração no servidor):
 *   atualizacoes  mantém em dia as normas das cidades da carteira (Hoje, Semana e
 *                 Mês pelo sistema; Todo o Tempo, carteira e aguardando pela planilha)
 *   projetos      monta a base de uma cidade nova (cidade e tipo(s) pelo sistema)
 */
import { TIPOS_DE_NORMA } from './dados.js';

export const RESPONSABILIDADES = {
  atualizacoes: { rotulo: 'Atualizações' },
  projetos: { rotulo: 'Projetos Novos' },
};

/** "Piracicaba - SP" (sem UF, só o nome). */
export const nomeDaCidade = ({ nome, uf }) => (uf ? `${nome} - ${uf}` : nome);

const formatoAgora = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * O instante em Brasília: data "AAAA-MM-DD" e hora "HH:MM".
 * @param {number} [agora] ms desde 1970
 */
export function agoraEmBrasilia(agora = Date.now()) {
  const partes = Object.fromEntries(formatoAgora.formatToParts(agora).map(({ type, value }) => [type, value]));
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

/** "30/10 - 10:50" */
export const rotuloDataHora = ({ data, hora }) => `${data.slice(8, 10)}/${data.slice(5, 7)} - ${hora}`;

/** "30/10" */
export const diaEMes = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "2026-10" -> "outubro" (ou "—" se não for um mês). */
export function nomeDoMes(mes) {
  const numero = Number(String(mes ?? '').slice(5, 7));
  return MESES[numero - 1] ?? '—';
}

/** "2026-10" -> "out." (o nome curto, para os subtítulos da Fila). */
export const mesCurto = (mes) => {
  const nome = nomeDoMes(mes);
  return nome === '—' || nome.length <= 4 ? nome : `${nome.slice(0, 3)}.`;
};

const formatoNumero = new Intl.NumberFormat('pt-BR');

/** 1234 -> "1.234"; null -> "—". */
export const numeroOuTraco = (valor) => (typeof valor === 'number' ? formatoNumero.format(valor) : '—');

/** 1234 -> "+1.234"; null -> "—" (nunca "+—"). */
export const comMais = (valor) => (typeof valor === 'number' ? `+${formatoNumero.format(valor)}` : '—');

// "2026-11-01T12:00:00.000Z" -> "01/11" em Brasília.
const diaDoIso = (iso) => {
  const instante = new Date(iso ?? '');
  return Number.isNaN(instante.getTime()) ? null : diaEMes(agoraEmBrasilia(instante.getTime()).data);
};

/**
 * A responsabilidade da pessoa e a linha abaixo dela.
 * Projetos: "Desde: DD/MM - HH:MM" (começo do projeto atual).
 * Atualizações: "Planilha de {mês} · importada em DD/MM".
 *
 * @param {object | null} pessoa a pessoa da resposta do servidor
 */
export function atuacaoDe(pessoa) {
  if (!pessoa || !RESPONSABILIDADES[pessoa.funcao]) return null;
  const responsabilidade = pessoa.funcao;
  let linha;
  if (responsabilidade === 'projetos') {
    linha = `Desde: ${pessoa.desde ? rotuloDataHora(pessoa.desde) : '—'}`;
  } else if (pessoa.planilha) {
    const importada = diaDoIso(pessoa.planilha.importadaEm);
    linha = `Planilha de ${nomeDoMes(pessoa.planilha.mes)}${importada ? ` · importada em ${importada}` : ''}`;
  } else {
    linha = 'Planilha: —';
  }
  return { responsabilidade, rotulo: RESPONSABILIDADES[responsabilidade].rotulo, linha };
}

/**
 * "Trabalhando em": a cidade de agora (com o(s) tipo(s), em Projetos) e as outras
 * da carteira (Atualizações, na ordem da ação mais recente).
 * @param {object | null} pessoa
 * @returns {{ atual: string, outras: string[] }}
 */
export function trabalhandoEm(pessoa) {
  if (pessoa?.funcao === 'projetos') {
    const projeto = pessoa.projeto;
    if (!projeto) return { atual: '—', outras: [] };
    const tipos = projeto.tipos?.length ? ` · ${projeto.tipos.join(' + ')}` : '';
    return { atual: `${nomeDaCidade(projeto.cidade)}${tipos}`, outras: [] };
  }
  const [atual, ...outras] = (pessoa?.cidades ?? []).map(nomeDaCidade);
  return { atual: atual ?? '—', outras };
}

export const PERIODOS = [
  { chave: 'tudo', rotulo: 'Todo o Tempo' },
  { chave: 'mes', rotulo: 'Mês' },
  { chave: 'semana', rotulo: 'Semana' },
  { chave: 'hoje', rotulo: 'Hoje' },
];

/** Período que o card abre: o Mês (Todo o Tempo de Projetos ainda não tem número). */
export const PERIODO_INICIAL = 'mes';

const LEGENDA_DA_FONTE = { sistema: 'pelo sistema', planilha: 'pela planilha' };

// Por que o período está "—".
function semDado(pessoa, periodo, deOutroDia) {
  if (deOutroDia) return 'aguardando os números de hoje';
  if (pessoa?.funcao === 'projetos' && periodo === 'tudo') return 'ainda sem histórico';
  return 'sem dado';
}

/**
 * Normas compiladas no período, no total e por tipo (os 6 e "Outros"), com a
 * fonte do número. Hoje só vale se os dados são de hoje (`referencia`); senão "—".
 *
 * @param {object | null} pessoa
 * @param {'tudo' | 'mes' | 'semana' | 'hoje'} periodo
 * @param {{ referencia?: string, hoje: string }} datas referencia: o dia dos dados; hoje: o do navegador
 */
export function normasDoPeriodo(pessoa, periodo, { referencia, hoje }) {
  const deOutroDia = periodo === 'hoje' && referencia !== hoje;
  const bruto = deOutroDia ? null : pessoa?.producao?.[periodo];
  const total = typeof bruto === 'number' ? bruto : null;
  const tipos = total === null ? null : pessoa?.porTipo?.[periodo];
  const fonte = total === null ? null : (pessoa?.fontes?.[periodo] ?? null);
  return {
    total,
    legenda: total === null ? semDado(pessoa, periodo, deOutroDia) : (LEGENDA_DA_FONTE[fonte] ?? ''),
    porTipo: TIPOS_DE_NORMA.map(({ chave, rotulo, curto }) => {
      const valor = tipos?.[chave];
      return { chave, rotulo: curto ?? rotulo, valor: typeof valor === 'number' ? valor : null };
    }),
  };
}

/**
 * "Aguardando Compilação": o número, a legenda da fonte e com quem a fila é
 * dividida (mesma cidade e tipo em Projetos).
 * @param {object | null} pessoa
 * @returns {{ valor: number | null, legenda: string, divididaCom: string[] }}
 */
export function aguardandoDe(pessoa) {
  const valor = typeof pessoa?.aguardando?.valor === 'number' ? pessoa.aguardando.valor : null;
  const divididaCom = pessoa?.projeto?.compartilhadaCom ?? [];
  if (pessoa?.funcao === 'projetos') return { valor, legenda: 'no projeto', divididaCom };
  const mes = pessoa?.aguardando?.mes;
  return { valor, legenda: mes ? `déficit · planilha de ${nomeDoMes(mes)}` : 'déficit da planilha', divididaCom: [] };
}

/**
 * A barra do projeto ("362 de 404 compiladas"), só em Projetos e com o estoque fechando.
 * @param {object | null} pessoa
 * @returns {{ compiladas: number, total: number, parte: number } | null}
 */
export function barraDoProjeto(pessoa) {
  const projeto = pessoa?.funcao === 'projetos' ? pessoa.projeto : null;
  const { compiladas, total } = projeto ?? {};
  if (typeof compiladas !== 'number' || typeof total !== 'number' || total <= 0 || compiladas > total) return null;
  return { compiladas, total, parte: Math.round((compiladas / total) * 1000) / 10 };
}

/**
 * A atividade mais recente, pronta para a tela (ou null: "Sem atividade recente").
 * @param {object | null} pessoa
 */
export function atividadeDe(pessoa) {
  const atividade = pessoa?.atividade;
  if (!atividade?.data) return null;
  const { nome, uf } = atividade.cidade ?? {};
  return {
    acao: atividade.acao ?? '—',
    cidade: nome ? (uf ? `${nome}-${uf}` : nome) : '—',
    modulo: atividade.modulo ?? '—',
    data: atividade.data,
    hora: atividade.hora ?? '—',
    descricao: atividade.descricao || '—',
  };
}
