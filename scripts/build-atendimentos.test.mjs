// Casos da contagem de atendimentos e tickets em aberto a partir do Milldesk.
// Uso: npm run test:atendimentos
import assert from 'node:assert/strict';
import test from 'node:test';
import { contarAtendimentos, dataIso, idNaEquipe, tecnicoDoAtendimento } from './lib/build-atendimentos.mjs';

const equipe = [
  { id: 'roberto', agent: 'Roberto' },
  { id: 'fabio', agent: 'Fábio' },
  { id: 'guilherme-p', agent: 'Guilherme P.' },
  { id: 'luiz', agent: 'Luiz' },
];

const AVISO =
  'O técnico dessa solicitação é SOMENTE o técnico que aparece na descrição do chamado. Favor desconsiderar o Técnico do campo tecnico nesse ticket';
const api = (id, tecnicoDescricao, agent, start = '01/10/2026') => ({
  id,
  ticket: `API Atend. Diário - ${tecnicoDescricao}: Atendeu o Cliente X - CM Y`,
  description: `${AVISO}<br>Técnico: ${tecnicoDescricao}<br>Cliente: X<br>Resumo: algo`,
  agent,
  status: 'Fechado',
  start,
});
const diario = (id, agent, start = '01/10/2026') => ({
  id,
  ticket: 'AtendimentoDiario - Dúvida Operacional',
  description: '<p>qualquer</p>',
  agent,
  status: 'Fechado',
  start,
});

test('dataIso converte a data do Milldesk', () => {
  assert.equal(dataIso('01/10/2026'), '2026-10-01');
  assert.equal(dataIso('01/10/2026 08:23'), '2026-10-01');
  assert.equal(dataIso(''), null);
  assert.equal(dataIso(null), null);
});

test('tag API: técnico vem da descrição, não do campo', () => {
  assert.deepEqual(tecnicoDoAtendimento(api('1', 'Fabio', 'Roberto')), { nome: 'Fabio', origem: 'descricao' });
});

test('tag API sem a linha Técnico: usa o campo Técnico', () => {
  const ticket = { ...api('1', 'Luiz', 'Luiz'), description: '<p>Feita limpeza do servidor</p>' };
  assert.deepEqual(tecnicoDoAtendimento(ticket), { nome: 'Luiz', origem: 'campo' });
});

test('"Técnico do campo" no aviso não é confundido com a linha do técnico', () => {
  const ticket = { ...api('1', 'Roberto', 'Fábio'), description: AVISO };
  assert.deepEqual(tecnicoDoAtendimento(ticket), { nome: 'Fábio', origem: 'campo' });
});

test('tag AtendimentoDiario: técnico vem do campo', () => {
  assert.deepEqual(tecnicoDoAtendimento(diario('1', 'Fábio')), { nome: 'Fábio', origem: 'campo' });
});

test('outros assuntos não são atendimento', () => {
  for (const assunto of ['Bug / Erro', 'Melhoria / Nova Função', 'Erro na API de boletos']) {
    assert.equal(tecnicoDoAtendimento({ ticket: assunto, description: 'Técnico: Fabio', agent: 'Fábio' }), null);
  }
});

test('idNaEquipe: primeiro nome da descrição casa com o nome do Milldesk', () => {
  assert.equal(idNaEquipe(equipe, 'Fabio', 'descricao'), 'fabio');
  assert.equal(idNaEquipe(equipe, 'Guilherme', 'descricao'), 'guilherme-p');
  assert.equal(idNaEquipe(equipe, 'roberto ', 'descricao'), 'roberto');
});

test('idNaEquipe: campo Técnico só casa com o nome exato', () => {
  assert.equal(idNaEquipe(equipe, 'Fábio', 'campo'), 'fabio');
  assert.equal(idNaEquipe(equipe, 'Guilherme P.', 'campo'), 'guilherme-p');
  // Outro Guilherme do Milldesk não é o Guilherme P. da equipe.
  assert.equal(idNaEquipe(equipe, 'Guilherme Anderson dos Santos', 'campo'), null);
});

test('idNaEquipe: primeiro nome ambíguo não casa com ninguém', () => {
  const comDois = [...equipe, { id: 'guilherme-a', agent: 'Guilherme A.' }];
  assert.equal(idNaEquipe(comDois, 'Guilherme', 'descricao'), null);
});

test('contarAtendimentos soma por técnico e por dia de criação', () => {
  const periodo = [
    api('1', 'Fabio', 'Roberto', '01/10/2026'),
    api('2', 'Fabio', 'Fábio', '01/10/2026'),
    api('3', 'Guilherme', 'Guilherme P.', '02/10/2026'),
    diario('4', 'Roberto', '02/10/2026'),
    { id: '5', ticket: 'Bug / Erro', agent: 'Roberto', status: 'Fechado', start: '02/10/2026' },
    api('1', 'Fabio', 'Roberto', '01/10/2026'), // repetido
  ];
  const { tecnicos } = contarAtendimentos(periodo, [], equipe);
  assert.deepEqual(tecnicos.fabio.porDia, { '2026-10-01': 2 });
  assert.deepEqual(tecnicos['guilherme-p'].porDia, { '2026-10-02': 1 });
  assert.deepEqual(tecnicos.roberto.porDia, { '2026-10-02': 1 });
  assert.deepEqual(tecnicos.luiz, { porDia: {}, chamadosAtribuidos: 0 });
});

test('contarAtendimentos relata quem não está na equipe e tickets sem data', () => {
  const periodo = [diario('1', 'Adriano'), api('2', 'Fabio', 'Fábio', '')];
  const { foraDaEquipe, semData } = contarAtendimentos(periodo, [], equipe);
  assert.deepEqual(foraDaEquipe, { Adriano: 1 });
  assert.equal(semData, 1);
});

test('tickets em aberto contam pelo campo Técnico, sem os fechados e sem repetir', () => {
  const abertos = [
    { id: '10', agent: 'Fábio', status: 'Em atendimento' },
    { id: '11', agent: 'Fábio', status: 'Rejeitado' },
    { id: '12', agent: 'Luiz', status: 'Fechado' },
    { id: '10', agent: 'Fábio', status: 'Em atendimento' },
    { id: '13', agent: 'Adriano', status: 'Aberto' },
  ];
  const { tecnicos } = contarAtendimentos([], abertos, equipe);
  assert.equal(tecnicos.fabio.chamadosAtribuidos, 2);
  assert.equal(tecnicos.luiz.chamadosAtribuidos, 0);
});
