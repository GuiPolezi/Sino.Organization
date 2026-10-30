/*
 * No que cada pessoa da compilação está trabalhando (o card dela em /compilacao):
 * a responsabilidade atual, as cidades, as normas por período e por tipo, e a
 * atividade mais recente. Tudo fictício, escrito à mão como dados.js.
 *
 * Os formatos seguem o sistema Legislação Digital, de onde os dados virão um dia
 * (docs/compilacao-legislacao-digital.md, só local): a atividade tem os campos da
 * Auditoria (ação, cidade, módulo, data, hora e descrição).
 *
 * Responsabilidades:
 *   atualizacoes  mantém em dia as normas de várias cidades
 *   projetos      monta a base de uma cidade nova (uma cidade só)
 */
import { PRODUCAO, TIPOS_DE_NORMA, fimDeSemana, normasPorDia, somarDias, sorteioFixo } from './dados.js';
import { repartir } from './resumo.js';

export const RESPONSABILIDADES = {
  atualizacoes: { rotulo: 'Atualizações' },
  projetos: { rotulo: 'Projetos Novos' },
};

const cidade = (nome, uf) => ({ nome, uf });

/*
 * cidades: as de quem está em Atualizações (a primeira é a de agora).
 * projeto: a cidade de quem está em Projetos Novos.
 * alterada: quando a responsabilidade mudou pela última vez (dias úteis atrás e hora).
 */
const ATUACAO = {
  helena: {
    responsabilidade: 'atualizacoes',
    cidades: [cidade('Piracicaba', 'SP'), cidade('Limeira', 'SP'), cidade('Rio Claro', 'SP'), cidade('Águas de São Pedro', 'SP'), cidade('Americana', 'SP')],
    projeto: cidade('Indaiatuba', 'SP'),
    alterada: { diasUteis: 1, hora: '10:50' },
  },
  marcos: {
    responsabilidade: 'projetos',
    cidades: [cidade('Alfenas', 'MG'), cidade('Varginha', 'MG'), cidade('Lavras', 'MG')],
    projeto: cidade('Poços de Caldas', 'MG'),
    alterada: { diasUteis: 3, hora: '09:12' },
  },
  leticia: {
    responsabilidade: 'atualizacoes',
    cidades: [cidade('Londrina', 'PR'), cidade('Maringá', 'PR'), cidade('Cascavel', 'PR')],
    projeto: cidade('Toledo', 'PR'),
    alterada: { diasUteis: 2, hora: '14:37' },
  },
  bruno: {
    responsabilidade: 'atualizacoes',
    cidades: [
      cidade('Altinópolis', 'SP'),
      cidade('Batatais', 'SP'),
      cidade('Franca', 'SP'),
      cidade('Ribeirão Preto', 'SP'),
      cidade('Sertãozinho', 'SP'),
      cidade('Jardinópolis', 'SP'),
    ],
    projeto: cidade('Cravinhos', 'SP'),
    alterada: { diasUteis: 5, hora: '16:05' },
  },
  camila: {
    responsabilidade: 'projetos',
    cidades: [cidade('Itu', 'SP'), cidade('Salto', 'SP')],
    projeto: cidade('Alumínio', 'SP'),
    alterada: { diasUteis: 1, hora: '08:44' },
  },
  otavio: {
    responsabilidade: 'atualizacoes',
    cidades: [cidade('Botucatu', 'SP'), cidade('Avaré', 'SP'), cidade('Lençóis Paulista', 'SP'), cidade('São Manuel', 'SP')],
    projeto: cidade('Alambari', 'SP'),
    alterada: { diasUteis: 7, hora: '11:20' },
  },
  priscila: {
    responsabilidade: 'projetos',
    cidades: [cidade('Bauru', 'SP'), cidade('Jaú', 'SP')],
    projeto: cidade('Pederneiras', 'SP'),
    alterada: { diasUteis: 4, hora: '15:58' },
  },
};

/** "Piracicaba - SP" */
export const nomeDaCidade = ({ nome, uf }) => `${nome} - ${uf}`;

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

// O dia útil `quantos` dias úteis antes de `data`.
function diaUtilAntes(data, quantos) {
  let dia = data;
  for (let faltam = quantos; faltam > 0; ) {
    dia = somarDias(dia, -1);
    if (!fimDeSemana(dia)) faltam -= 1;
  }
  return dia;
}

/**
 * A atuação de agora: a responsabilidade (a escrita aqui, ou a escolhida no card),
 * as cidades dela e quando ela mudou pela última vez.
 *
 * @param {string} id
 * @param {string} hoje "AAAA-MM-DD"
 * @param {{ responsabilidade: string, alteradaEm: { data: string, hora: string } }} [escolha]
 */
export function atuacaoDe(id, hoje, escolha) {
  const base = ATUACAO[id];
  if (!base) return null;
  const responsabilidade = escolha?.responsabilidade ?? base.responsabilidade;
  const alteradaEm = escolha?.alteradaEm ?? { data: diaUtilAntes(hoje, base.alterada.diasUteis), hora: base.alterada.hora };
  return {
    responsabilidade,
    rotulo: RESPONSABILIDADES[responsabilidade].rotulo,
    cidades: responsabilidade === 'projetos' ? [base.projeto] : base.cidades,
    alteradaEm,
  };
}

export const PERIODOS = [
  { chave: 'tudo', rotulo: 'Todo o Tempo', dias: null },
  { chave: '30', rotulo: '30 Dias', dias: 30 },
  { chave: '7', rotulo: '07 Dias', dias: 7 },
  { chave: 'hoje', rotulo: 'Hoje', dias: 1 },
];

