import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APARENCIAS_COMPILACAO, PESSOAS_COMPILACAO } from '../../../pages/Compilacao/equipe.js';
import { bonecosDa } from '../../../pages/Reuniao/membros.js';
import { carregarEquipes, identificar, iniciais, nomeDaPessoa, pessoasDasEquipes } from './membrosEquipe.js';

// A API do site, de mentira: cada equipe com uma pessoa.
const RESPOSTAS = {
  '/api/equipes/suporte': { team: [{ id: 'roberto', name: 'Roberto', role: 'Técnico', absent: false }] },
  '/api/equipes/desenvolvimento': { team: [{ id: 'adriano', name: 'Adriano', role: 'Desenvolvedor', absent: false }] },
};
globalThis.fetch = async (caminho) => ({ ok: true, status: 200, json: async () => ({ dados: RESPOSTAS[caminho] }) });

test('a compilação entra no seletor junto de suporte e desenvolvimento, em ordem alfabética', async () => {
  await carregarEquipes();
  const ids = pessoasDasEquipes().map((pessoa) => pessoa.id);
  for (const { id } of PESSOAS_COMPILACAO) assert.ok(ids.includes(id), `${id} no seletor`);
  assert.ok(ids.includes('roberto') && ids.includes('adriano'));
  assert.equal(ids.length, PESSOAS_COMPILACAO.length + 2);
  const nomes = pessoasDasEquipes().map((pessoa) => pessoa.name);
  assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')));
});

test('membro com nome de compilador vira o boneco dele, com o cargo', async () => {
  await carregarEquipes();
  assert.deepEqual(identificar({ id: 'x1', nome: 'Nathalia' }), { id: 'nathalia', cargo: 'Coordenadora de Compilação' });
  assert.deepEqual(identificar({ id: 'x2', nome: 'g.lopes' }), { id: 'glopes', cargo: 'Compilador' });
  assert.equal(nomeDaPessoa('damaris'), 'Damaris');
  const [boneco] = bonecosDa({ membros: [{ id: 'x3', nome: 'Damaris' }] });
  assert.equal(boneco.id, 'damaris');
  assert.equal(boneco.funcao, 'Compiladora');
});

test('todo compilador do seletor tem aparência própria', () => {
  for (const { id } of PESSOAS_COMPILACAO) assert.ok(APARENCIAS_COMPILACAO[id], `aparência de ${id}`);
});

test('iniciais: o ponto separa como o espaço', () => {
  assert.equal(iniciais('G.Dressano'), 'GD');
  assert.equal(iniciais('G.Lopes'), 'GL');
  assert.equal(iniciais('Guilherme P.'), 'GP');
  assert.equal(iniciais('Ana Maria Souza'), 'AS');
  assert.equal(iniciais('Bia'), 'B');
  assert.equal(iniciais(''), '?');
});
