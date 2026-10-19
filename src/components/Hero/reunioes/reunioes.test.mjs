import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES,
  MODALIDADES,
  adicionarMembro,
  chaveMembro,
  criarReuniao,
  formatarDataHora,
  minDataHoraLocal,
  normalizarNome,
  ordenarReunioes,
  removerMembro,
  removerReuniao,
  separarReunioes,
  validarReuniao,
} from './reunioes.js';
import { CHAVE_STORAGE, carregarReunioes, salvarReunioes } from './reunioesRepo.js';

const AGORA = new Date(2026, 9, 19, 10, 0); // 19/10/2026 10:00 local

const membrosDe = (...nomes) =>
  nomes.reduce((lista, nome) => adicionarMembro(lista, nome).membros, []);

const valido = () => ({
  titulo: '  Alinhamento   semanal ',
  dataHora: '2026-10-20T14:30',
  modalidade: MODALIDADES.DIGITAL,
  membros: membrosDe('Ana', 'João'),
});

test('normalizarNome e chaveMembro', () => {
  assert.equal(normalizarNome('  Ana   Maria  '), 'Ana Maria');
  assert.equal(normalizarNome(undefined), '');
  assert.equal(chaveMembro('João '), chaveMembro('joao'));
  assert.equal(chaveMembro('JOAO'), 'joao');
  assert.equal(chaveMembro(' José  da   Conceição'), 'jose da conceicao');
});

test('adicionarMembro normaliza e gera id', () => {
  const r = adicionarMembro([], '  Ana   Maria ');
  assert.equal(r.ok, true);
  assert.equal(r.membros.length, 1);
  assert.equal(r.membros[0].nome, 'Ana Maria');
  assert.ok(r.membros[0].id);
});

test('adicionarMembro recusa duplicado por acento/caixa/espaços', () => {
  const lista = membrosDe('João');
  for (const nome of ['joao', 'JOAO ', '  João  ', 'jOÃo']) {
    const r = adicionarMembro(lista, nome);
    assert.equal(r.ok, false, nome);
    assert.match(r.erro, /já está/);
    assert.equal(r.membros, lista);
  }
});

test('adicionarMembro recusa vazio, longo demais e acima do limite', () => {
  assert.equal(adicionarMembro([], '   ').ok, false);
  assert.equal(adicionarMembro([], null).ok, false);
  assert.equal(adicionarMembro([], 'a'.repeat(LIMITES.nomeMembroMax)).ok, true);
  assert.equal(adicionarMembro([], 'a'.repeat(LIMITES.nomeMembroMax + 1)).ok, false);

  const cheia = Array.from({ length: LIMITES.membrosMax }, (_, i) => ({
    id: String(i),
    nome: `Pessoa ${i}`,
  }));
  const r = adicionarMembro(cheia, 'Nova');
  assert.equal(r.ok, false);
  assert.match(r.erro, /Limite/);
});

test('adicionarMembro e removerMembro não mutam a entrada', () => {
  const lista = Object.freeze(membrosDe('Ana', 'Bia'));
  const mais = adicionarMembro(lista, 'Caio').membros;
  assert.equal(lista.length, 2);
  assert.equal(mais.length, 3);

  const menos = removerMembro(lista, lista[0].id);
  assert.deepEqual(menos.map((m) => m.nome), ['Bia']);
  assert.equal(lista.length, 2);
});

test('validarReuniao aceita dados válidos', () => {
  assert.deepEqual(validarReuniao(valido(), AGORA), {});
});

test('validarReuniao: título', () => {
  assert.ok(validarReuniao({ ...valido(), titulo: '   ' }, AGORA).titulo);
  assert.ok(
    validarReuniao({ ...valido(), titulo: 'x'.repeat(LIMITES.tituloMax + 1) }, AGORA).titulo,
  );
});

test('validarReuniao: data ausente, inválida e passada', () => {
  assert.ok(validarReuniao({ ...valido(), dataHora: '' }, AGORA).dataHora);
  assert.ok(validarReuniao({ ...valido(), dataHora: 'amanhã' }, AGORA).dataHora);
  assert.ok(validarReuniao({ ...valido(), dataHora: '2026-02-30T10:00' }, AGORA).dataHora);
  assert.ok(validarReuniao({ ...valido(), dataHora: '2026-10-20T25:00' }, AGORA).dataHora);
  assert.match(
    validarReuniao({ ...valido(), dataHora: '2026-10-19T09:59' }, AGORA).dataHora,
    /futuro/,
  );
  // exatamente agora também não vale
  assert.ok(validarReuniao({ ...valido(), dataHora: '2026-10-19T10:00' }, AGORA).dataHora);
  assert.equal(validarReuniao({ ...valido(), dataHora: '2026-10-19T10:01' }, AGORA).dataHora, undefined);
});

test('validarReuniao: modalidade inválida', () => {
  assert.ok(validarReuniao({ ...valido(), modalidade: 'hibrida' }, AGORA).modalidade);
  assert.ok(validarReuniao({ ...valido(), modalidade: undefined }, AGORA).modalidade);
  assert.equal(
    validarReuniao({ ...valido(), modalidade: MODALIDADES.PRESENCIAL }, AGORA).modalidade,
    undefined,
  );
});

