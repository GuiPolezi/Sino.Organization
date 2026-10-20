import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FILTROS,
  POR_PAGINA,
  STATUS,
  contarPorFiltro,
  diaDe,
  filtrarReunioes,
  fimDe,
  inicioDe,
  msAteProximaMudanca,
  paginar,
  partesDataHora,
  statusDe,
} from './periodos.js';

// Instantes explícitos (-03:00 = Brasília): os testes valem em qualquer TZ.
const BR = (s) => new Date(`${s}:00-03:00`);
const AGORA = BR('2026-10-19T10:00'); // segunda, 19/10/2026 10:00

const R = (id, dataHora, horaFim) => ({
  id,
  titulo: id,
  dataHora,
  ...(horaFim !== undefined && { horaFim }),
  modalidade: 'digital',
  membros: [],
});

const ids = (lista) => lista.map((r) => r.id);

test('constantes', () => {
  assert.deepEqual(FILTROS.map((f) => f.id), ['todas', 'em-breve', 'hoje', 'encerradas']);
  assert.deepEqual(FILTROS.map((f) => f.rotulo), ['Todas', 'Em Breve', 'Hoje', 'Encerradas']);
  assert.equal(STATUS['em-breve'].rotulo, 'Em breve');
  assert.equal(STATUS.hoje.id, 'hoje');
  assert.equal(STATUS.encerrada.rotulo, 'Encerrada');
  assert.equal(POR_PAGINA, 5);
});

test('inicioDe/fimDe, inclusive registro sem horaFim', () => {
  const r = R('a', '2026-10-20T16:20', '17:20');
  assert.equal(inicioDe(r).toISOString(), '2026-10-20T19:20:00.000Z');
  assert.equal(fimDe(r).toISOString(), '2026-10-20T20:20:00.000Z');
  const antigo = R('b', '2026-10-20T16:20');
  assert.equal(fimDe(antigo).toISOString(), '2026-10-20T20:20:00.000Z'); // +60 min
  // horaFim inválido ou não posterior: também +60 min
  assert.equal(fimDe(R('c', '2026-10-20T16:20', '16:00')).toISOString(), '2026-10-20T20:20:00.000Z');
  assert.equal(inicioDe(R('d', 'lixo')), null);
  assert.equal(fimDe(R('d', 'lixo')), null);
});

test('diaDe usa o dia de Brasília, não o UTC', () => {
  assert.equal(diaDe(new Date('2026-10-20T01:30:00Z')), '2026-10-19');
  assert.equal(diaDe(new Date('2026-10-20T03:00:00Z')), '2026-10-20');
  assert.equal(diaDe(new Date('2026-10-20T02:59:59Z')), '2026-10-19');
});

test('statusDe nas fronteiras de início e fim', () => {
  const r = R('a', '2026-10-19T14:00', '15:00');
  assert.equal(statusDe(r, BR('2026-10-19T13:59')), 'hoje');
  assert.equal(statusDe(r, BR('2026-10-19T14:00')), 'hoje'); // começou: em andamento
  assert.equal(statusDe(r, new Date(BR('2026-10-19T15:00').getTime() - 1)), 'hoje');
  assert.equal(statusDe(r, BR('2026-10-19T15:00')), 'encerrada'); // fim exato
  assert.equal(statusDe(r, BR('2026-10-18T23:59')), 'em-breve');
  assert.equal(statusDe(R('x', 'lixo'), AGORA), 'encerrada');
});

test('statusDe: meia-noite em Brasília vs UTC', () => {
  // 01:30Z do dia 20 = 22:30 do dia 19 em Brasília
  const agora = new Date('2026-10-20T01:30:00Z');
  assert.equal(statusDe(R('a', '2026-10-19T23:00', '23:30'), agora), 'hoje');
  assert.equal(statusDe(R('b', '2026-10-20T09:00', '10:00'), agora), 'em-breve');
  assert.equal(statusDe(R('c', '2026-10-19T21:00', '22:00'), agora), 'encerrada');
  // logo depois da meia-noite de Brasília (03:00Z), dia 20 vira "hoje"
  assert.equal(statusDe(R('b', '2026-10-20T09:00', '10:00'), new Date('2026-10-20T03:00:00Z')), 'hoje');
});

