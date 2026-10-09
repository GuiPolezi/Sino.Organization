// Casos da montagem da equipe a partir de listAgents.
// Uso: npm run test:team
import assert from 'node:assert/strict';
import test from 'node:test';
import { TeamError, buildTeam, shortenNames } from './lib/build-team.mjs';

const agent = (name, extra = {}) => ({
  agent: name,
  temporary_absence: 'Não',
  enabled: 'Sim',
  post: 'Analista de Suporte',
  email: `${name}@exemplo.com`,
  login: name,
  cellphone: '19 99999-0000',
  contactphone: null,
  cost: '10',
  registration: null,
  locations: '',
  ...extra,
});

const records = [
  agent('Fábio'),
  agent('Marcos'),
  agent('Luiz', { post: ' Coordenador ', temporary_absence: 'Sim' }),
];
const roster = [
  { id: 'luiz', agent: 'Luiz' },
  { id: 'fabio', agent: 'Fábio' },
];

test('publica só os técnicos da lista, na ordem dela, e só os campos públicos', () => {
  assert.deepEqual(buildTeam(records, roster), [
    { id: 'luiz', name: 'Luiz', role: 'Coordenador', absent: true },
    { id: 'fabio', name: 'Fábio', role: 'Analista de Suporte', absent: false },
  ]);
});

test('cargo vazio vira null', () => {
  const [member] = buildTeam([agent('Fábio', { post: null })], [{ id: 'fabio', agent: 'Fábio' }]);
  assert.equal(member.role, null);
});

test('o nome precisa bater exatamente, com acento e maiúsculas', () => {
  assert.throws(() => buildTeam(records, [{ id: 'fabio', agent: 'Fabio' }]), TeamError);
  assert.throws(() => buildTeam(records, [{ id: 'fabio', agent: 'fábio' }]), TeamError);
});

const luiz = [{ id: 'luiz', agent: 'Luiz' }];
const failures = [
  ['técnico que não existe no Milldesk', records, [{ id: 'ana', agent: 'Ana' }], /não encontrado/],
  ['dois técnicos com o mesmo nome', [agent('Luiz'), agent('Luiz')], luiz, /2 técnicos/],
  ['técnico desabilitado', [agent('Luiz', { enabled: 'Não' })], luiz, /desabilitado/],
  ['técnico sem o campo enabled', [{ agent: 'Luiz' }], luiz, /desabilitado/],
  ['lista vazia', records, [], /ao menos um/],
  ['lista ausente', records, undefined, /ao menos um/],
  ['id repetido', records, [{ id: 'x', agent: 'Luiz' }, { id: 'x', agent: 'Fábio' }], /Id repetido/],
  ['técnico repetido', records, [{ id: 'a', agent: 'Luiz' }, { id: 'b', agent: 'Luiz' }], /Técnico repetido/],
  ['id fora do formato', records, [{ id: 'Luiz Silva', agent: 'Luiz' }], /Id inválido/],
  ['técnico sem agent', records, [{ id: 'luiz' }], /sem "agent"/],
  ['entrada nula na lista', records, [null], /precisa ser/],
  ['entrada que não é objeto', records, ['Luiz'], /precisa ser/],
  ['id com espaço em volta', records, [{ id: ' luiz ', agent: 'Luiz' }], /Id inválido/],
  ['id que não é texto', records, [{ id: 7, agent: 'Luiz' }], /Id inválido/],
];

for (const [name, list, team, message] of failures) {
  test(`interrompe: ${name}`, () => {
    assert.throws(
      () => buildTeam(list, team),
      (error) => error instanceof TeamError && message.test(error.message),
    );
  });
}

test('as mensagens de erro citam o arquivo da lista usada', () => {
  const cita = (file) => (error) => error instanceof TeamError && error.message.startsWith(`${file} precisa`);
  assert.throws(() => buildTeam(records, [], { file: 'dev-team.json' }), cita('dev-team.json'));
  assert.throws(() => buildTeam(records, []), cita('support-team.json'));
});

test('abrevia para o primeiro nome', () => {
  assert.deepEqual(shortenNames(['Adriano', 'Ketlyn Izidorio', 'Antonio Raphael de Arruda Basso']), [
    'Adriano',
    'Ketlyn',
    'Antonio',
  ]);
});

test('primeiro nome repetido ganha o segundo nome', () => {
  assert.deepEqual(shortenNames(['Guilherme Anderson dos Santos', 'Guilherme P.', 'Gustavo Faber']), [
    'Guilherme Anderson',
    'Guilherme P.',
    'Gustavo',
  ]);
  // Partícula não é segundo nome; quem só tem o primeiro nome fica com ele.
  assert.deepEqual(shortenNames(['Ana de Souza Lima', 'Ana Paula Reis', 'Ana']), ['Ana de Souza', 'Ana Paula', 'Ana']);
});

test('sem como distinguir pelo segundo nome, o nome fica inteiro', () => {
  assert.deepEqual(shortenNames(['Ana Paula Reis', 'Ana Paula Lima', 'Ana Clara']), [
    'Ana Paula Reis',
    'Ana Paula Lima',
    'Ana Clara',
  ]);
});

test('shortNames publica os nomes abreviados, sem mexer nos outros campos', () => {
  const list = [agent('Luiz Souza'), agent('Luiz Prado Neto'), agent('Fábio Lima')];
  const team = buildTeam(
    list,
    [
      { id: 'luiz-s', agent: 'Luiz Souza' },
      { id: 'luiz-p', agent: 'Luiz Prado Neto' },
      { id: 'fabio', agent: 'Fábio Lima' },
    ],
    { shortNames: true },
  );
  assert.deepEqual(
    team.map(({ id, name }) => [id, name]),
    [
      ['luiz-s', 'Luiz Souza'],
      ['luiz-p', 'Luiz Prado'],
      ['fabio', 'Fábio'],
    ],
  );
  assert.deepEqual(Object.keys(team[0]), ['id', 'name', 'role', 'absent']);
});
