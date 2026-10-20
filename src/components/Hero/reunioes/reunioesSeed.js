// Reuniões de EXEMPLO para a demonstração do modal "Reuniões".
//
// TODO(banco de dados): isto é só demonstração. Quando houver backend,
// apagar este arquivo e a semeadura em reunioesRepo.js (semearExemplos):
// as reuniões passam a vir do servidor e nada deve ser inventado no cliente.
//
// As datas são RELATIVAS a `agora` (horário de Brasília) para que sempre
// existam reuniões "em breve", "hoje" e "encerradas". Determinístico dado
// `agora`, exceto os ids (gerarId).

import { MODALIDADES, gerarId } from './reunioes.js';

const { PRESENCIAL, DIGITAL } = MODALIDADES;

// Brasília: UTC−03:00 fixo (sem horário de verão desde 2019).
const OFFSET_BRT_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
const MIN_FIM_DO_DIA = 23 * 60 + 59;

// Espelha os `name` de src/data/team.json e src/data/dev-team.json (sem
// importar o JSON para o módulo rodar também no `node --test`).
const SUPORTE = ['Roberto', 'Fábio', 'Guilherme P.', 'Luiz'];
const DEV = [
  'Adriano', 'Antonio', 'Arnaldo', 'Caique', 'Donizeti',
  'Eduardo', 'Guilherme', 'Gustavo', 'Ketlyn', 'Rafael',
];

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

// Dia de Brasília como "Date UTC à meia-noite" (só usamos getters UTC).
const diaBrt = (agora) => {
  const d = new Date(agora.getTime() - OFFSET_BRT_MS);
  return {
    dia: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    minutos: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
};

const ehFimDeSemana = (diaMs) => {
  const s = new Date(diaMs).getUTCDay();
  return s === 0 || s === 6;
};

// Desloca `dias` e empurra para dia útil (frente se futuro, trás se passado).
const diaUtil = (base, dias) => {
  let d = base + dias * DIA_MS;
  const passo = dias >= 0 ? DIA_MS : -DIA_MS;
  while (ehFimDeSemana(d)) d += passo;
  return d;
};

const dataIso = (diaMs) => {
  const d = new Date(diaMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const membros = (nomes) => nomes.map((nome) => ({ id: gerarId(), nome }));

// Monta a reunião; criadaEm = 3 dias antes do início (ou `agora`, o que vier antes).
const reuniao = (agora, diaMs, inicioMin, fimMin, titulo, modalidade, nomes) => {
  const instante = diaMs + inicioMin * 60 * 1000 + OFFSET_BRT_MS;
  const criada = Math.min(agora.getTime(), instante - 3 * DIA_MS);
  return {
    id: gerarId(),
    titulo,
    dataHora: `${dataIso(diaMs)}T${hhmm(inicioMin)}`,
    horaFim: hhmm(fimMin),
    modalidade,
    membros: membros(nomes),
    criadaEm: new Date(criada).toISOString(),
  };
};

export const gerarReunioesExemplo = (agora = new Date()) => {
  const { dia: hoje, minutos: m } = diaBrt(agora);
  const lista = [];
  const add = (...args) => lista.push(reuniao(agora, ...args));

  // --- Hoje ---------------------------------------------------------------
  // Já encerrada: 09:00–09:45 se já passou; senão termina no último quarto
  // de hora. Sem espaço (madrugada) vira encerrada de ontem.
  const tituloCedo = 'Revisão de chamados críticos';
  const nomesCedo = ['Roberto', 'Fábio', 'Luiz'];
  if (m >= 9 * 60 + 45) add(hoje, 9 * 60, 9 * 60 + 45, tituloCedo, DIGITAL, nomesCedo);
  else {
    const fim = Math.floor(m / 15) * 15;
    if (fim - 30 >= 0) add(hoje, fim - 30, fim, tituloCedo, DIGITAL, nomesCedo);
    else add(diaUtil(hoje, -1), 17 * 60, 17 * 60 + 30, tituloCedo, DIGITAL, nomesCedo);
  }

  // Em andamento: começou no quarto de hora atual, dura até 1 h (limite 23:59).
  const inicioAgora = Math.floor(m / 15) * 15;
  add(
    hoje, inicioAgora, Math.min(inicioAgora + 60, MIN_FIM_DO_DIA),
    'Alinhamento semanal do Suporte', PRESENCIAL,
    ['Guilherme P.', 'Roberto', 'Fábio', 'Luiz', 'Ketlyn'],
  );

  // Mais tarde: 16:00 se cedo; senão ~1 h à frente arredondado. Sem espaço
  // até 23:59, vira "amanhã cedo".
  const tituloTarde = 'Demo do módulo de Licenças';
  const nomesTarde = ['Adriano', 'Gustavo', 'Rafael', 'Guilherme P.', 'Eduardo', 'Ketlyn'];
  const inicioTarde = m < 14 * 60 ? 16 * 60 : Math.ceil((m + 60) / 30) * 30;
  if (inicioTarde + 45 <= MIN_FIM_DO_DIA) {
    add(hoje, inicioTarde, inicioTarde + 45, tituloTarde, DIGITAL, nomesTarde);
  } else {
    add(diaUtil(hoje, 1), 8 * 60 + 30, 9 * 60 + 15, tituloTarde, DIGITAL, nomesTarde);
  }

  // --- Em breve -----------------------------------------------------------
  add(
    diaUtil(hoje, 1), 10 * 60, 11 * 60, 'Planejamento da Sprint 42', PRESENCIAL,
    ['Adriano', 'Antonio', 'Arnaldo', 'Caique', 'Donizeti', 'Eduardo', 'Guilherme', 'Gustavo'],
  );
  add(
    diaUtil(hoje, 3), 14 * 60 + 30, 15 * 60 + 15, 'Implantação — Câmara de Araras', DIGITAL,
    ['Luiz', 'Caique', 'Donizeti'],
  );
  add(
    diaUtil(hoje, 7), 9 * 60, 10 * 60 + 30, 'Treinamento do novo portal da Prefeitura', PRESENCIAL,
    ['Fábio', 'Roberto'],
  );

  // --- Encerradas ---------------------------------------------------------
  add(
    diaUtil(hoje, -1), 15 * 60, 16 * 60, 'Retrospectiva da Sprint 41', DIGITAL,
    ['Guilherme', 'Ketlyn', 'Rafael', 'Antonio', 'Arnaldo', 'Gustavo'],
  );
  add(
    diaUtil(hoje, -3), 10 * 60, 10 * 60 + 45, 'Atendimento — Prefeitura de Limeira', DIGITAL,
    ['Guilherme P.'],
  );
  add(
    diaUtil(hoje, -7), 14 * 60, 15 * 60 + 30, 'Alinhamento Suporte × Desenvolvimento', PRESENCIAL,
    ['Roberto', 'Fábio', 'Luiz', 'Eduardo', 'Rafael'],
  );
  add(
    diaUtil(hoje, -14), 9 * 60 + 30, 10 * 60, 'Revisão do contrato de manutenção', DIGITAL,
    ['Adriano', 'Guilherme P.', 'Donizeti'],
  );

  return lista;
};

// Exposto para o teste conferir com os JSONs da equipe.
export const NOMES_EXEMPLO = Object.freeze([...SUPORTE, ...DEV]);