const LISTA = Object.freeze([
  R('ontem', '2026-10-18T09:00', '10:00'),
  R('hoje-cedo', '2026-10-19T08:00', '09:00'), // encerrada hoje
  R('agora', '2026-10-19T09:30', '11:00'), // em andamento
  R('hoje-tarde', '2026-10-19T16:00', '17:00'),
  R('amanha', '2026-10-20T16:20', '17:20'),
  R('antiga', '2026-10-16T14:00'), // sem horaFim
  R('longe', '2027-01-05T09:00', '09:30'),
]);

test('filtrarReunioes: cada filtro = um selo, e ordem', () => {
  const copia = [...LISTA];
  assert.deepEqual(ids(filtrarReunioes(LISTA, 'todas', AGORA)), [
    'longe', 'amanha', 'hoje-tarde', 'agora', 'hoje-cedo', 'ontem', 'antiga',
  ]);
  // Mais tarde hoje é "Hoje" (não "Em Breve"); encerrada hoje é só "Encerradas".
  assert.deepEqual(ids(filtrarReunioes(LISTA, 'em-breve', AGORA)), ['amanha', 'longe']);
  assert.deepEqual(ids(filtrarReunioes(LISTA, 'hoje', AGORA)), ['agora', 'hoje-tarde']);
  assert.deepEqual(ids(filtrarReunioes(LISTA, 'encerradas', AGORA)), ['hoje-cedo', 'ontem', 'antiga']);
  // Sem sobreposição: cada reunião aparece em exatamente um filtro.
  const filtradas = ['em-breve', 'hoje', 'encerradas'].flatMap((f) => ids(filtrarReunioes(LISTA, f, AGORA)));
  assert.deepEqual([...filtradas].sort(), ids(LISTA).sort());
  // filtro desconhecido = todas
  assert.deepEqual(filtrarReunioes(LISTA, 'xyz', AGORA), filtrarReunioes(LISTA, 'todas', AGORA));
  assert.deepEqual(filtrarReunioes(LISTA, undefined, AGORA), filtrarReunioes(LISTA, 'todas', AGORA));
  assert.deepEqual(filtrarReunioes(LISTA, 'toString', AGORA), filtrarReunioes(LISTA, 'todas', AGORA));
  assert.deepEqual(LISTA, copia);
  assert.notEqual(filtrarReunioes(LISTA, 'todas', AGORA), LISTA);
  assert.deepEqual(filtrarReunioes(null, 'todas', AGORA), []);

  // selo de cada uma
  const selos = Object.fromEntries(LISTA.map((r) => [r.id, statusDe(r, AGORA)]));
  assert.deepEqual(selos, {
    ontem: 'encerrada',
    'hoje-cedo': 'encerrada',
    agora: 'hoje',
    'hoje-tarde': 'hoje',
    amanha: 'em-breve',
    antiga: 'encerrada',
    longe: 'em-breve',
  });
});

test('filtrarReunioes: fronteira do início exato', () => {
  const r = R('a', '2026-10-19T10:00', '11:00');
  // Véspera: em breve; à meia-noite de Brasília vira hoje.
  assert.deepEqual(ids(filtrarReunioes([r], 'em-breve', BR('2026-10-18T23:59'))), ['a']);
  assert.deepEqual(ids(filtrarReunioes([r], 'em-breve', BR('2026-10-19T00:00'))), []);
  assert.deepEqual(ids(filtrarReunioes([r], 'hoje', BR('2026-10-19T00:00'))), ['a']);
  // Hoje até o fim (em andamento incluído); no fim exato, só Encerradas.
  assert.deepEqual(ids(filtrarReunioes([r], 'hoje', BR('2026-10-19T10:30'))), ['a']);
  assert.deepEqual(ids(filtrarReunioes([r], 'hoje', BR('2026-10-19T11:00'))), []);
  assert.deepEqual(ids(filtrarReunioes([r], 'encerradas', BR('2026-10-19T11:00'))), ['a']);
  assert.deepEqual(ids(filtrarReunioes([r], 'encerradas', BR('2026-10-19T10:59'))), []);
});

