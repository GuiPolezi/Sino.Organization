// node --test src/components/Hero/reunioes/reunioesSeed.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { chaveMembro, validarReuniao } from './reunioes.js';
import { gerarReunioesExemplo, NOMES_EXEMPLO } from './reunioesSeed.js';
import {
  CHAVE_EXEMPLOS,
  CHAVE_STORAGE,
  carregarReunioes,
  semearExemplos,
} from './reunioesRepo.js';

const OFFSET = 3 * 60 * 60 * 1000;
// "2026-10-19T14:20" em Brasília -> Date
const brt = (s) => new Date(Date.parse(`${s}:00Z`) + OFFSET);
const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Classifica pelo relógio de Brasília (independe do fuso do processo).
const classificar = (r, agora) => {
  const a = new Date(agora.getTime() - OFFSET).toISOString();
  const hoje = a.slice(0, 10);
  const mAgora = minutos(a.slice(11, 16));
  const dia = r.dataHora.slice(0, 10);
  if (dia > hoje) return 'breve';
  if (dia < hoje) return 'encerrada';
  const ini = minutos(r.dataHora.slice(11, 16));
  const fim = minutos(r.horaFim);
  if (fim <= mAgora) return 'hoje-encerrada';
  if (ini <= mAgora) return 'hoje-andamento';
  return 'hoje-depois';
};

const AGORAS = [
  '2026-10-19T14:20', // seg. à tarde
  '2026-10-19T08:05', // cedo
  '2026-10-19T23:50', // perto da meia-noite
  '2026-10-20T00:10', // madrugada
  '2026-10-24T11:00', // sábado
  '2026-12-31T19:40', // virada de ano
];

for (const s of AGORAS) {
  test(`exemplos consistentes para agora=${s} (Brasília)`, () => {
    const agora = brt(s);
    const lista = gerarReunioesExemplo(agora);
    assert.ok(lista.length >= 9 && lista.length <= 10);
    assert.equal(new Set(lista.map((r) => r.id)).size, lista.length);

    for (const r of lista) {
      // Tudo válido, exceto a regra "no futuro" (há histórico).
      assert.deepEqual(validarReuniao(r, new Date(2000, 0, 1)), {}, r.titulo);
      assert.match(r.dataHora, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      assert.match(r.horaFim, /^\d{2}:\d{2}$/);
      assert.ok(minutos(r.horaFim) > minutos(r.dataHora.slice(11)), r.titulo);
      const chaves = r.membros.map((m) => chaveMembro(m.nome));
      assert.equal(new Set(chaves).size, chaves.length, r.titulo);
      assert.ok(r.membros.length >= 1 && r.membros.length <= 8);
      assert.ok(!Number.isNaN(Date.parse(r.criadaEm)));
    }

    const cats = lista.map((r) => classificar(r, agora));
    const conta = (c) => cats.filter((x) => x === c).length;
    assert.ok(conta('breve') >= 3, cats.join());
    assert.ok(conta('encerrada') >= 3, cats.join());
    assert.ok(conta('hoje-andamento') >= 1, cats.join());
    assert.ok(cats.filter((c) => c.startsWith('hoje')).length >= 2, cats.join());
  });
}

test('dia útil à tarde tem as três situações de hoje', () => {
  const agora = brt('2026-10-19T14:20');
  const cats = gerarReunioesExemplo(agora).map((r) => classificar(r, agora));
  for (const c of ['hoje-encerrada', 'hoje-andamento', 'hoje-depois']) {
    assert.ok(cats.includes(c), c);
  }
});

test('determinístico dado agora (exceto ids)', () => {
  const agora = brt('2026-10-19T14:20');
  const semIds = (l) =>
    l.map(({ id, membros, ...r }) => ({ ...r, membros: membros.map((m) => m.nome) }));
  assert.deepEqual(semIds(gerarReunioesExemplo(agora)), semIds(gerarReunioesExemplo(agora)));
});

test('nomes existem nos JSONs da equipe', () => {
  const ler = (f) =>
    JSON.parse(readFileSync(new URL(`../../../data/${f}`, import.meta.url), 'utf8')).team.map(
      (p) => p.name,
    );
  const todos = new Set([...ler('team.json'), ...ler('dev-team.json')]);
  for (const n of NOMES_EXEMPLO) assert.ok(todos.has(n), n);
  for (const r of gerarReunioesExemplo()) {
    for (const m of r.membros) assert.ok(todos.has(m.nome), m.nome);
  }
});

const storageFalso = (inicial = {}) => {
  const dados = { ...inicial };
  return {
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = String(v);
    },
    removeItem: (k) => delete dados[k],
    dados,
  };
};

test('semeia uma vez, adiciona sem apagar e não volta após remoção', () => {
  const minha = { id: 'x', titulo: 'Minha', dataHora: '2030-01-01T10:00', modalidade: 'digital', membros: [{ id: 'm', nome: 'Ana' }] };
  const s = storageFalso({ [CHAVE_STORAGE]: JSON.stringify([minha]) });

  assert.equal(semearExemplos(s), true);
  const depois = carregarReunioes(s);
  assert.ok(depois.length >= 10);
  assert.deepEqual(depois[0], minha);
  assert.ok(s.dados[CHAVE_EXEMPLOS]);

  // Usuário apaga tudo: não ressemeia.
  s.setItem(CHAVE_STORAGE, '[]');
  assert.equal(semearExemplos(s), false);
  assert.deepEqual(carregarReunioes(s, { semear: true }), []);
});

test('semeadura tolera storage ausente, quebrado ou dado corrompido', () => {
  assert.equal(semearExemplos(null), false);
  const quebrado = {
    getItem: () => {
      throw new Error('bloqueado');
    },
    setItem: () => {
      throw new Error('bloqueado');
    },
  };
  assert.equal(semearExemplos(quebrado), false);
  assert.deepEqual(carregarReunioes(quebrado, { semear: true }), []);

  const corrompido = storageFalso({ [CHAVE_STORAGE]: '{quebrado' });
  assert.equal(semearExemplos(corrompido), false);
  assert.equal(corrompido.dados[CHAVE_STORAGE], '{quebrado');

  // Storage explícito sem opção não semeia (testes do repo seguem iguais).
  const vazio = storageFalso();
  assert.deepEqual(carregarReunioes(vazio), []);
  assert.equal(vazio.dados[CHAVE_EXEMPLOS], undefined);
});
