/*
 * O card de cada pessoa em /compilacao, a partir dos dados do servidor
 * (/api/compilacao, scripts/lib/build-compilacao.mjs): a responsabilidade, onde
 * ela trabalha, as normas por período e por tipo, o que aguarda compilação e a
 * atividade mais recente. Aqui só se traduz para a tela: as contas são do servidor.
 *
 * Regra de vazio: 0 só quando a fonte respondeu 0; null vira "—" (sem dado, não
 * se aplica, a fonte não respondeu). Nunca "+—".
 *
 * Responsabilidades. A configurada no servidor (`pessoa.funcao`) é uma das duas
 * primeiras; qualquer pessoa da página pode trocar pelo "Alterar", e a escolha
 * salva (/api/compilacao/responsabilidades) vale no lugar da configurada:
 *   atualizacoes          mantém em dia as normas das cidades da carteira (normas pelo
 *                         sistema, inclusões em Normas; carteira e aguardando pela planilha)
 *   projetos              monta a base de uma cidade nova (cidade e tipo(s) pelo sistema)
 *   projetos_finalizando  fechando o projeto: as ações não contam, o card mostra as vinculadas
 *   projetos_sem_normas   sem normas para compilar: a seção Normas fica desativada
 */
import { TIPOS_DE_NORMA } from './dados.js';

/**
 * palavra: a palavra grande do card; grupo: de qual das duas configuradas ela é;
 * situacao: a linha "Situação" (tom: a cor); normas: como a seção Normas aparece.
 */
export const RESPONSABILIDADES = {
  atualizacoes: { rotulo: 'Atualizações', palavra: 'Atualizações', grupo: 'atualizacoes', situacao: null, normas: 'normal' },
  projetos: { rotulo: 'Projetos Novos', palavra: 'Projetos Novos', grupo: 'projetos', situacao: null, normas: 'normal' },
  projetos_finalizando: {
    rotulo: 'Projetos Novos - Finalizando',
    palavra: 'Projetos Novos',
    grupo: 'projetos',
    situacao: { texto: 'Finalizando', tom: 'finalizando' },
    normas: 'vinculadas',
  },
  projetos_sem_normas: {
    rotulo: 'Projetos Novos - Sem normas',
    palavra: 'Projetos Novos',
    grupo: 'projetos',
    situacao: { texto: 'Sem normas', tom: 'semNormas' },
    normas: 'desativada',
  },
};

/** As opções do "Alterar", na ordem da caixa. */
export const OPCOES_DE_RESPONSABILIDADE = Object.entries(RESPONSABILIDADES).map(([chave, opcao]) => ({ chave, ...opcao }));

/** Se é uma das chaves de RESPONSABILIDADES (só as próprias: "constructor", "__proto__" etc. não). */
export const ehResponsabilidade = (chave) => typeof chave === 'string' && Object.hasOwn(RESPONSABILIDADES, chave);

// As duas que o servidor configura.
const CONFIGURADAS = ['atualizacoes', 'projetos'];

/**
 * A responsabilidade que vale: a escolha salva; sem ela, a configurada.
 * @param {object | null} pessoa a pessoa da resposta do servidor
 * @param {{ chave: string, alteradaEm?: string } | null} [salva]
 * @returns {string | null}
 */
export function chaveEfetiva(pessoa, salva) {
  if (ehResponsabilidade(salva?.chave)) return salva.chave;
  return CONFIGURADAS.includes(pessoa?.funcao) ? pessoa.funcao : null;
}

/**
 * A pessoa como o card a mostra na responsabilidade que vale: `funcao` vira o
 * grupo dela, e `responsabilidade`, a chave. Quem foi para o outro grupo (de
 * Atualizações para um dos Projetos, ou o contrário) perde o que é só do grupo
 * configurado (projeto, "desde", planilha, aguardando): o card mostra "—" ali.
 *
 * @param {object | null} pessoa
 * @param {{ chave: string } | null} [salva]
 */
export function naResponsabilidade(pessoa, salva) {
  const chave = chaveEfetiva(pessoa, salva);
  if (!pessoa || !chave) return null;
  const { grupo } = RESPONSABILIDADES[chave];
  if (grupo === pessoa.funcao) return { ...pessoa, responsabilidade: chave };
  return { ...pessoa, funcao: grupo, responsabilidade: chave, desde: null, planilha: null, projeto: null, aguardando: null };
}

/**
 * Só as escolhas válidas da resposta de GET /api/compilacao/responsabilidades.
 * @param {unknown} corpo
 * @returns {Record<string, { chave: string, alteradaEm: string | null }>}
 */
