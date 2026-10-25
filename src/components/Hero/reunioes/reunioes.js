// Regras das reuniões (agendamento). Funções puras: sem React e sem
// localStorage; o "agora" sempre chega por parâmetro para os testes.

export const MODALIDADES = Object.freeze({
  PRESENCIAL: 'presencial',
  DIGITAL: 'digital',
});

export const LIMITES = Object.freeze({
  tituloMax: 80,
  nomeMembroMax: 60,
  membrosMax: 30,
});

const MODALIDADES_VALIDAS = new Set(Object.values(MODALIDADES));

// Id aleatório; fallback para ambientes sem crypto.randomUUID (http sem TLS).
export const gerarId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// "  Ana   Maria " -> "Ana Maria"
export const normalizarNome = (nome) =>
  String(nome ?? '').trim().replace(/\s+/g, ' ');

// "João " == "joao" == "JOAO": compara sem acento, caixa ou espaços extras.
export const chaveMembro = (nome) =>
  normalizarNome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Erro de um nome isolado (ou null).
const erroNome = (nome) => {
  if (!nome) return 'Informe o nome do membro.';
  if (nome.length > LIMITES.nomeMembroMax) {
    return `O nome deve ter no máximo ${LIMITES.nomeMembroMax} caracteres.`;
  }
  return null;
};

export const adicionarMembro = (membros, nome) => {
  const lista = Array.isArray(membros) ? membros : [];
  const limpo = normalizarNome(nome);

  const erro = erroNome(limpo);
  if (erro) return { ok: false, erro, membros: lista };

  if (lista.length >= LIMITES.membrosMax) {
    return {
      ok: false,
      erro: `Limite de ${LIMITES.membrosMax} membros atingido.`,
      membros: lista,
    };
  }

  const chave = chaveMembro(limpo);
  if (lista.some((m) => chaveMembro(m.nome) === chave)) {
    return { ok: false, erro: `"${limpo}" já está na lista.`, membros: lista };
  }

  return { ok: true, membros: [...lista, { id: gerarId(), nome: limpo }] };
};

export const removerMembro = (membros, id) =>
  (Array.isArray(membros) ? membros : []).filter((m) => m.id !== id);

// --- Data e hora -----------------------------------------------------------

const RE_DATA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const pad = (n) => String(n).padStart(2, '0');

// Todas as datas/horas são de Brasília, independente do fuso da máquina.
// Offset fixo UTC−03:00: o Brasil não tem horário de verão desde 2019.
export const OFFSET_BRASILIA_MIN = -180;
const OFFSET_MS = OFFSET_BRASILIA_MIN * 60_000;
const RE_HORA = /^(\d{2}):(\d{2})(?::\d{2})?$/; // aceita segundos do <input type="time">

// Date -> "relógio de Brasília" lido via getUTC*.
const emBrasilia = (data) => new Date(data.getTime() + OFFSET_MS);

// "YYYY-MM-DDTHH:mm" (Brasília) -> Date, ou null se inválida (ex.: 30/02).
export const paraDate = (dataHora) => {
  const m = RE_DATA_HORA.exec(String(dataHora ?? '').slice(0, 16));
  if (!m) return null;
  const [ano, mes, dia, hora, min] = m.slice(1).map(Number);
  const b = new Date(Date.UTC(ano, mes - 1, dia, hora, min));
  const confere =
    b.getUTCFullYear() === ano &&
    b.getUTCMonth() === mes - 1 &&
    b.getUTCDate() === dia &&
    b.getUTCHours() === hora &&
    b.getUTCMinutes() === min;
  return confere ? new Date(b.getTime() - OFFSET_MS) : null;
};

// Date -> "YYYY-MM-DDTHH:mm" no horário de Brasília.
export const paraDataHoraLocal = (data) => {
  const b = emBrasilia(data);
  return (
    `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}` +
    `T${pad(b.getUTCHours())}:${pad(b.getUTCMinutes())}`
  );
};

// Atributo `min` do <input type="datetime-local">: o próximo minuto cheio (Brasília).
export const minDataHoraLocal = (agora = new Date()) => {
  const proximo = Math.floor(agora.getTime() / 60_000) * 60_000 + 60_000;
  return paraDataHoraLocal(new Date(proximo));
};

// "HH:mm" -> minutos desde 00:00, ou null se inválida.
export const paraMinutos = (hora) => {
  const m = RE_HORA.exec(String(hora ?? ''));
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : null;
};

// "seg., 20 de out. de 2026 · 14:30" (Brasília)
export const formatarDataHora = (dataHora) => {
  const d = paraDate(dataHora);
  if (!d) return '';
  const dia = d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  return `${dia} · ${paraDataHoraLocal(d).slice(11)}`;
};

// --- Reunião ---------------------------------------------------------------

