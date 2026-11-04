// Respostas do servidor inventadas para os testes da tela de /compilacao, no
// formato de /api/compilacao (scripts/lib/build-compilacao.mjs). Cidades e
// números fictícios.

const tipos = (valores) => ({ leis: 0, decretos: 0, resolucoes: 0, portarias: 0, complementares: 0, emendas: 0, outros: 0, ...valores });

export const pessoaDeProjetos = (extra = {}) => ({
  funcao: 'projetos',
  desde: { data: '2026-10-20', hora: '08:15' },
  planilha: null,
  ausente: false,
  semAtividadeDesde: null,
  cidades: [{ nome: 'Cidade A', uf: 'XX' }],
  projeto: {
    cidade: { nome: 'Cidade A', uf: 'XX' },
    tipos: ['Resoluções'],
    total: 404,
    compiladas: 362,
    aguardando: 42,
    compartilhadaCom: [],
  },
  producao: { hoje: 3, semana: 12, mes: 40, tudo: null },
  fontes: { hoje: 'sistema', semana: 'sistema', mes: 'sistema', tudo: null },
  porTipo: { hoje: tipos({ resolucoes: 3 }), semana: tipos({ resolucoes: 11, outros: 1 }), mes: tipos({ resolucoes: 38, outros: 2 }), tudo: null },
  aguardando: { valor: 42, fonte: 'normas' },
  faltantes: null,
  vinculadas: { valor: 270, cidade: { nome: 'Cidade A', uf: 'XX' } },
  atividade: { acao: 'Inclusão', cidade: { nome: 'Cidade A', uf: 'XX' }, modulo: 'Versões', data: '2026-11-04', hora: '09:30', descricao: 'Resolução nº 1/2026' },
  ...extra,
});

// Mês "—": o caso em que o sistema não respondeu para o Mês (no normal, vem "pelo sistema").
export const pessoaDeAtualizacoes = (extra = {}) => ({
  funcao: 'atualizacoes',
  desde: null,
  planilha: { mes: '2026-10', importadaEm: '2026-11-01T12:00:00.000Z' },
  ausente: false,
  semAtividadeDesde: null,
  cidades: [
    { nome: 'Cidade D', uf: 'XX' },
    { nome: 'Cidade E', uf: 'XX' },
    { nome: 'Cidade F', uf: 'XX' },
  ],
  projeto: null,
  producao: { hoje: 2, semana: 9, mes: null, tudo: 1500 },
  fontes: { hoje: 'sistema', semana: 'sistema', mes: null, tudo: 'planilha' },
  porTipo: { hoje: tipos({ leis: 2 }), semana: tipos({ leis: 6, decretos: 3 }), mes: null, tudo: tipos({ leis: 1000, decretos: 500 }) },
  aguardando: { valor: 112, fonte: 'planilha', mes: '2026-10' },
  faltantes: null,
  vinculadas: { valor: null, cidade: null },
  atividade: null,
  ...extra,
});

export const REFERENCIA = '2026-11-04';
