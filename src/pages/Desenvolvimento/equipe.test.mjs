// Casos da equipe de desenvolvimento: os dez personagens e a aparência de cada um.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { aparenciaDe, registrarAparencias, temBochechas } from '../Suporte/boneco/aparencia.js';
import { mapearTecnico } from '../Suporte/mappers/equipe.js';
import { APARENCIAS_DEV } from './aparencias.js';

const { team } = JSON.parse(readFileSync(new URL('../../data/dev-team.json', import.meta.url), 'utf8'));
const ESTILOS = ['curto', 'raspado', 'volumoso', 'topete', 'coque', 'moicano', 'longo', 'comprido', 'cacheado', 'careca'];
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

  // Com a mesma camisa em quase todos, ninguém repete a combinação de cabelo, acessório e barba.
  const combinacoes = Object.values(APARENCIAS_DEV).map((a) => `${a.cabelo.estilo}|${a.acessorio}|${a.barba ?? 'nenhuma'}`);
  assert.equal(new Set(combinacoes).size, combinacoes.length);
});

test('todos, menos o caique, vestem o uniforme do suporte, com o logo no peito', () => {
  for (const [id, aparencia] of Object.entries(APARENCIAS_DEV).filter(([id]) => id !== 'caique')) {
    assert.equal(aparencia.camisa, aparenciaDe('roberto').camisa, `camisa de ${id}`);
    assert.equal(aparencia.logo, true, `logo de ${id}`);
  }
});

test('o caique vai de moletom cinza com capuz, sem logo, de cabelo raspado e sem óculos', () => {
  const caique = APARENCIAS_DEV.caique;
  assert.equal(caique.moletom, true);
  assert.notEqual(caique.camisa, aparenciaDe('roberto').camisa);
  assert.equal(caique.logo, undefined);
  assert.equal(caique.cabelo.estilo, 'raspado');
  assert.equal(caique.acessorio, 'nenhum');
  const outros = Object.entries(APARENCIAS_DEV).filter(([id]) => id !== 'caique');
  for (const [id, aparencia] of outros) assert.equal(aparencia.moletom, undefined, `moletom de ${id}`);
});

test('o donizeti é branco, de óculos, olhos escuros, barba fechada e cabelo volumoso, pretos', () => {
  const donizeti = APARENCIAS_DEV.donizeti;
  assert.equal(donizeti.pele, aparenciaDe('roberto').pele);
  assert.equal(donizeti.acessorio, 'oculos');
  assert.equal(donizeti.olhos, undefined);
  assert.equal(donizeti.barba, 'fechada');
  assert.equal(donizeti.cabelo.estilo, 'volumoso');
  assert.equal(donizeti.cabelo.cor, '#17130F');
});

test('só o donizeti, de barba fechada, fica sem as bochechas rosadas', () => {
  assert.equal(temBochechas(APARENCIAS_DEV.donizeti), false);
  const outros = Object.entries(APARENCIAS_DEV).filter(([id]) => id !== 'donizeti');
  for (const [id, aparencia] of outros) assert.equal(temBochechas(aparencia), true, `bochechas de ${id}`);
  for (const id of ['roberto', 'fabio', 'guilherme-p', 'luiz', 'alguem-novo']) {
    assert.equal(temBochechas(aparenciaDe(id)), true, `bochechas de ${id}`);
  }
});

test('a ketlyn tem cabelo comprido e preto, sem óculos', () => {
  const ketlyn = APARENCIAS_DEV.ketlyn;
  assert.equal(ketlyn.cabelo.estilo, 'comprido');
  assert.equal(ketlyn.cabelo.cor, '#17130F');
  assert.equal(ketlyn.acessorio, 'nenhum');
});

test('o eduardo é branco, de óculos, cabelo preto de topete e sem bigode nem fone', () => {
  const eduardo = APARENCIAS_DEV.eduardo;
  assert.equal(eduardo.pele, aparenciaDe('roberto').pele);
  assert.equal(eduardo.cabelo.estilo, 'topete');
  assert.equal(eduardo.cabelo.cor, '#17130F');
  assert.equal(eduardo.barba, undefined);
  assert.equal(eduardo.acessorio, 'oculos');
});

test('o gustavo é loiro de topete, olhos azuis e só bigode, sem boné', () => {
  const gustavo = APARENCIAS_DEV.gustavo;
  assert.equal(gustavo.cabelo.estilo, 'topete');
  assert.equal(gustavo.cabelo.cor, '#C9A26B');
  assert.equal(gustavo.olhos, '#3F8FE0');
  assert.equal(gustavo.barba, 'bigode');
  assert.equal(gustavo.acessorio, 'nenhum');
});

test('nenhum desenvolvedor usa boné nem muda a cor dele', () => {
  for (const [id, aparencia] of Object.entries(APARENCIAS_DEV)) {
    assert.notEqual(aparencia.acessorio, 'bone', `acessório de ${id}`);
    assert.equal(aparencia.bone, undefined, `boné de ${id}`);
  }
});

test('registradas, as aparências passam a valer para os ids dos desenvolvedores', () => {
  assert.notEqual(aparenciaDe('adriano'), APARENCIAS_DEV['adriano']);
  registrarAparencias(APARENCIAS_DEV);
  assert.equal(aparenciaDe('adriano'), APARENCIAS_DEV['adriano']);
  // As do suporte continuam lá.
  assert.equal(aparenciaDe('roberto').acessorio, 'oculos');
});

test('os técnicos do suporte também levam o logo; quem não tem aparência própria, não', () => {
  for (const id of ['roberto', 'fabio', 'guilherme-p', 'luiz']) {
    assert.equal(aparenciaDe(id).logo, true, `logo de ${id}`);
  }
  assert.equal(aparenciaDe('alguem-novo').logo, undefined);
});
