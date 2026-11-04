// Só para os testes: dados 100% inventados do /compilacao (usuarioIds 900001-900007,
// "Cidade A-XX", números e nomes de mentira). Nada daqui vem de um sistema real.
export const AGORA = new Date('2026-11-04T15:00:00Z'); // quarta-feira; semana 02-08/11, mês de novembro

export const EQUIPE_CONFIG = {
  900001: { personagem: 'leonardo', funcao: 'projetos' },
  900002: { personagem: 'ramon', funcao: 'projetos' },
  900003: { personagem: 'glopes', funcao: 'projetos' },
  900004: { personagem: 'laura', funcao: 'projetos' },
  900005: { personagem: 'damaris', funcao: 'atualizacoes' },
  900006: { personagem: 'gdressano', funcao: 'atualizacoes' },
  900007: { personagem: 'nathalia', funcao: 'atualizacoes' },
};

/** Um registro da Auditoria, no formato que a lista devolve (sem cidadeId). */
export const registro = ({
  tipo = 'Resolução',
  numero = 1,
  ano = 2026,
  cidade = 'Cidade A-XX',
  data,
  hora = '10:00',
  modulo = 'Versões',
  acao = 1,
  descricao,
  usuario = 900001,
}) => ({
  acao,
  modulo,
  descricao: descricao ?? `${tipo} nº ${numero}/${ano}`,
  data,
  hora,
  usuarioNome: `Pessoa Sintetica ${usuario}`,
  usuarioLogin: `login.sintetico.${usuario}`,
  cidadeUf: cidade,
});

const v = (usuario, extra) => registro({ usuario, ...extra });

/** Versões incluídas de cada pessoa (a mesma norma com 2 versões aparece 2 vezes). */
export const versoesSinteticas = {
  900001: [
    v(900001, { numero: 1, data: '2026-11-04' }),
    v(900001, { numero: 1, data: '2026-11-04', hora: '11:00' }),
    v(900001, { numero: 2, data: '2026-11-04' }),
    v(900001, { tipo: 'Lei Ordinária', numero: 7, data: '2026-11-04' }),
    v(900001, { numero: 3, data: '2026-11-03' }),
    v(900001, { numero: 4, data: '2026-11-02' }),
    v(900001, { numero: 6, data: '2026-11-01' }),
    v(900001, { numero: 5, data: '2026-10-30' }),
  ],
  900002: [
    v(900002, { tipo: 'Lei Complementar', numero: 10, data: '2026-11-04' }),
    v(900002, { tipo: 'Lei Complementar', numero: 11, data: '2026-11-04' }),
    v(900002, { tipo: 'Lei Complementar', numero: 12, data: '2026-11-03' }),
  ],
  900003: [
    ...[1, 2, 3, 4, 5, 6].map((n) => v(900003, { tipo: 'Lei Ordinária', numero: n, cidade: 'Cidade B-XX', data: '2026-11-04' })),
    ...[1, 2, 3, 4].map((n) => v(900003, { tipo: 'Lei Complementar', numero: n, cidade: 'Cidade B-XX', data: '2026-11-04' })),
    v(900003, { tipo: 'Decreto Municipal', numero: 9, cidade: 'Cidade B-XX', data: '2026-11-04' }),
  ],
  900004: [v(900004, { numero: 30, cidade: 'Cidade C-XX', data: '2026-11-04' })],
};

const n = (usuario, extra) => registro({ usuario, modulo: 'Normas', tipo: 'Lei Ordinária', ...extra });

/**
 * Atualizações: inclusões em Normas (ação 1) de cada pessoa, da mais nova para a
 * mais antiga, como a Auditoria devolve, e o total de todo o tempo da lista.
 * A última de cada lista já é de antes do período (corta a paginação).
 */