test('validarReuniao: sem membros, duplicados e nome vazio', () => {
  assert.ok(validarReuniao({ ...valido(), membros: [] }, AGORA).membros);
  assert.ok(validarReuniao({ ...valido(), membros: undefined }, AGORA).membros);
  const dup = [
    { id: '1', nome: 'João' },
    { id: '2', nome: ' joao' },
  ];
  assert.match(validarReuniao({ ...valido(), membros: dup }, AGORA).membros, /repetidos/);
  assert.ok(validarReuniao({ ...valido(), membros: [{ id: '1', nome: '  ' }] }, AGORA).membros);
});

test('criarReuniao normaliza e monta a reunião', () => {
  const dados = valido();
  const r = criarReuniao(dados, AGORA);
  assert.equal(r.ok, true);
  const { reuniao } = r;
  assert.ok(reuniao.id);
  assert.equal(reuniao.titulo, 'Alinhamento semanal');
  assert.equal(reuniao.dataHora, '2026-10-20T14:30');
  assert.equal(reuniao.modalidade, 'digital');
  assert.deepEqual(reuniao.membros, dados.membros);
  assert.equal(reuniao.criadaEm, AGORA.toISOString());
  assert.notEqual(reuniao.membros, dados.membros); // cópia
});

test('criarReuniao devolve erros quando inválida', () => {
  const r = criarReuniao({ titulo: '', dataHora: '', modalidade: 'x', membros: [] }, AGORA);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.erros).sort(), ['dataHora', 'membros', 'modalidade', 'titulo']);
});

const R = (id, dataHora) => ({ id, titulo: id, dataHora, modalidade: 'digital', membros: [] });

test('ordenarReunioes: próximas (mais perto no topo) e depois passadas (recentes antes)', () => {
  const lista = [
    R('passada-antiga', '2026-01-01T09:00'),
    R('futura-longe', '2027-03-01T09:00'),
    R('passada-recente', '2026-10-18T09:00'),
    R('futura-perto', '2026-10-19T11:00'),
  ];
  const copia = [...lista];
  assert.deepEqual(
    ordenarReunioes(lista, AGORA).map((r) => r.id),
    ['futura-perto', 'futura-longe', 'passada-recente', 'passada-antiga'],
  );
  assert.deepEqual(lista, copia); // não muta

  const { proximas, passadas } = separarReunioes(lista, AGORA);
  assert.deepEqual(proximas.map((r) => r.id), ['futura-perto', 'futura-longe']);
  assert.deepEqual(passadas.map((r) => r.id), ['passada-recente', 'passada-antiga']);
  assert.deepEqual(ordenarReunioes([], AGORA), []);
});

test('removerReuniao não muta e remove só o id pedido', () => {
  const lista = Object.freeze([R('a', '2026-11-01T10:00'), R('b', '2026-11-02T10:00')]);
  assert.deepEqual(removerReuniao(lista, 'a').map((r) => r.id), ['b']);
  assert.deepEqual(removerReuniao(lista, 'zzz').map((r) => r.id), ['a', 'b']);
  assert.equal(lista.length, 2);
});

test('formatarDataHora e minDataHoraLocal', () => {
  const txt = formatarDataHora('2026-10-20T14:30');
  assert.match(txt, /20/);
  assert.match(txt, /out/);
  assert.match(txt, /2026/);
  assert.ok(txt.endsWith(' · 14:30'));
  assert.equal(formatarDataHora('lixo'), '');

  assert.equal(minDataHoraLocal(new Date(2026, 9, 19, 10, 0, 30)), '2026-10-19T10:01');
  assert.equal(minDataHoraLocal(new Date(2026, 11, 31, 23, 59)), '2027-01-01T00:00');
});

// Storage falso para testar o repositório sem navegador.
const storageFalso = (inicial = {}) => {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => {
      dados[k] = String(v);
    },
  };
};

test('repositório: ida e volta', () => {
  const s = storageFalso();
  const { reuniao } = criarReuniao(valido(), AGORA);
  assert.equal(salvarReunioes([reuniao], s), true);
  assert.deepEqual(carregarReunioes(s), [reuniao]);
});

test('repositório tolera ausência, JSON corrompido, schema inválido e storage quebrado', () => {
  assert.deepEqual(carregarReunioes(storageFalso()), []);
  assert.deepEqual(carregarReunioes(null), []);
  assert.deepEqual(carregarReunioes(storageFalso({ [CHAVE_STORAGE]: '{quebrado' })), []);
  assert.deepEqual(carregarReunioes(storageFalso({ [CHAVE_STORAGE]: '{"a":1}' })), []);

  const ok = R('ok', '2026-11-01T10:00');
  const misto = JSON.stringify([ok, null, { id: 'x' }, { ...ok, id: 'y', membros: [{}] }]);
  assert.deepEqual(carregarReunioes(storageFalso({ [CHAVE_STORAGE]: misto })), [ok]);

  const quebrado = {
    getItem: () => {
      throw new Error('bloqueado');
    },
    setItem: () => {
      throw new Error('cota');
    },
  };
  assert.deepEqual(carregarReunioes(quebrado), []);
  assert.equal(salvarReunioes([ok], quebrado), false);
});
