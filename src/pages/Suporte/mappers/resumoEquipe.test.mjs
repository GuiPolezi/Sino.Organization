// Casos da visão geral da equipe (quadro e painel).
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { resumoEquipe } from './resumoEquipe.js';

const tecnico = (id, extra = {}) => ({ id, nome: id, funcao: null, ausente: false, avatarIniciais: 'X', ...extra });
const tarefas = (concluidasMes, atrasadas = 0) => ({ abertas: 2, emAndamento: 1, concluidasMes, atrasadas });

test('só com a identidade dos técnicos, o que não tem dado sai vazio', () => {
  const resumo = resumoEquipe([tecnico('a'), tecnico('b', { ausente: true })], null);

  assert.equal(resumo.totalTecnicos, 2);
  assert.deepEqual(resumo.status, { disponivel: 1, em_atendimento: 0, ausente: 1 });
  assert.equal(resumo.temStatusAoVivo, false);
  assert.equal(resumo.chamados, null);
  assert.equal(resumo.slaMedio, null);
  assert.equal(resumo.avaliacaoMedia, null);
  assert.deepEqual(resumo.destaques, []);
  assert.deepEqual(resumo.dias, []);
  assert.equal(resumo.atendimentosHoje, null);
  assert.equal(resumo.ficticio, false);
});

test('equipe vazia não quebra', () => {
  const resumo = resumoEquipe([], {});

  assert.equal(resumo.totalTecnicos, 0);
  assert.equal(resumo.slaMedio, null);
  assert.deepEqual(resumo.destaques, []);
});

test('sem dados nos técnicos, os totais vêm dos extras', () => {
  const extras = {
    ficticio: true,
    chamados: { abertos: 5, emAndamento: 4, concluidasMes: 90, atrasadas: 1 },
    slaMedio: 96,
    avaliacaoMedia: 4.7,
    destaques: [
      { id: 'b', concluidasMes: 30 },
      { id: 'sumiu', concluidasMes: 99 },
      { id: 'a', concluidasMes: 60 },
    ],
  };
  const resumo = resumoEquipe([tecnico('a'), tecnico('b')], extras);

  assert.deepEqual(resumo.chamados, extras.chamados);
  assert.equal(resumo.slaMedio, 96);
  assert.equal(resumo.avaliacaoMedia, 4.7);
  assert.deepEqual(resumo.destaques, [
    { id: 'a', nome: 'a', concluidasMes: 60 },
    { id: 'b', nome: 'b', concluidasMes: 30 },
  ]);
  assert.equal(resumo.ficticio, true);
});

test('dados reais dos técnicos têm prioridade sobre os extras', () => {
  const equipe = [
    tecnico('a', { tarefas: tarefas(10, 1), slaCumprido: 90, avaliacaoMedia: 4, status: 'em_atendimento' }),
    tecnico('b', { tarefas: tarefas(30), slaCumprido: 95, avaliacaoMedia: 5, status: 'disponivel' }),
    tecnico('c'),
  ];
  const resumo = resumoEquipe(equipe, { slaMedio: 1, chamados: { abertos: 0, emAndamento: 0, concluidasMes: 0, atrasadas: 0 } });

  assert.deepEqual(resumo.chamados, { abertos: 4, emAndamento: 2, concluidasMes: 40, atrasadas: 1 });
  assert.equal(resumo.slaMedio, 93); // média de 90 e 95, arredondada
  assert.equal(resumo.avaliacaoMedia, 4.5);
  assert.deepEqual(resumo.status, { disponivel: 2, em_atendimento: 1, ausente: 0 });
  assert.equal(resumo.temStatusAoVivo, true);
  assert.deepEqual(resumo.destaques.map((d) => d.id), ['b', 'a']);
});

test('os últimos dias terminam em hoje, com os dias da semana antes', () => {
  // 2026-10-08 12:00 em São Paulo é uma quinta-feira.
  const agora = Date.parse('2026-10-08T15:00:00Z');
  const { dias } = resumoEquipe([], { atendimentosUltimosDias: [41, 52, 47] }, agora);

  assert.deepEqual(dias, [
    { rotulo: 'Ter', valor: 41, hoje: false },
    { rotulo: 'Qua', valor: 52, hoje: false },
    { rotulo: 'Hoje', valor: 47, hoje: true },
  ]);
});