export const normasIncluidasSinteticas = {
  900005: [
    n(900005, { numero: 40, cidade: 'Cidade D-XX', data: '2026-11-04', hora: '11:00' }),
    n(900005, { descricao: 'Decreto Municipal nº 41', cidade: 'Cidade D-XX', data: '2026-11-04' }), // sem ano, como na Auditoria
    n(900005, { numero: 42, cidade: 'Cidade D-XX', data: '2026-11-03' }),
    n(900005, { tipo: 'Lei Complementar', numero: 43, cidade: 'Cidade E-XX', data: '2026-10-30' }),
    n(900005, { numero: 44, cidade: 'Cidade E-XX', data: '2026-10-01' }),
  ],
  900006: [
    n(900006, { numero: 50, cidade: 'Cidade E-XX', data: '2026-11-02' }),
    n(900006, { numero: 51, cidade: 'Cidade E-XX', data: '2026-10-05' }),
  ],
  900007: [],
};
export const normasIncluidasTotais = { 900005: 250, 900006: 120, 900007: 0 };

// Projetos: versões e normas da janela. Atualizações: inclusões em Normas e o total.
const listasDaPessoa = (id) =>
  EQUIPE_CONFIG[id].funcao === 'atualizacoes'
    ? { normasIncluidas: [...normasIncluidasSinteticas[id]], normasIncluidasTotal: normasIncluidasTotais[id] }
    : { versoes: [...versoesSinteticas[id]], normas: [] }; // cópia: um teste pode mexer sem afetar os outros

export const auditoriaSintetica = () =>
  Object.fromEntries(
    Object.keys(EQUIPE_CONFIG).map((id) => [
      id,
      {
        ...listasDaPessoa(id),
        recentes: [
          registro({ usuario: Number(id), modulo: 'Usuários', descricao: 'Texto fora da lista', data: '2026-11-04', hora: '17:00' }),
          registro({ usuario: Number(id), modulo: 'Arquivos', descricao: `Arquivo ${'x'.repeat(200)}`, data: '2026-11-04', hora: '09:30' }),
        ],
      },
    ]),
  );

/**
 * Estoque por cidade×tipo: versionadas (1) + não versionadas (2) = total; `ignoradas`
 * são as sem versão que não serão compiladas (fora do aguardando).
 */
export const estoqueSintetico = {
  'Cidade A-XX|28': { total: 40, versionadas: 30, naoVersionadas: 10, ignoradas: 0 },
  'Cidade A-XX|24': { total: 60, versionadas: 20, naoVersionadas: 40, ignoradas: 0 },
  'Cidade B-XX|23': { total: 50, versionadas: 30, naoVersionadas: 20, ignoradas: 0 },
  'Cidade B-XX|24': { total: 30, versionadas: 10, naoVersionadas: 20, ignoradas: 0 },
  'Cidade C-XX|28': { total: 20, versionadas: 5, naoVersionadas: 15, ignoradas: 0 },
};

const aba = (personagem, ano, mes, extra = {}) => ({
  personagem,
  ano,
  mes,
  titulo_confere: true,
  importado_em: `2026-11-0${mes > 9 ? 1 : 2}T12:00:00.000Z`,
  ...extra,
});
const linha = (personagem, ano, mes, balde, compiladas, deficit, cidade = 'cidade d', status = 'ativa') => ({
  personagem,
  ano,
  mes,
  balde,
  compiladas,
  deficit,
  cidade,
  uf: 'XX',
  cidade_status: status,
  observacao: 'TEXTO-LIVRE-DA-PLANILHA',
});

export const planilhasSinteticas = {
  abas: [
    aba('damaris', 2026, 8, { titulo_confere: false }),
    aba('damaris', 2026, 9),
    aba('damaris', 2026, 10),
    aba('gdressano', 2026, 10),
    aba('gdressano', 2026, 11),
  ],
  linhas: [
    linha('damaris', 2026, 8, 'leis', 100, 0),
    linha('damaris', 2026, 9, 'leis', 4, 0),
    linha('damaris', 2026, 10, 'leis', 10, 1),
    linha('damaris', 2026, 10, 'resolucoes', 5, 2, 'cidade e'),
    linha('damaris', 2026, 10, 'outros', 2, 0, 'cidade e'),
    linha('damaris', 2026, 10, 'leis', 1, 0, 'cidade f', 'saiu'),
    linha('gdressano', 2026, 10, 'decretos', 20, 0, 'cidade g'),
    linha('gdressano', 2026, 11, 'leis', 7, 4, 'cidade g'),
    linha('gdressano', 2026, 11, 'resolucoes', 3, 0, 'cidade h'),
  ],
};