test('contarPorFiltro', () => {
  assert.deepEqual(contarPorFiltro(LISTA, AGORA), {
    todas: 7,
    'em-breve': 2,
    hoje: 2,
    encerradas: 3,
  });
  assert.deepEqual(contarPorFiltro([], AGORA), { todas: 0, 'em-breve': 0, hoje: 0, encerradas: 0 });
});

test('paginar: limites, vazia e página fora do intervalo', () => {
  const doze = Array.from({ length: 12 }, (_, i) => i + 1);

  const p1 = paginar(doze, 1);
  assert.deepEqual(p1, { itens: [1, 2, 3, 4, 5], pagina: 1, totalPaginas: 3, total: 12, inicio: 1, fim: 5 });

  const p3 = paginar(doze, 3);
  assert.deepEqual(p3.itens, [11, 12]);
  assert.equal(p3.inicio, 11);
  assert.equal(p3.fim, 12);

  assert.equal(paginar(doze, 99).pagina, 3);
  assert.equal(paginar(doze, 0).pagina, 1);
  assert.equal(paginar(doze, -4).pagina, 1);
  assert.equal(paginar(doze, 'x').pagina, 1);

  assert.deepEqual(paginar(doze, 2, 10), {
    itens: [11, 12], pagina: 2, totalPaginas: 2, total: 12, inicio: 11, fim: 12,
  });
  assert.equal(paginar(Array(10).fill(0), 1, 5).totalPaginas, 2);

  assert.deepEqual(paginar([], 3), { itens: [], pagina: 1, totalPaginas: 1, total: 0, inicio: 0, fim: 0 });
  assert.deepEqual(paginar(undefined, 1).itens, []);
});

test('partesDataHora', () => {
  assert.deepEqual(partesDataHora(R('a', '2026-10-20T16:20', '17:20')), {
    diaSemana: 'Terça-Feira',
    data: '20/10/2026',
    horario: '16:20 às 17:20',
  });
  // sem horaFim: +60 min
  assert.equal(partesDataHora(R('b', '2026-10-16T09:05')).horario, '09:05 às 10:05');
  assert.equal(partesDataHora(R('b', '2026-10-16T09:05')).diaSemana, 'Sexta-Feira');

  const semana = ['18', '19', '20', '21', '22', '23', '24'].map(
    (d) => partesDataHora(R('x', `2026-10-${d}T23:30`, '23:45')).diaSemana,
  );
  assert.deepEqual(semana, [
    'Domingo', 'Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado',
  ]);
  assert.deepEqual(partesDataHora(R('z', 'lixo')), { diaSemana: '', data: '', horario: '' });
});

test('msAteProximaMudanca', () => {
  const MIN = 60_000;
  // próxima: fim de 'agora' às 11:00
  assert.equal(msAteProximaMudanca(LISTA, AGORA), 60 * MIN);
  // só uma futura amanhã: a meia-noite de Brasília vem antes do início
  const amanha = [R('a', '2026-10-20T16:20', '17:20')];
  assert.equal(msAteProximaMudanca(amanha, BR('2026-10-19T23:00')), 60 * MIN);
  assert.equal(
    msAteProximaMudanca(amanha, new Date('2026-10-20T01:30:00Z')), // 22:30 em Brasília
    90 * MIN,
  );
  // tudo encerrado em dias passados ou lista vazia: nada muda
  assert.equal(msAteProximaMudanca([R('v', '2026-10-01T09:00', '10:00')], AGORA), null);
  assert.equal(msAteProximaMudanca([], AGORA), null);
  // encerrada hoje: sai do filtro Hoje à meia-noite
  assert.equal(
    msAteProximaMudanca([R('c', '2026-10-19T08:00', '09:00')], AGORA),
    14 * 60 * MIN,
  );
});