/**
 * Normas compiladas no período, no total e por tipo. `dias` conta para trás a
 * partir de hoje (1 = só hoje); sem `dias`, é todo o tempo, com as anteriores ao
 * histórico. Cada pessoa tem a própria mistura de tipos, fixa.
 *
 * @param {string} id
 * @param {string} hoje "AAAA-MM-DD"
 * @param {number | null} dias
 */
export function normasDoPeriodo(id, hoje, dias) {
  const porDia = normasPorDia(id, hoje);
  const desde = dias ? somarDias(hoje, 1 - dias) : '';
  const total =
    Object.entries(porDia).reduce((soma, [data, valor]) => (data >= desde && data <= hoje ? soma + valor : soma), 0) +
    (dias ? 0 : (PRODUCAO[id]?.anteriores ?? 0));

  const pesos = TIPOS_DE_NORMA.map(({ chave, parte }) => parte * (0.6 + sorteioFixo(`${id}:${chave}`) * 0.8));
  const somaDosPesos = pesos.reduce((a, b) => a + b, 0);
  const valores = repartir(
    total,
    pesos.map((peso) => peso / somaDosPesos),
  );
  return {
    total,
    porTipo: TIPOS_DE_NORMA.map(({ chave, rotulo, curto }, i) => ({ chave, rotulo: curto ?? rotulo, valor: valores[i] })),
  };
}

// O que pode aparecer na atividade, com o peso de cada um (os módulos da Auditoria).
const MODULOS = [
  { nome: 'Normas', peso: 3 },
  { nome: 'Datas', peso: 2 },
  { nome: 'Arquivos', peso: 3 },
  { nome: 'Versões', peso: 2 },
  { nome: 'Vínculos de Normas', peso: 2 },
  { nome: 'Classificações', peso: 2 },
];
const ACOES = [
  { nome: 'Inclusão', peso: 15 },
  { nome: 'Alteração', peso: 4 },
  { nome: 'Exclusão', peso: 1 },
];
const ESPECIES = ['Decreto Municipal', 'Lei Ordinária', 'Resolução', 'Portaria', 'Lei Complementar'];
const ASSUNTOS = ['Administração Pública', 'Tributação', 'Meio Ambiente', 'Saúde', 'Educação', 'Urbanismo'];

// Um item da lista, pelo peso, com o sorteio `s` de 0 a 1.
function pelosPesos(lista, s) {
  const total = lista.reduce((soma, { peso }) => soma + peso, 0);
  let alvo = s * total;
  return lista.find(({ peso }) => (alvo -= peso) < 0) ?? lista.at(-1);
}

const numeroDaNorma = new Intl.NumberFormat('pt-BR');
const comDoisDigitos = (n) => String(n).padStart(2, '0');
const paraHora = (minutos) => `${comDoisDigitos(Math.floor(minutos / 60))}:${comDoisDigitos(minutos % 60)}`;

function descricao(modulo, norma, data, s) {
  const dataCheia = `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
  switch (modulo) {
    case 'Datas':
      return `${norma} / Publicação: Publicação - Publicações - ${dataCheia}`;
    case 'Arquivos':
      return `${norma} / Arquivo: texto original (PDF)`;
    case 'Versões':
      return `${norma} / Versão compilada de ${dataCheia}`;
    case 'Vínculos de Normas':
      return `${norma} / Altera: Lei Ordinária nº ${numeroDaNorma.format(1000 + Math.floor(s * 4000))}/${Number(data.slice(0, 4)) - 1}`;
    case 'Classificações':
      return `${norma} / Classificação: ${ASSUNTOS[Math.floor(s * ASSUNTOS.length)]}`;
    default:
      return norma;
  }
}

// Começo e fim do expediente (minutos do dia) em que aparece atividade.
const EXPEDIENTE = { inicio: 8 * 60 + 5, fim: 18 * 60 };

/**
 * A atividade mais recente da pessoa, numa das cidades de agora. Num dia útil,
 * depois das 8h25, é de poucos minutos atrás (no máximo até as 18h); antes disso
 * e no fim de semana, do fim do último dia útil.
 * A mesma pessoa, no mesmo dia e com as mesmas cidades, tem a mesma atividade.
 *
 * @param {string} id
 * @param {{ nome: string, uf: string }[]} cidades
 * @param {{ data: string, hora: string }} agora em Brasília (agoraEmBrasilia)
 */
export function atividadeRecente(id, cidades, agora) {
  const sorteio = (qual) => sorteioFixo(`${id}:${agora.data}:${cidades[0]?.nome}:${qual}`);
  const minutos = Number(agora.hora.slice(0, 2)) * 60 + Number(agora.hora.slice(3, 5));
  const noExpediente = !fimDeSemana(agora.data) && minutos >= EXPEDIENTE.inicio + 20;

  const data = noExpediente ? agora.data : diaUtilAntes(agora.data, 1);
  const minuto = noExpediente
    ? Math.max(EXPEDIENTE.inicio, Math.min(minutos, EXPEDIENTE.fim) - 3 - Math.floor(sorteio('minutos') * 40))
    : EXPEDIENTE.fim - 15 - Math.floor(sorteio('minutos') * 90);

  const modulo = pelosPesos(MODULOS, sorteio('modulo')).nome;
  const especie = ESPECIES[Math.floor(sorteio('especie') * ESPECIES.length)];
  const norma = `${especie} nº ${numeroDaNorma.format(1000 + Math.floor(sorteio('numero') * 19000))}/${data.slice(0, 4)}`;
  const lugar = cidades[Math.floor(sorteio('cidade') * cidades.length)] ?? cidade('—', '—');

  return {
    acao: pelosPesos(ACOES, sorteio('acao')).nome,
    cidade: `${lugar.nome}-${lugar.uf}`,
    modulo,
    data,
    hora: paraHora(minuto),
    descricao: descricao(modulo, norma, data, sorteio('descricao')),
  };
}
