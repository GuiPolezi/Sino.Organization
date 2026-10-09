// Casos da equipe de desenvolvimento: os dez personagens e a aparência de cada um.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { aparenciaDe, registrarAparencias } from '../Suporte/boneco/aparencia.js';
import { mapearTecnico } from '../Suporte/mappers/equipe.js';
import { APARENCIAS_DEV } from './aparencias.js';

const { team } = JSON.parse(readFileSync(new URL('../../data/dev-team.json', import.meta.url), 'utf8'));
const ESTILOS = ['curto', 'topete', 'coque', 'moicano', 'longo', 'cacheado', 'careca'];
const ACESSORIOS = ['nenhum', 'oculos', 'headset', 'bone', 'maleta', 'gravata'];
const COR = /^#[0-9a-f]{6}$/i;

test('são dez desenvolvedores, com ids únicos e no formato da equipe', () => {
  assert.equal(team.length, 10);
  assert.equal(new Set(team.map((pessoa) => pessoa.id)).size, 10);

  const dev = mapearTecnico({ id: 'rafael', name: 'Rafael', role: 'Analista de Sistemas', absent: false });
  assert.deepEqual(dev, { id: 'rafael', nome: 'Rafael', funcao: 'Analista de Sistemas', ausente: false, avatarIniciais: 'R' });
});

test('cada desenvolvedor tem uma aparência própria e válida', () => {
  assert.deepEqual(Object.keys(APARENCIAS_DEV).sort(), team.map((pessoa) => pessoa.id).sort());

  for (const [id, aparencia] of Object.entries(APARENCIAS_DEV)) {
    for (const cor of [aparencia.pele, aparencia.camisa, aparencia.calca, aparencia.cabelo.cor]) {
      assert.match(cor, COR, `cor de ${id}`);
    }
    assert.ok(ESTILOS.includes(aparencia.cabelo.estilo), `cabelo de ${id}`);
    assert.ok(ACESSORIOS.includes(aparencia.acessorio), `acessório de ${id}`);
  }

  // Com a mesma camisa em todos, ninguém repete a combinação de cabelo e acessório.
  const combinacoes = Object.values(APARENCIAS_DEV).map((a) => `${a.cabelo.estilo}|${a.acessorio}`);
  assert.equal(new Set(combinacoes).size, combinacoes.length);
});

test('todos vestem o uniforme do suporte, com o logo no peito', () => {
  for (const [id, aparencia] of Object.entries(APARENCIAS_DEV)) {
    assert.equal(aparencia.camisa, aparenciaDe('roberto').camisa, `camisa de ${id}`);
    assert.equal(aparencia.logo, true, `logo de ${id}`);
  }
});

test('registradas, as aparências passam a valer para os ids dos desenvolvedores', () => {
  assert.notEqual(aparenciaDe('adriano'), APARENCIAS_DEV['adriano']);
  registrarAparencias(APARENCIAS_DEV);
  assert.equal(aparenciaDe('adriano'), APARENCIAS_DEV['adriano']);
  // As do suporte continuam lá.
  assert.equal(aparenciaDe('roberto').acessorio, 'oculos');
});
