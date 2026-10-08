// Casos das contas do card do técnico (totais, semana do gráfico e eixo Y).
// Uso: npm run test:card
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  diasRecentes,
  escalaY,
  hojeEmBrasilia,
  semanaDoGrafico,
  semanasAnteriores,
  totaisDeAtendimentos,
} from './atendimentos.js';

// 08/10/2026 é uma quinta-feira; a semana dela vai de domingo 04/10 a sábado 10/10.
const HOJE = '2026-10-08';
const POR_DIA = {
  '2026-09-28': 7, // semana anterior, outro mês
  '2026-10-01': 20, // semana anterior, mesmo mês
  '2026-10-05': 31,
  '2026-10-06': 36,
  '2026-10-07': 9,
  '2026-10-08': 15,
};

test('hoje em Brasília não vira o dia antes da meia-noite de lá', () => {
  // 02:30 UTC do dia 9 ainda são 23:30 do dia 8 em Brasília.
  assert.equal(hojeEmBrasilia(Date.parse('2026-10-09T02:30:00Z')), '2026-10-08');
  assert.equal(hojeEmBrasilia(Date.parse('2026-10-09T03:00:00Z')), '2026-10-09');
});

test('totais de hoje, da semana e do mês', () => {
  assert.deepEqual(totaisDeAtendimentos(POR_DIA, HOJE), { hoje: 15, semana: 91, mes: 111 });
  assert.deepEqual(totaisDeAtendimentos({}, HOJE), { hoje: 0, semana: 0, mes: 0 });
});

test('a semana atual do gráfico vai de domingo a sábado', () => {
  const semana = semanaDoGrafico(POR_DIA, HOJE);

  assert.equal(semana.numero, 2);
  assert.equal(semana.periodo, '05/10 - 09/10');
  assert.deepEqual(semana.dias.map((dia) => dia.rotulo), ['04/10', '05/10', '06/10', '07/10', '08/10', '09/10', '10/10']);
  assert.deepEqual(semana.dias.map((dia) => dia.total), [0, 31, 36, 9, 15, 0, 0]);
  assert.deepEqual(semana.dias.map((dia) => dia.hoje), [false, false, false, false, true, false, false]);
});

test('voltando uma semana, o número é o da semana no mês da segunda-feira', () => {
  const semana = semanaDoGrafico(POR_DIA, HOJE, 1);

  // Segunda 28/09: setembro de 2026 começa numa terça, então é a 5ª semana dele.
  assert.equal(semana.numero, 5);
  assert.equal(semana.periodo, '28/09 - 02/10');
  assert.deepEqual(semana.dias.map((dia) => dia.total), [0, 7, 0, 0, 20, 0, 0]);
});

test('dá para voltar até a semana do registro mais antigo', () => {
  assert.equal(semanasAnteriores(POR_DIA, HOJE), 1);
  assert.equal(semanasAnteriores({ '2026-09-06': 3, '2026-10-08': 1 }, HOJE), 4);
  assert.equal(semanasAnteriores({}, HOJE), 0);
  // Registro futuro não conta.
  assert.equal(semanasAnteriores({ '2026-10-20': 3 }, HOJE), 0);
});

test('o eixo Y cresce com os atendimentos', () => {
  assert.deepEqual(escalaY(0), { topo: 10, marcas: [0, 2, 4, 6, 8, 10] });
  assert.deepEqual(escalaY(9), { topo: 10, marcas: [0, 2, 4, 6, 8, 10] });
  assert.deepEqual(escalaY(15), { topo: 20, marcas: [0, 5, 10, 15, 20] });
  assert.deepEqual(escalaY(31), { topo: 40, marcas: [0, 10, 20, 30, 40] });
  assert.deepEqual(escalaY(40), { topo: 50, marcas: [0, 10, 20, 30, 40, 50] });
  assert.deepEqual(escalaY(110), { topo: 150, marcas: [0, 50, 100, 150] });
});

test('o topo do eixo fica sempre acima do maior valor, com poucas marcas', () => {
  for (let maximo = 0; maximo <= 400; maximo++) {
    const { topo, marcas } = escalaY(maximo);
    assert.ok(topo > maximo, `topo ${topo} para ${maximo}`);
    assert.ok(marcas.length <= 7, `${marcas.length} marcas para ${maximo}`);
    assert.equal(marcas.at(-1), topo);
  }
});

test('os dias recentes pulam fim de semana vazio e terminam em hoje', () => {
  // Hoje é quinta 08/10; sábado 03 e domingo 04 não têm registro e saem.
  // Sexta 02 também não tem, mas é dia útil: fica, com zero.
  assert.deepEqual(
    diasRecentes(POR_DIA, HOJE).map((dia) => `${dia.rotulo}:${dia.valor}`),
    ['Sex:0', 'Seg:31', 'Ter:36', 'Qua:9', 'Hoje:15'],
  );
  // Fim de semana com atendimento entra.
  assert.deepEqual(
    diasRecentes({ ...POR_DIA, '2026-10-04': 3 }, HOJE, 4).map((dia) => `${dia.rotulo}:${dia.valor}`),
    ['Seg:31', 'Ter:36', 'Qua:9', 'Hoje:15'],
  );
  assert.deepEqual(
    diasRecentes({ ...POR_DIA, '2026-10-04': 3 }, HOJE).map((dia) => dia.rotulo),
    ['Dom', 'Seg', 'Ter', 'Qua', 'Hoje'],
  );
  // Hoje entra mesmo num domingo sem atendimento, e só o último dia é "hoje".
  const noDomingo = diasRecentes({}, '2026-10-04', 3);
  assert.deepEqual(noDomingo.map((dia) => dia.rotulo), ['Qui', 'Sex', 'Hoje']);
  assert.deepEqual(noDomingo.map((dia) => dia.hoje), [false, false, true]);
});
