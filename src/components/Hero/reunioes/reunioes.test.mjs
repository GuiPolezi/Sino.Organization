import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITES,
  MODALIDADES,
  adicionarMembro,
  chaveMembro,
  criarReuniao,
  editarReuniao,
  formatarDataHora,
  minDataHoraLocal,
  normalizarNome,
  ordenarReunioes,
  removerMembro,
  removerReuniao,
  separarReunioes,
  validarReuniao,
} from './reunioes.js';
import {
  CHAVE_MIGRADA,
  CHAVE_STORAGE,
  lerReunioesLocais,
  migrarReunioesLocais,
  reunioesParaMigrar,
} from './reunioesRepo.js';

// Instantes explícitos em Brasília (-03:00): os testes valem em qualquer TZ.
const AGORA = new Date('2026-10-19T10:00:00-03:00'); // 19/10/2026 10:00 Brasília

const membrosDe = (...nomes) =>
  nomes.reduce((lista, nome) => adicionarMembro(lista, nome).membros, []);

const valido = () => ({
  titulo: '  Alinhamento   semanal ',
  dataHora: '2026-10-20T14:30',
  horaFim: '15:30',
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

test('validarReuniao: horaFim ausente, inválida e não posterior ao início', () => {
  assert.match(validarReuniao({ ...valido(), horaFim: '' }, AGORA).horaFim, /término/);
  assert.match(validarReuniao({ ...valido(), horaFim: undefined }, AGORA).horaFim, /término/);
  assert.match(validarReuniao({ ...valido(), horaFim: '25:00' }, AGORA).horaFim, /inválido/);
  assert.match(validarReuniao({ ...valido(), horaFim: '9:00' }, AGORA).horaFim, /inválido/);
  assert.match(validarReuniao({ ...valido(), horaFim: '14:30' }, AGORA).horaFim, /depois/);
  assert.match(validarReuniao({ ...valido(), horaFim: '14:29' }, AGORA).horaFim, /depois/);
  assert.equal(validarReuniao({ ...valido(), horaFim: '14:31' }, AGORA).horaFim, undefined);
  assert.equal(validarReuniao({ ...valido(), horaFim: '15:30:00' }, AGORA).horaFim, undefined);
  // início inválido: só acusa o horaFim se ele mesmo for ruim
  assert.equal(validarReuniao({ ...valido(), dataHora: 'x', horaFim: '01:00' }, AGORA).horaFim, undefined);
  assert.equal(criarReuniao({ ...valido(), horaFim: '15:30:00' }, AGORA).reuniao.horaFim, '15:30');
});

test('fuso: Brasília independe do fuso da máquina', () => {
  // 01:30Z do dia 20 ainda é 22:30 do dia 19 em Brasília
  const agora = new Date('2026-10-20T01:30:00Z');
  assert.equal(minDataHoraLocal(agora), '2026-10-19T22:31');
  assert.match(validarReuniao({ ...valido(), dataHora: '2026-10-19T22:30' }, agora).dataHora, /futuro/);
  assert.equal(validarReuniao({ ...valido(), dataHora: '2026-10-19T22:31', horaFim: '23:00' }, agora).dataHora, undefined);
  assert.ok(formatarDataHora('2026-10-19T23:30').endsWith(' · 23:30'));
  assert.match(formatarDataHora('2026-10-19T23:30'), /19/);
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
  assert.equal(reuniao.horaFim, '15:30');
  assert.equal(reuniao.modalidade, 'digital');
  assert.deepEqual(reuniao.membros, dados.membros);
  assert.equal(reuniao.criadaEm, AGORA.toISOString());
  assert.notEqual(reuniao.membros, dados.membros); // cópia
});

test('criarReuniao devolve erros quando inválida', () => {
  const r = criarReuniao({ titulo: '', dataHora: '', modalidade: 'x', membros: [] }, AGORA);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.erros).sort(), ['dataHora', 'horaFim', 'membros', 'modalidade', 'titulo']);
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

test('editarReuniao: troca campos, mantém id e criadaEm, não muta', () => {
  const { reuniao } = criarReuniao(valido(), AGORA);
  const lista = Object.freeze([reuniao]);
  const depois = new Date(AGORA.getTime() + 60_000);
  const r = editarReuniao(lista, reuniao.id, { ...valido(), titulo: ' Novo  título ', horaFim: '16:00' }, depois);
  assert.equal(r.ok, true);
  assert.equal(r.reuniao.id, reuniao.id);
  assert.equal(r.reuniao.criadaEm, reuniao.criadaEm);
  assert.equal(r.reuniao.titulo, 'Novo título');
  assert.equal(r.reuniao.horaFim, '16:00');
  assert.equal(r.reuniao.editadaEm, depois.toISOString());
  assert.deepEqual(r.reunioes.map((x) => x.id), [reuniao.id]);
  assert.equal(lista[0].titulo, 'Alinhamento semanal');
});

test('editarReuniao: reunião passada pode manter a data, mas não ir para outra passada', () => {
  const { reuniao } = criarReuniao(valido(), AGORA); // 20/10 14:30
  const muitoDepois = new Date('2026-10-25T10:00:00-03:00');
  const mesmaData = editarReuniao([reuniao], reuniao.id, { ...valido(), titulo: 'Ata corrigida' }, muitoDepois);
  assert.equal(mesmaData.ok, true);
  const outraPassada = editarReuniao(
    [reuniao],
    reuniao.id,
    { ...valido(), dataHora: '2026-10-21T14:30' },
    muitoDepois,
  );
  assert.equal(outraPassada.ok, false);
  assert.ok(outraPassada.erros.dataHora);
});

test('editarReuniao: id desconhecido e dados inválidos', () => {
  const { reuniao } = criarReuniao(valido(), AGORA);
  assert.equal(editarReuniao([reuniao], 'nao-existe', valido(), AGORA).ok, false);
  const r = editarReuniao([reuniao], reuniao.id, { ...valido(), titulo: '  ', membros: [] }, AGORA);
  assert.equal(r.ok, false);
  assert.ok(r.erros.titulo && r.erros.membros);
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

  assert.equal(minDataHoraLocal(new Date('2026-10-19T10:00:30-03:00')), '2026-10-19T10:01');
  assert.equal(minDataHoraLocal(new Date('2026-12-31T23:59:00-03:00')), '2027-01-01T00:00');
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

test('leitura local (para a migração) tolera ausência, JSON corrompido, schema inválido e storage quebrado', () => {
  assert.deepEqual(lerReunioesLocais(storageFalso()), []);
  assert.deepEqual(lerReunioesLocais(null), []);
  assert.deepEqual(lerReunioesLocais(storageFalso({ [CHAVE_STORAGE]: '{quebrado' })), []);
  assert.deepEqual(lerReunioesLocais(storageFalso({ [CHAVE_STORAGE]: '{"a":1}' })), []);

  const ok = R('ok', '2026-11-01T10:00');
  const misto = JSON.stringify([ok, null, { id: 'x' }, { ...ok, id: 'y', membros: [{}] }]);
  assert.deepEqual(lerReunioesLocais(storageFalso({ [CHAVE_STORAGE]: misto })), [ok]);

  const quebrado = {
    getItem: () => {
      throw new Error('bloqueado');
    },
  };
  assert.deepEqual(lerReunioesLocais(quebrado), []);
});

test('migração deixa de fora as reuniões de exemplo', () => {
  const real = { ...R('real', '2026-11-01T10:00'), titulo: 'Reunião com a Câmara' };
  const exemplo = { ...R('ex', '2026-11-01T10:00'), titulo: 'Planejamento da Sprint 42' };
  const s = storageFalso({ [CHAVE_STORAGE]: JSON.stringify([real, exemplo]) });
  assert.deepEqual(reunioesParaMigrar(s), [real]);
});

test('migração envia uma vez, pula repetidas/inválidas e para sem conexão', async () => {
  const a = { ...R('aaaaaaaa', '2026-11-01T10:00'), titulo: 'A' };
  const b = { ...R('bbbbbbbb', '2026-11-02T10:00'), titulo: 'B' };
  const comStatus = (status) => Object.assign(new Error('x'), { status });

  const s = storageFalso({ [CHAVE_STORAGE]: JSON.stringify([a, b]) });
  const enviadas = [];
  const enviar = async (r) => {
    if (r.id === 'aaaaaaaa') throw comStatus(409);
    enviadas.push(r.id);
  };
  assert.equal(await migrarReunioesLocais(s, enviar), 1);
  assert.deepEqual(enviadas, ['bbbbbbbb']);
  assert.ok(s.dados[CHAVE_MIGRADA]);
  assert.equal(await migrarReunioesLocais(s, enviar), 0); // já migrou

  // Sem conexão: não marca, tenta de novo na próxima visita.
  const offline = storageFalso({ [CHAVE_STORAGE]: JSON.stringify([a]) });
  assert.equal(await migrarReunioesLocais(offline, async () => { throw comStatus(undefined); }), 0);
  assert.equal(offline.dados[CHAVE_MIGRADA], undefined);
});