// Aceita membros como {id, nome} ou string; devolve [{id, nome}] normalizados.
const normalizarMembros = (membros) =>
  (Array.isArray(membros) ? membros : []).map((m) =>
    typeof m === 'string'
      ? { id: gerarId(), nome: normalizarNome(m) }
      : { id: m?.id ?? gerarId(), nome: normalizarNome(m?.nome) },
  );

// `original` (edição): se a data/hora não mudou, ela pode estar no passado
// (dá para corrigir título ou membros de uma reunião que já aconteceu).
export const validarReuniao = (dados, agora = new Date(), { original } = {}) => {
  const erros = {};
  const { titulo, dataHora, horaFim, modalidade, membros } = dados ?? {};

  const tituloLimpo = normalizarNome(titulo);
  if (!tituloLimpo) erros.titulo = 'Informe o título da reunião.';
  else if (tituloLimpo.length > LIMITES.tituloMax) {
    erros.titulo = `O título deve ter no máximo ${LIMITES.tituloMax} caracteres.`;
  }

  const inicio = dataHora ? paraDate(dataHora) : null;
  if (!dataHora) erros.dataHora = 'Informe a data e a hora.';
  else if (!inicio) erros.dataHora = 'Data ou hora inválida.';
  else if (inicio.getTime() <= agora.getTime()) {
    const manteve = original && paraDate(original.dataHora)?.getTime() === inicio.getTime();
    if (!manteve) erros.dataHora = 'Escolha uma data e hora no futuro.';
  }

  // Término no mesmo dia, depois do início.
  const fimMin = paraMinutos(horaFim);
  if (!horaFim) erros.horaFim = 'Informe o horário de término.';
  else if (fimMin == null) erros.horaFim = 'Horário de término inválido.';
  else if (inicio && fimMin <= paraMinutos(paraDataHoraLocal(inicio).slice(11))) {
    erros.horaFim = 'O término deve ser depois do horário de início.';
  }

  if (!MODALIDADES_VALIDAS.has(modalidade)) {
    erros.modalidade = 'Escolha presencial ou digital.';
  }

  const lista = normalizarMembros(membros);
  if (lista.length === 0) erros.membros = 'Adicione pelo menos um membro.';
  else if (lista.length > LIMITES.membrosMax) {
    erros.membros = `Limite de ${LIMITES.membrosMax} membros.`;
  } else {
    const nomeRuim = lista.map((m) => erroNome(m.nome)).find(Boolean);
    const chaves = lista.map((m) => chaveMembro(m.nome));
    if (nomeRuim) erros.membros = nomeRuim;
    else if (new Set(chaves).size !== chaves.length) {
      erros.membros = 'Há membros repetidos na lista.';
    }
  }

  return erros;
};

// Os campos editáveis já normalizados (dados que passaram em validarReuniao).
// O servidor usa a mesma função ao gravar.
export const camposDaReuniao = (dados) => ({
  titulo: normalizarNome(dados.titulo),
  dataHora: paraDataHoraLocal(paraDate(dados.dataHora)),
  horaFim: String(dados.horaFim).slice(0, 5),
  modalidade: dados.modalidade,
  membros: normalizarMembros(dados.membros),
});

export const criarReuniao = (dados, agora = new Date()) => {
  const erros = validarReuniao(dados, agora);
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    reuniao: { id: gerarId(), ...camposDaReuniao(dados), criadaEm: agora.toISOString() },
  };
};

// Edita a reunião `id`: mesmas regras da criação (com `original`), mantém
// id e criadaEm e marca editadaEm. Devolve a lista nova junto.
export const editarReuniao = (reunioes, id, dados, agora = new Date()) => {
  const lista = Array.isArray(reunioes) ? reunioes : [];
  const original = lista.find((r) => r.id === id);
  if (!original) return { ok: false, erros: { geral: 'Reunião não encontrada.' } };

  const erros = validarReuniao(dados, agora, { original });
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  const reuniao = { ...original, ...camposDaReuniao(dados), editadaEm: agora.toISOString() };
  return { ok: true, reuniao, reunioes: lista.map((r) => (r.id === id ? reuniao : r)) };
};

export const removerReuniao = (reunioes, id) =>
  (Array.isArray(reunioes) ? reunioes : []).filter((r) => r.id !== id);

const instante = (r) => paraDate(r.dataHora)?.getTime() ?? 0;

// Próximas: mais perto primeiro. Passadas: mais recente primeiro.
export const separarReunioes = (reunioes, agora = new Date()) => {
  const t = agora.getTime();
  const lista = Array.isArray(reunioes) ? reunioes : [];
  const proximas = lista
    .filter((r) => instante(r) > t)
    .sort((a, b) => instante(a) - instante(b));
  const passadas = lista
    .filter((r) => instante(r) <= t)
    .sort((a, b) => instante(b) - instante(a));
  return { proximas, passadas };
};

export const ordenarReunioes = (reunioes, agora = new Date()) => {
  const { proximas, passadas } = separarReunioes(reunioes, agora);
  return [...proximas, ...passadas];
};
