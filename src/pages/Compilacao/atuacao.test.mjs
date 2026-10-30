// Casos da atuação de cada pessoa no card de /compilacao (atuacao.js).
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERIODOS,
  agoraEmBrasilia,
  atividadeRecente,
  atuacaoDe,
  diaEMes,
  nomeDaCidade,
  normasDoPeriodo,
  rotuloDataHora,
} from './atuacao.js';
import { PRODUCAO, normasPorDia } from './dados.js';
import { APARENCIAS_COMPILACAO, EQUIPE_COMPILACAO } from './equipe.js';

// Uma sexta-feira.
const HOJE = '2026-10-30';

test('a equipe: os sete nomes, as iniciais do avatar e todos com aparência e produção', () => {
  assert.deepEqual(
    EQUIPE_COMPILACAO.map(({ nome }) => nome),
    ['Leonardo', 'Ramon', 'G.Dressano', 'G.Lopes', 'Nathalia', 'Laura', 'Damaris'],
  );
  const iniciais = Object.fromEntries(EQUIPE_COMPILACAO.map(({ nome, avatarIniciais }) => [nome, avatarIniciais]));
  assert.equal(iniciais['G.Dressano'], 'GD');
  assert.equal(iniciais['G.Lopes'], 'GL');
  assert.equal(iniciais.Nathalia, 'N');
  for (const { id } of EQUIPE_COMPILACAO) {
    assert.ok(APARENCIAS_COMPILACAO[id], `aparência de ${id}`);
    assert.ok(PRODUCAO[id], `produção de ${id}`);
  }
});

test('toda a equipe tem atuação, e só quem está em Atualizações tem mais de uma cidade', () => {
  for (const { id } of EQUIPE_COMPILACAO) {
    const atuacao = atuacaoDe(id, HOJE);
    assert.ok(atuacao, id);
    assert.ok(atuacao.cidades.length >= 1, id);
    if (atuacao.responsabilidade === 'projetos') assert.equal(atuacao.cidades.length, 1, id);
  }
  assert.ok(
    EQUIPE_COMPILACAO.some(({ id }) => atuacaoDe(id, HOJE).cidades.length > 1),
    'alguém precisa mostrar o "Ver mais"',
  );
  assert.equal(atuacaoDe('ninguem', HOJE), null);
});

test('a escolha do card troca a responsabilidade, as cidades e a data da última alteração', () => {
  const antes = atuacaoDe('nathalia', HOJE);
  assert.equal(antes.responsabilidade, 'atualizacoes');
  // Escrita à mão: um dia útil antes de sexta, às 10:50.
  assert.deepEqual(antes.alteradaEm, { data: '2026-10-29', hora: '10:50' });

  const alteradaEm = { data: HOJE, hora: '15:04' };
  const depois = atuacaoDe('nathalia', HOJE, { responsabilidade: 'projetos', alteradaEm });
  assert.equal(depois.rotulo, 'Projetos Novos');
  assert.equal(depois.cidades.length, 1);
  assert.deepEqual(depois.alteradaEm, alteradaEm);
});

test('a última alteração escrita à mão pula o fim de semana', () => {
  // Segunda-feira: três dias úteis antes é a quarta da semana anterior.
  assert.equal(atuacaoDe('leonardo', '2026-11-02').alteradaEm.data, '2026-10-28');
});

test('rótulos de cidade, data e hora', () => {
  assert.equal(nomeDaCidade({ nome: 'Piracicaba', uf: 'SP' }), 'Piracicaba - SP');
  assert.equal(rotuloDataHora({ data: '2026-10-30', hora: '10:50' }), '30/10 - 10:50');
  assert.equal(diaEMes('2026-10-30'), '30/10');
  // 13:25 UTC = 10:25 em Brasília (sem horário de verão).
  assert.deepEqual(agoraEmBrasilia(Date.UTC(2026, 9, 30, 13, 25)), { data: '2026-10-30', hora: '10:25' });
  assert.deepEqual(agoraEmBrasilia(Date.UTC(2026, 9, 31, 2, 5)), { data: '2026-10-30', hora: '23:05' });
});

test('normas do período: hoje ≤ 7 dias ≤ 30 dias ≤ todo o tempo, e os tipos fecham o total', () => {
  const totais = PERIODOS.map(({ dias }) => normasDoPeriodo('leonardo', HOJE, dias).total);
  const [tudo, trinta, sete, hoje] = totais;
  assert.ok(hoje <= sete && sete <= trinta && trinta <= tudo, totais.join(' '));

  const porDia = normasPorDia('leonardo', HOJE);
  assert.equal(hoje, porDia[HOJE]);
  const historico = Object.values(porDia).reduce((a, b) => a + b, 0);
  assert.equal(tudo, historico + PRODUCAO.leonardo.anteriores);

  for (const { dias } of PERIODOS) {
    const { total, porTipo } = normasDoPeriodo('leonardo', HOJE, dias);
    assert.equal(porTipo.length, 6);
    assert.equal(porTipo.reduce((soma, { valor }) => soma + valor, 0), total);
  }
  assert.equal(normasDoPeriodo('ninguem', HOJE, null).total, 0);
});

test('7 dias contam hoje e os seis dias antes', () => {
  const porDia = normasPorDia('laura', HOJE);
  const esperado = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', HOJE].reduce(
    (soma, data) => soma + (porDia[data] ?? 0),
    0,
  );
  assert.equal(normasDoPeriodo('laura', HOJE, 7).total, esperado);
});

test('atividade recente: na cidade da pessoa, sempre a mesma no mesmo dia, nunca no futuro', () => {
  const { cidades } = atuacaoDe('ramon', HOJE);
  const nomes = cidades.map(({ nome, uf }) => `${nome}-${uf}`);

  const manha = { data: HOJE, hora: '10:50' };
  const atividade = atividadeRecente('ramon', cidades, manha);
  assert.deepEqual(atividadeRecente('ramon', cidades, manha), atividade);
  assert.ok(nomes.includes(atividade.cidade));
  assert.equal(atividade.data, HOJE);
  assert.ok(atividade.hora < '10:50' && atividade.hora >= '08:05', atividade.hora);
  for (const campo of ['acao', 'modulo', 'descricao']) assert.ok(atividade[campo], campo);

  // Cedo demais: a atividade é do dia útil anterior, no fim do expediente.
  const cedo = atividadeRecente('ramon', cidades, { data: HOJE, hora: '07:30' });
  assert.equal(cedo.data, '2026-10-29');
  assert.ok(cedo.hora < '18:00' && cedo.hora >= '15:00', cedo.hora);

  // Sábado: da sexta.
  assert.equal(atividadeRecente('ramon', cidades, { data: '2026-10-31', hora: '11:00' }).data, HOJE);

  // De noite: ainda de hoje, mas antes das 18h.
  const noite = atividadeRecente('ramon', cidades, { data: HOJE, hora: '22:40' });
  assert.equal(noite.data, HOJE);
  assert.ok(noite.hora < '18:00', noite.hora);
});
