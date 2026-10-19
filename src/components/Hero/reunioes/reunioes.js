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

// "YYYY-MM-DDTHH:mm" (hora local) -> Date, ou null se inválida (ex.: 30/02).
export const paraDate = (dataHora) => {
  const m = RE_DATA_HORA.exec(String(dataHora ?? '').slice(0, 16));
  if (!m) return null;
  const [ano, mes, dia, hora, min] = m.slice(1).map(Number);
  const d = new Date(ano, mes - 1, dia, hora, min);
  const confere =
    d.getFullYear() === ano &&
    d.getMonth() === mes - 1 &&
    d.getDate() === dia &&
    d.getHours() === hora &&
    d.getMinutes() === min;
  return confere ? d : null;
};

// Date -> "YYYY-MM-DDTHH:mm" em hora local.
export const paraDataHoraLocal = (data) =>
  `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}` +
  `T${pad(data.getHours())}:${pad(data.getMinutes())}`;

// Atributo `min` do <input type="datetime-local">: o próximo minuto cheio.
export const minDataHoraLocal = (agora = new Date()) => {
  const d = new Date(agora.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  return paraDataHoraLocal(d);
};

// "seg., 20 de out. de 2026 · 14:30"
export const formatarDataHora = (dataHora) => {
  const d = paraDate(dataHora);
  if (!d) return '';
  const dia = d.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${dia} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// --- Reunião ---------------------------------------------------------------

// Aceita membros como {id, nome} ou string; devolve [{id, nome}] normalizados.
const normalizarMembros = (membros) =>
  (Array.isArray(membros) ? membros : []).map((m) =>
    typeof m === 'string'
      ? { id: gerarId(), nome: normalizarNome(m) }
      : { id: m?.id ?? gerarId(), nome: normalizarNome(m?.nome) },
  );

export const validarReuniao = (dados, agora = new Date()) => {
  const erros = {};
  const { titulo, dataHora, modalidade, membros } = dados ?? {};

  const tituloLimpo = normalizarNome(titulo);
  if (!tituloLimpo) erros.titulo = 'Informe o título da reunião.';
  else if (tituloLimpo.length > LIMITES.tituloMax) {
    erros.titulo = `O título deve ter no máximo ${LIMITES.tituloMax} caracteres.`;
  }

  if (!dataHora) erros.dataHora = 'Informe a data e a hora.';
  else {
    const d = paraDate(dataHora);
    if (!d) erros.dataHora = 'Data ou hora inválida.';
    else if (d.getTime() <= agora.getTime()) {
      erros.dataHora = 'Escolha uma data e hora no futuro.';
    }
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

export const criarReuniao = (dados, agora = new Date()) => {
  const erros = validarReuniao(dados, agora);
  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    reuniao: {
      id: gerarId(),
      titulo: normalizarNome(dados.titulo),
      dataHora: paraDataHoraLocal(paraDate(dados.dataHora)),
      modalidade: dados.modalidade,
      membros: normalizarMembros(dados.membros),
      criadaEm: agora.toISOString(),
    },
  };
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
