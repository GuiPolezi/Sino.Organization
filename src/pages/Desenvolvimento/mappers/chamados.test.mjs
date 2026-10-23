// Casos do card do desenvolvedor: período, status, categorias e gráfico.
// Uso: npm run test:chamados
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  CATEGORIAS,
  FECHADO,
  LIMITE_ASSUNTOS,
  OUTROS_ASSUNTOS,
  PERIODOS,
  STATUS_DESTAQUE,
  filtrarPorPeriodo,
  resumirChamados,
} from './chamados.js';

const HOJE = '2026-10-16';
const chamado = (data, status, categoria = 'Siscam Web', assunto = 'Bug / Erro') => ({ data, status, categoria, assunto });

const LISTA = [
  chamado('2026-10-16', 'Em atendimento'),
  chamado('2026-10-16', FECHADO, 'Site', 'Dúvida Operacional'),
  chamado('2026-10-10', FECHADO),
  chamado('2026-10-10', 'Com o desenvolvedor', 'Site'),
  chamado('2026-09-17', FECHADO, 'Siscam Web', 'Melhoria / Nova Função'),
  chamado('2026-09-16', FECHADO, 'Cartórios', 'Migração / Dados'),
  chamado('2025-01-02', FECHADO),
  // Futuro: nunca entra em período nenhum além de "Todo o Tempo".
  chamado('2026-10-17', 'Pendente'),
];

test('o menu de período tem as quatro opções, na ordem pedida', () => {
  assert.deepEqual(
    PERIODOS.map(({ rotulo }) => rotulo),
    ['Todo o Tempo', '30 Dias', '7 Dias', 'Hoje'],
  );
});

test('cada período conta de hoje para trás, com hoje incluído', () => {
  const datas = (periodo) => filtrarPorPeriodo(LISTA, periodo, HOJE).map(({ data }) => data);
  assert.equal(datas('tudo').length, LISTA.length);
  assert.deepEqual(datas('hoje'), ['2026-10-16', '2026-10-16']);
  // 7 dias: de 10/10 a 16/10.
  assert.deepEqual(datas('7d'), ['2026-10-16', '2026-10-16', '2026-10-10', '2026-10-10']);
  // 30 dias: de 17/09 a 16/10; 16/09 fica de fora.
  assert.deepEqual(datas('30d'), ['2026-10-16', '2026-10-16', '2026-10-10', '2026-10-10', '2026-09-17']);
  // Período desconhecido vale como "Todo o Tempo".
  assert.equal(datas('ontem').length, LISTA.length);
});

test('o período vira o mês e o ano sem errar a conta', () => {
  const lista = [chamado('2025-12-26', FECHADO), chamado('2025-12-25', FECHADO), chamado('2024-02-29', FECHADO)];
  assert.equal(filtrarPorPeriodo(lista, '7d', '2026-01-01').length, 1);
  assert.equal(filtrarPorPeriodo([chamado('2024-02-02', FECHADO)], '30d', '2024-03-02').length, 1);
  assert.equal(filtrarPorPeriodo([chamado('2024-02-01', FECHADO)], '30d', '2024-03-02').length, 0);
});

test('o destaque é o "Fechado" e a grade traz os outros status fixos, mesmo zerados', () => {
  assert.equal(STATUS_DESTAQUE, FECHADO);
  const resumo = resumirChamados(LISTA, 'hoje', HOJE);
  assert.deepEqual(resumo.destaque, { status: FECHADO, total: 1 });
  assert.deepEqual(resumo.status.slice(0, 4), [
    { status: 'Com o desenvolvedor', total: 0 },
    { status: 'Em atendimento', total: 1 },
    { status: 'Aguardando Testes', total: 0 },
    { status: 'Aguardando Retorno do Solicitante', total: 0 },
  ]);
  assert.ok(!resumo.status.some(({ status }) => status === FECHADO));
});

test('Pendente e Aguardando Deploy só aparecem para quem tem esses chamados, em qualquer período', () => {
  const statusDe = (lista, periodo) => resumirChamados(lista, periodo, HOJE).status.map(({ status }) => status);
  const semEventuais = LISTA.filter(({ status }) => status !== 'Pendente');
  assert.ok(!statusDe(semEventuais, 'tudo').includes('Pendente'));
  assert.ok(!statusDe(semEventuais, 'tudo').includes('Aguardando Deploy'));

  // O "Pendente" da lista é de amanhã: fora do período, o card dele fica, zerado.
  const hoje = resumirChamados(LISTA, 'hoje', HOJE).status;
  assert.deepEqual(hoje.at(-1), { status: 'Pendente', total: 0 });

  const comDeploy = [...LISTA, chamado('2026-10-16', 'Aguardando Deploy')];
  assert.deepEqual(statusDe(comDeploy, '7d').slice(4), ['Pendente', 'Aguardando Deploy']);

  // Um status novo do Milldesk entra no fim, sem quebrar o card.
  const comNovo = [...LISTA, chamado('2026-10-16', 'Em Homologação')];
  assert.equal(statusDe(comNovo, 'tudo').at(-1), 'Em Homologação');
});

