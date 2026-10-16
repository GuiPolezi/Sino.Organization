// Casos da visão geral da equipe de desenvolvimento (quadro e painel).
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { buscarChamados } from '../api/chamados.js';
import { COM_O_DESENVOLVEDOR, FECHADO, resumirChamados } from './chamados.js';
import { resumoEquipe } from './resumoEquipe.js';

// Segunda-feira, logo depois da virada do mês: sábado (31/10) sem chamados, domingo (01/11) com.
const HOJE = '2026-11-02';
const dev = (id) => ({ id, nome: id, funcao: `Função de ${id}`, ausente: false, avatarIniciais: 'X' });
const chamado = (data, status) => ({ data, status, categoria: 'Siscam Web', tipo: 'Bug/Erro' });

const CHAMADOS = {
  a: {
    ficticio: true,
    lista: [
      // Futuro: não conta no mês.
      chamado('2026-11-03', FECHADO),
      chamado('2026-11-02', FECHADO),
      chamado('2026-11-02', COM_O_DESENVOLVEDOR),
      chamado('2026-11-01', FECHADO),
      // Mês passado: não conta no mês.
      chamado('2026-10-30', FECHADO),
      chamado('2026-10-29', 'Pendente'),
    ],
  },
  b: {
    lista: [
      chamado('2026-11-02', FECHADO),
      chamado('2026-11-02', FECHADO),
      chamado('2026-11-01', FECHADO),
      chamado('2026-10-28', COM_O_DESENVOLVEDOR),
      chamado('2026-10-27', 'Aguardando Deploy'),
      chamado('2026-05-04', 'Status Novo'),
    ],
  },
};

test('sem chamados carregados, só o tamanho da equipe aparece', () => {
  for (const chamados of [undefined, {}]) {
    const resumo = resumoEquipe([dev('a'), dev('b')], chamados, HOJE);
    assert.equal(resumo.totalDesenvolvedores, 2);
    assert.equal(resumo.fechadosMes, null);
    assert.equal(resumo.fechadosHoje, null);
    assert.deepEqual(resumo.dias, []);
    assert.deepEqual(resumo.ranking, []);
    assert.deepEqual(resumo.tickets, []);
    assert.deepEqual(resumo.fila, []);
    assert.equal(resumo.ficticio, false);
  }
  assert.equal(resumoEquipe([], {}, HOJE).totalDesenvolvedores, 0);
});

test('fechados no mês: só os do mês corrente até hoje, somados para a equipe', () => {
  // "c" ainda não tem chamados: conta na equipe, mas não no ranking nem nos tickets.
  const resumo = resumoEquipe([dev('a'), dev('b'), dev('c')], CHAMADOS, HOJE);

  assert.equal(resumo.totalDesenvolvedores, 3);
  assert.equal(resumo.fechadosMes, 5);
  assert.equal(resumo.fechadosHoje, 3);
  assert.deepEqual(resumo.ranking, [
    { id: 'b', nome: 'b', funcao: 'Função de b', fechadosMes: 3 },
    { id: 'a', nome: 'a', funcao: 'Função de a', fechadosMes: 2 },
  ]);
  assert.equal(resumo.ficticio, true);
});

test('chamados recebidos por dia: os últimos cinco, sem o fim de semana vazio', () => {
  const { dias } = resumoEquipe([dev('a'), dev('b')], CHAMADOS, HOJE);
  assert.deepEqual(dias, [
    { rotulo: 'Qua', valor: 1, hoje: false },
    { rotulo: 'Qui', valor: 1, hoje: false },
    { rotulo: 'Sex', valor: 1, hoje: false },
    { rotulo: 'Dom', valor: 2, hoje: false },
    { rotulo: 'Hoje', valor: 4, hoje: true },
  ]);
});

test('tickets: os chamados "Com o desenvolvedor" de cada um, na ordem da equipe', () => {
  const { tickets } = resumoEquipe([dev('b'), dev('c'), dev('a')], CHAMADOS, HOJE);
  assert.deepEqual(tickets, [
    { id: 'b', nome: 'b', comODesenvolvedor: 1 },
    { id: 'a', nome: 'a', comODesenvolvedor: 1 },
  ]);
});

test('fila: os status em aberto da equipe, na ordem do fluxo, e os desconhecidos no fim', () => {
  const { fila } = resumoEquipe([dev('a'), dev('b')], CHAMADOS, HOJE);
  assert.deepEqual(fila, [
    { status: COM_O_DESENVOLVEDOR, total: 2 },
    { status: 'Pendente', total: 1 },
    { status: 'Aguardando Deploy', total: 1 },
    { status: 'Status Novo', total: 1 },
  ]);
});

test('empate no ranking mantém a ordem da equipe, e quem não fechou nada entra com zero', () => {
  const chamados = {
    x: { lista: [chamado(HOJE, FECHADO)] },
    y: { lista: [chamado(HOJE, 'Em atendimento')] },
    z: { lista: [chamado(HOJE, FECHADO)] },
  };
  const { ranking } = resumoEquipe([dev('z'), dev('y'), dev('x')], chamados, HOJE);
  assert.deepEqual(
    ranking.map(({ id, fechadosMes }) => [id, fechadosMes]),
    [['z', 1], ['x', 1], ['y', 0]],
  );
});

test('com os dados de demonstração, o quadro bate com o card de cada desenvolvedor', async () => {
  const equipe = ['adriano', 'antonio', 'ketlyn'].map(dev);
  const chamados = await buscarChamados(equipe, HOJE);
  const resumo = resumoEquipe(equipe, chamados, HOJE);

  for (const { id, comODesenvolvedor } of resumo.tickets) {
    const card = resumirChamados(chamados[id].lista, 'tudo', HOJE);
    const noCard = card.status.find(({ status }) => status === COM_O_DESENVOLVEDOR).total;
    assert.equal(comODesenvolvedor, noCard, `tickets de ${id}`);
  }
  assert.equal(
    resumo.fechadosMes,
    resumo.ranking.reduce((total, { fechadosMes }) => total + fechadosMes, 0),
  );
  assert.equal(resumo.ficticio, true);
  assert.equal(resumo.dias.length, 5);
});
