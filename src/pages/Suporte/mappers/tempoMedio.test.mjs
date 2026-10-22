// Casos do tempo médio diário de atendimento (calculo-tempo-medio-atendimento.md, seção 7).
// Uso: npm run test:card
import assert from 'node:assert/strict';
import test from 'node:test';
import { minutosTrabalhados, paraMinutos, partesDaDuracao, tempoMedioDiario } from './tempoMedio.js';

const TECNICO_1 = { inicio: '08:00', fim: '17:00', almocoInicio: '12:00', almocoMin: 60 };
const TECNICO_2 = { inicio: '09:00', fim: '18:00', almocoInicio: '12:00', almocoMin: 60 };

// 08/10/2026 é uma quinta-feira. Brasília está em UTC-3: 10:12 em Brasília = 13:12Z.
const HOJE = '2026-10-08';
const emBrasilia = (hora, data = HOJE) => new Date(`${data}T${hora}:00-03:00`).toISOString();

test('paraMinutos converte "HH:MM" em minutos desde a meia-noite', () => {
  assert.equal(paraMinutos('08:00'), 480);
  assert.equal(paraMinutos('12:00'), 720);
  assert.equal(paraMinutos('17:00'), 1020);
});

test('minutos trabalhados do técnico 1 (08:00–17:00, almoço 12:00)', () => {
  assert.equal(minutosTrabalhados(TECNICO_1, paraMinutos('07:30')), 0);
  assert.equal(minutosTrabalhados(TECNICO_1, paraMinutos('10:12')), 132);
  assert.equal(minutosTrabalhados(TECNICO_1, paraMinutos('12:30')), 240);
  assert.equal(minutosTrabalhados(TECNICO_1, paraMinutos('15:00')), 360);
  assert.equal(minutosTrabalhados(TECNICO_1, paraMinutos('18:00')), 480);
});

test('minutos trabalhados do técnico 2 (09:00–18:00, almoço 12:00)', () => {
  assert.equal(minutosTrabalhados(TECNICO_2, paraMinutos('08:45')), 0);
  assert.equal(minutosTrabalhados(TECNICO_2, paraMinutos('10:12')), 72);
  assert.equal(minutosTrabalhados(TECNICO_2, paraMinutos('14:00')), 240);
});

test('tempo médio da seção 7, medido no horário do último sync', () => {
  const casos = [
    [TECNICO_1, '10:12', 4, 33],
    [TECNICO_1, '12:30', 10, 24],
    [TECNICO_1, '15:00', 12, 30],
    [TECNICO_1, '18:00', 16, 30],
    [TECNICO_2, '10:12', 3, 24],
    [TECNICO_2, '14:00', 8, 30],
  ];
  for (const [expediente, hora, atendimentos, esperado] of casos) {
    const media = tempoMedioDiario({
      expediente,
      porDia: { [HOJE]: atendimentos },
      atualizadoEm: emBrasilia(hora),
      hoje: HOJE,
    });
    assert.equal(media, esperado, `${hora} com ${atendimentos} atendimentos`);
  }
});

test('sem atendimento hoje, não há média', () => {
  const base = { expediente: TECNICO_1, atualizadoEm: emBrasilia('10:12'), hoje: HOJE };
  assert.equal(tempoMedioDiario({ ...base, porDia: {} }), null);
  assert.equal(tempoMedioDiario({ ...base, porDia: { [HOJE]: 0 } }), null);
});

test('antes do expediente, mesmo com atendimento, não há média', () => {
  const media = tempoMedioDiario({
    expediente: TECNICO_1,
    porDia: { [HOJE]: 1 },
    atualizadoEm: emBrasilia('07:30'),
    hoje: HOJE,
  });
  assert.equal(media, null);
});

test('sync de outro dia não vale para hoje', () => {
  const media = tempoMedioDiario({
    expediente: TECNICO_1,
    porDia: { [HOJE]: 4, '2026-10-07': 12 },
    atualizadoEm: emBrasilia('15:00', '2026-10-07'),
    hoje: HOJE,
  });
  assert.equal(media, null);
});

test('o dia vem de Brasília: 22:00 de Brasília já é o dia seguinte em UTC', () => {
  const media = tempoMedioDiario({
    expediente: TECNICO_1,
    porDia: { [HOJE]: 16 },
    atualizadoEm: emBrasilia('22:00'),
    hoje: HOJE,
  });
  assert.equal(media, 30);
});

test('sábado e domingo não têm média', () => {
  for (const dia of ['2026-10-10', '2026-10-11']) {
    const media = tempoMedioDiario({
      expediente: TECNICO_1,
      porDia: { [dia]: 5 },
      atualizadoEm: emBrasilia('15:00', dia),
      hoje: dia,
    });
    assert.equal(media, null, dia);
  }
});

test('sem expediente ou sem horário do sync, não há média', () => {
  const porDia = { [HOJE]: 4 };
  assert.equal(tempoMedioDiario({ porDia, atualizadoEm: emBrasilia('10:12'), hoje: HOJE }), null);
  assert.equal(tempoMedioDiario({ expediente: TECNICO_1, porDia, hoje: HOJE }), null);
  assert.equal(tempoMedioDiario({ expediente: TECNICO_1, porDia, atualizadoEm: 'x', hoje: HOJE }), null);
});

test('partesDaDuracao: minutos abaixo de 1 hora, horas e minutos a partir dela', () => {
  assert.deepEqual(partesDaDuracao(33), { horas: 0, minutos: 33 });
  assert.deepEqual(partesDaDuracao(60), { horas: 1, minutos: 0 });
  assert.deepEqual(partesDaDuracao(65), { horas: 1, minutos: 5 });
});