test('total do período e parte feita, sem arredondar para 0% ou 100% enganosos', () => {
  const tudo = resumirChamados(LISTA, 'tudo', HOJE);
  assert.equal(tudo.total, 8);
  // 5 fechados de 8.
  assert.equal(tudo.percentualFeito, 63);

  const quase = [...Array.from({ length: 199 }, () => chamado(HOJE, FECHADO)), chamado(HOJE, 'Em atendimento')];
  assert.equal(resumirChamados(quase, 'hoje', HOJE).percentualFeito, 99);
  const pouco = [chamado(HOJE, FECHADO), ...Array.from({ length: 199 }, () => chamado(HOJE, 'Em atendimento'))];
  assert.equal(resumirChamados(pouco, 'hoje', HOJE).percentualFeito, 1);
  assert.equal(resumirChamados([chamado(HOJE, 'Pendente')], 'hoje', HOJE).percentualFeito, 0);
  assert.equal(resumirChamados([chamado(HOJE, FECHADO)], 'hoje', HOJE).percentualFeito, 100);

  // Sem chamados no período, não há parte feita a mostrar.
  const vazio = resumirChamados([chamado('2025-01-02', FECHADO)], 'hoje', HOJE);
  assert.equal(vazio.total, 0);
  assert.equal(vazio.percentualFeito, null);
  assert.deepEqual(vazio.categorias, []);
});

test('as categorias seguem o período, na ordem do total de todos os chamados', () => {
  const nomes = (periodo) => resumirChamados(LISTA, periodo, HOJE).categorias.map(({ nome }) => nome);
  // Em todo o tempo: Siscam Web (5), Site (2), Cartórios (1).
  assert.deepEqual(nomes('tudo'), ['Siscam Web', 'Site', 'Cartórios']);
  assert.deepEqual(nomes('30d'), ['Siscam Web', 'Site']);
  // Hoje o Site também tem um chamado, mas a ordem continua a de todo o tempo.
  assert.deepEqual(nomes('hoje'), ['Siscam Web', 'Site']);
});

test('o gráfico da categoria traz os assuntos dela, do mais comum ao menos, contando só o período', () => {
  const siscam = resumirChamados(LISTA, '30d', HOJE).categorias[0];
  assert.equal(siscam.nome, 'Siscam Web');
  assert.equal(siscam.total, 3);
  // Em todo o tempo, Bug / Erro (4) vem antes de Melhoria (1); no período, 2 e 1.
  assert.deepEqual(siscam.assuntos, [
    { assunto: 'Bug / Erro', total: 2 },
    { assunto: 'Melhoria / Nova Função', total: 1 },
  ]);

  // Um assunto de fora do período continua como coluna, zerado.
  const site = resumirChamados(LISTA, 'hoje', HOJE).categorias.find(({ nome }) => nome === 'Site');
  assert.deepEqual(site.assuntos, [{ assunto: 'Bug / Erro', total: 0 }, { assunto: 'Dúvida Operacional', total: 1 }]);
  assert.equal(site.assuntos.reduce((soma, { total }) => soma + total, 0), site.total);
});

test('passando do limite de colunas, os assuntos menos comuns somam em "Outros"', () => {
  const nomes = Array.from({ length: LIMITE_ASSUNTOS + 2 }, (_, i) => `Assunto ${i + 1}`);
  // O primeiro assunto tem mais chamados, o último, menos.
  const lista = nomes.flatMap((nome, i) =>
    Array.from({ length: nomes.length - i }, () => chamado(HOJE, FECHADO, 'Site', nome)),
  );
  const [site] = resumirChamados(lista, 'tudo', HOJE).categorias;
  assert.equal(site.assuntos.length, LIMITE_ASSUNTOS + 1);
  assert.deepEqual(site.assuntos.slice(0, 2), [
    { assunto: 'Assunto 1', total: 7 },
    { assunto: 'Assunto 2', total: 6 },
  ]);
  assert.deepEqual(site.assuntos.at(-1), { assunto: OUTROS_ASSUNTOS, total: 2 + 1 });
  assert.equal(site.assuntos.reduce((soma, { total }) => soma + total, 0), site.total);

  // Um assunto a mais que o limite ganha a coluna dele, em vez de um "Outros" de um só.
  const umAMais = lista.filter(({ assunto }) => assunto !== nomes.at(-1));
  assert.ok(!resumirChamados(umAMais, 'tudo', HOJE).categorias[0].assuntos.some(({ assunto }) => assunto === OUTROS_ASSUNTOS));
});

test('os chamados do Milldesk (src/data/chamados.json) são coerentes para toda a equipe', () => {
  const { desenvolvedores } = JSON.parse(readFileSync(new URL('../../../data/chamados.json', import.meta.url), 'utf8'));
  const equipe = JSON.parse(readFileSync(new URL('../../../data/dev-team.json', import.meta.url), 'utf8')).team;
  assert.deepEqual(Object.keys(desenvolvedores).sort(), equipe.map(({ id }) => id).sort());

  for (const [id, lista] of Object.entries(desenvolvedores)) {
    assert.ok(lista.every(({ data }) => /^\d{4}-\d{2}-\d{2}$/.test(data)), `datas de ${id}`);
    assert.ok(lista.every(({ categoria }) => CATEGORIAS.includes(categoria)), `categorias de ${id}`);
    assert.ok(lista.every(({ assunto, status }) => assunto && status), `assunto e status de ${id}`);
    assert.ok(!lista.some(({ status }) => /desenvolvimento/i.test(status)), `"Com o Desenvolvimento" junto de ${id}`);
    assert.deepEqual(lista.map(({ data }) => data), lista.map(({ data }) => data).toSorted().reverse(), `ordem de ${id}`);

    const resumo = resumirChamados(lista, 'tudo', HOJE);
    const somaStatus = resumo.destaque.total + resumo.status.reduce((soma, { total }) => soma + total, 0);
    assert.equal(somaStatus, resumo.total, `status de ${id}`);
    const somaCategorias = resumo.categorias.reduce((soma, { total }) => soma + total, 0);
    assert.equal(somaCategorias, resumo.total, `categorias de ${id}`);
  }
});