export function lerResponsabilidades(corpo) {
  const lista = corpo?.responsabilidades;
  if (!lista || typeof lista !== 'object') return {};
  return Object.fromEntries(
    Object.entries(lista)
      .filter(([, valor]) => ehResponsabilidade(valor?.chave))
      .map(([personagem, { chave, alteradaEm }]) => [personagem, { chave, alteradaEm: alteradaEm ?? null }]),
  );
}

const ERRO_CURTO = 120;

/**
 * O que dizer quando salvar a troca falhou. No 429 vale a mensagem do servidor,
 * se for curta (ele diz se a troca foi agora há pouco ou se há trocas demais);
 * nos outros, a mensagem do servidor (técnica) não aparece: quem chama a deixa no console.
 * @param {{ status: number, erro?: unknown }} falha status 0: sem resposta (rede)
 */
export function mensagemDeFalha({ status, erro }) {
  if (status === 429) {
    const doServidor = typeof erro === 'string' ? erro.trim() : '';
    return doServidor && doServidor.length <= ERRO_CURTO ? doServidor : 'Aguarde um instante e tente de novo.';
  }
  if (status === 503) return 'Ainda não dá para salvar: o servidor está sendo preparado.';
  return 'Não deu para salvar. Tente de novo.';
}

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

// "2026-10-30T13:50:00.000Z" -> "30/10 - 10:50" em Brasília.
const dataHoraDoIso = (iso) => {
  const instante = new Date(iso ?? '');
  return Number.isNaN(instante.getTime()) ? null : rotuloDataHora(agoraEmBrasilia(instante.getTime()));
};

/**
 * A responsabilidade que vale, a situação (nos Projetos que têm uma) e a linha
 * da direita. Com uma escolha salva: "Última Alteração: DD/MM - HH:MM". Sem ela,
 * Projetos: "Desde: DD/MM - HH:MM" (começo do projeto atual);
 * Atualizações: "Planilha de {mês} · importada em DD/MM".
 *
 * @param {object | null} pessoa a pessoa da resposta do servidor
 * @param {{ chave: string, alteradaEm?: string | null } | null} [salva] a escolha salva, se houver
 */
export function atuacaoDe(pessoa, salva = null) {
  const vista = naResponsabilidade(pessoa, salva);
  if (!vista) return null;
  const { palavra, situacao, normas } = RESPONSABILIDADES[vista.responsabilidade];
  const alterada = ehResponsabilidade(salva?.chave) ? dataHoraDoIso(salva.alteradaEm) : null;
  let linha;
  if (alterada) {
    linha = `Última Alteração: ${alterada}`;
  } else if (vista.funcao === 'projetos') {
    linha = `Desde: ${vista.desde ? rotuloDataHora(vista.desde) : '—'}`;
  } else if (vista.planilha) {
    const importada = diaDoIso(vista.planilha.importadaEm);
    linha = `Planilha de ${nomeDoMes(vista.planilha.mes)}${importada ? ` · importada em ${importada}` : ''}`;
  } else {
    linha = 'Planilha: —';
  }
  return { responsabilidade: vista.responsabilidade, rotulo: palavra, situacao, normas, linha };
}

const FALHA_MINIMA_MS = 6_000;
const FALHA_MAXIMA_MS = 60_000;

/**
 * Quanto tempo a mensagem de falha fica na tela: 6 s, ou o Retry-After do
 * servidor se for maior (até 60 s). Aceita segundos ou uma data HTTP.
 * @param {string | null | undefined} retryAfter o cabeçalho, como veio
 * @param {number} [agora] ms desde 1970 (para a data HTTP)
 */
export function tempoDaFalha(retryAfter, agora = Date.now()) {
  const texto = String(retryAfter ?? '').trim();
  let ms = 0;
  if (/^\d+$/.test(texto)) ms = Number(texto) * 1000;
  else if (texto && !Number.isNaN(Date.parse(texto))) ms = Date.parse(texto) - agora;
  return Math.min(FALHA_MAXIMA_MS, Math.max(FALHA_MINIMA_MS, ms));
}

/**
 * "Normas Vinculadas" de quem está finalizando: as normas vinculadas da cidade
 * do projeto (o número grande do card).
 * @param {object | null} pessoa
 * @returns {{ valor: number | null, rotulo: string, legenda: string }}
 */
export function vinculadasDe(pessoa) {
  const valor = typeof pessoa?.vinculadas?.valor === 'number' ? pessoa.vinculadas.valor : null;
  return { valor, rotulo: valor === 1 ? 'Vinculada' : 'Vinculadas', legenda: valor === null ? 'sem dado' : '' };
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
