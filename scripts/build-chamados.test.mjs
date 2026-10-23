// Casos da classificação dos chamados dos desenvolvedores (scripts/lib/build-chamados.mjs).
// Uso: npm run test:chamados-sync
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SEM_ASSUNTO,
  assuntoDoTicket,
  categoriaDoSite,
  localDoTicket,
  minutosAteFinalizar,
  montarChamados,
  statusDoSite,
} from './lib/build-chamados.mjs';

test('as categorias do Milldesk caem nas 8 do site, sem depender de caixa ou acento', () => {
  const casos = {
    'Cartórios - Selo Digital': 'Cartórios',
    'Cartórios - Escrituras': 'Cartórios',
    'Cartorios - firmas': 'Cartórios',
    'Cartórios - Financeiro': 'Cartórios',
    'Cartórios - Cobrança': 'Cartórios',
    'Siscam 9 WEB': 'Siscam 9',
    'Siscam 8 - WorkFlow': 'Siscam 8',
    'Siscam 8 - Sino.Assinador': 'Siscam 8',
    Site: 'Site',
    'Site - Transmissão Sessão': 'Site',
    'Site - Ouvidoria e SIC': 'Site',
    'APP Mobile': 'App Mobile',
    'Aplicativo Mobile Campinas': 'App Mobile',
    'Painel de Votação': 'Painel',
    'Sistema - Recepção': 'Sistema (Outros)',
    '  Legislação   Digital ': 'Legislação Digital',
  };
  for (const [milldesk, site] of Object.entries(casos)) assert.equal(categoriaDoSite(milldesk), site, milldesk);
});

test('categorias fora do mapeamento não entram', () => {
  for (const nome of ['zEscrituras', 'zLegislação Digital', 'Servidor de E-mail', 'Sistema - Patrimônio', 'Siscam 8', null, 'null']) {
    assert.equal(categoriaDoSite(nome), null, String(nome));
  }
});

test('status: "Com o Desenvolvimento" fica separado de "Com o Desenvolvedor"; os novos seguem como vieram', () => {
  assert.equal(statusDoSite('Com o Desenvolvedor'), 'Com o desenvolvedor');
  assert.equal(statusDoSite('Com o Desenvolvimento'), 'Com o Desenvolvimento');
  assert.equal(statusDoSite('Fechado'), 'Fechado');
  assert.equal(statusDoSite('aguardando deploy'), 'Aguardando Deploy');
  assert.equal(statusDoSite(' Rejeitado '), 'Rejeitado');
  assert.equal(statusDoSite(null), null);
});

test('o assunto é a subcategoria e o local é o campo Local, como vieram', () => {
  assert.equal(assuntoDoTicket(' Bug / Erro '), 'Bug / Erro');
  assert.equal(assuntoDoTicket(null), SEM_ASSUNTO);
  assert.equal(localDoTicket('  2º Tabelião de Notas  de Piracicaba '), '2º Tabelião de Notas de Piracicaba');
  for (const vazio of [null, undefined, '', ' ', 'null']) assert.equal(localDoTicket(vazio), null, String(vazio));
});

test('o tempo até finalizar sai da hora de abertura e da de finalização', () => {
  assert.equal(minutosAteFinalizar('31/10/2017 13:07', '31/10/2017 15:37'), 150);
  // Virando o mês e o ano.
  assert.equal(minutosAteFinalizar('31/12/2025 23:30', '01/01/2026 00:10'), 40);
  assert.equal(minutosAteFinalizar('28/02/2024 10:00', '01/03/2024 10:00'), 2 * 24 * 60);
  for (const [inicio, fim] of [[null, '01/01/2026 10:00'], ['01/01/2026 10:00', null], ['01/01/2026', '02/01/2026'], ['02/01/2026 10:00', '01/01/2026 10:00']]) {
    assert.equal(minutosAteFinalizar(inicio, fim), null, `${inicio} -> ${fim}`);
  }
});

test('montarChamados conta os tickets abertos por dia, de qualquer técnico, no total e por categoria', () => {
  const ticket = (id, campos) => ({ id, agent: 'Outra Pessoa', category: 'Site', status: 'Fechado', start: '01/10/2026', ...campos });
  const { solicitacoes, desenvolvedores } = montarChamados(
    [
      ticket(1),
      ticket(1),
      ticket(2, { category: 'Siscam 9 WEB' }),
      ticket(3, { category: 'zEscrituras', start: '02/10/2026' }),
      ticket(4, { category: null, start: '02/10/2026' }),
      ticket(5, { start: null }),
      ticket(6, { agent: 'Ana Souza', start: '02/10/2026', starttime: '02/10/2026 09:00', end: '02/10/2026', endtime: '02/10/2026 11:30' }),
    ],
    [{ id: 'ana', agent: 'Ana Souza' }],
  );
  assert.deepEqual(solicitacoes, {
    todas: { '2026-10-01': 2, '2026-10-02': 3 },
    categorias: { Site: { '2026-10-01': 1, '2026-10-02': 1 }, 'Siscam 9': { '2026-10-01': 1 } },
  });
  assert.equal(desenvolvedores.ana[0].minutos, 150);
});

test('montarChamados separa pelo campo Técnico e guarda só campos de classificação', () => {
  const equipe = [
    { id: 'ana', agent: 'Ana Souza' },
    { id: 'beto', agent: 'Beto' },
  ];
  const ticket = (id, campos) => ({
    id,
    agent: 'Ana Souza',
    category: 'Site',
    subcategory: 'Bug / Erro',
    status: 'Fechado',
    start: '01/10/2026',
    end: '03/10/2026',
    location: 'Itapevi CM',
    ticket: 'Título com nome de cliente',
    description: '<p>texto</p>',
    requester: 'Fulano',
    ...campos,
  });
  const { desenvolvedores, categoriasIgnoradas, semData } = montarChamados(
    [
      ticket(1),
      ticket(1),
      ticket(2, { agent: 'ana souza ', status: 'Com o Desenvolvimento', start: '05/10/2026', location: 'null' }),
      ticket(3, { category: 'zEscrituras' }),
      ticket(4, { agent: 'Marcos' }),
      ticket(5, { start: null }),
    ],
    equipe,
  );

  assert.deepEqual(desenvolvedores, {
    ana: [
      { data: '2026-10-05', status: 'Com o Desenvolvimento', categoria: 'Site', assunto: 'Bug / Erro' },
      {
        data: '2026-10-01',
        status: 'Fechado',
        categoria: 'Site',
        assunto: 'Bug / Erro',
        local: 'Itapevi CM',
        fechadoEm: '2026-10-03',
      },
    ],
    beto: [],
  });
  assert.deepEqual(categoriasIgnoradas, { zEscrituras: 1 });
  assert.equal(semData, 1);
});
