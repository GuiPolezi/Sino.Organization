// Casos do que vai escrito no quadro da cena de /desenvolvimento.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { anotacoesDoQuadro } from './anotacoes.js';

const DIAS = [
  { rotulo: 'Qui', valor: 3, hoje: false },
  { rotulo: 'Sex', valor: 5, hoje: false },
  { rotulo: 'Hoje', valor: 4, hoje: true },
];
const textos = (lista) => lista.linhas.map(({ texto }) => texto);

const resumo = (extra = {}) => ({
  totalDesenvolvedores: 10,
  fechadosMes: 37,
  dias: DIAS,
  fila: [
    { status: 'Com o desenvolvedor', total: 41 },
    { status: 'Pendente', total: 1 },
    { status: 'Aguardando Deploy', total: 3 },
  ],
  ficticio: true,
  ...extra,
});

test('com dados, o quadro tem as três anotações e a assinatura do desenvolvimento', () => {
  const anotacoes = anotacoesDoQuadro(resumo());

  assert.equal(anotacoes.assinatura, 'desenvolvimento');
  assert.deepEqual(anotacoes.grafico, { titulo: 'Chamados', subtitulo: 'recebidos nos últimos 3 dias', dias: DIAS });
  assert.equal(anotacoes.lista.titulo, 'Chamados em aberto');
  assert.deepEqual(textos(anotacoes.lista), ['• 41 com os desenvolvedores', '• 1 pendente', '• 3 aguardando deploy']);
  assert.deepEqual(anotacoes.postit, { numero: 37, linhas: ['fechados', 'no mês ★'] });
});

test('cada status tem o seu jeito escrito à mão; o desconhecido vai em minúsculas', () => {
  const fila = [
    { status: 'Em atendimento', total: 2 },
    { status: 'Aguardando Testes', total: 3 },
    { status: 'Aguardando Retorno do Solicitante', total: 4 },
    { status: 'Pendente', total: 5 },
    { status: 'Em Revisão', total: 6 },
  ];
  assert.deepEqual(textos(anotacoesDoQuadro(resumo({ fila })).lista), [
    '• 2 em atendimento',
    '• 3 aguardando testes',
    '• 4 aguardando o solicitante',
    '• 5 pendentes',
    '• 6 em revisão',
  ]);
});

test('a folha tem cinco linhas: com mais status, os últimos se juntam numa só', () => {
  const fila = ['A', 'B', 'C', 'D', 'E', 'F'].map((status, i) => ({ status, total: i + 1 }));
  assert.deepEqual(textos(anotacoesDoQuadro(resumo({ fila })).lista), [
    '• 1 a',
    '• 2 b',
    '• 3 c',
    '• 4 d',
    '• 11 em outros status',
  ]);
});

test('sem chamados, sobra o post-it com o tamanho da equipe; sem equipe, nada', () => {
  const vazio = { fechadosMes: null, dias: [], fila: [] };

  const anotacoes = anotacoesDoQuadro(resumo({ ...vazio, totalDesenvolvedores: 10 }));
  assert.equal(anotacoes.grafico, null);
  assert.equal(anotacoes.lista, null);
  assert.deepEqual(anotacoes.postit, { numero: 10, linhas: ['desenvolvedores', 'na equipe ★'] });

  assert.deepEqual(anotacoesDoQuadro(resumo({ ...vazio, totalDesenvolvedores: 1 })).postit.linhas, [
    'desenvolvedor',
    'na equipe ★',
  ]);
  assert.equal(anotacoesDoQuadro(resumo({ ...vazio, totalDesenvolvedores: 0 })).postit, null);
});

test('zero fechados no mês ainda é um número para o post-it', () => {
  assert.deepEqual(anotacoesDoQuadro(resumo({ fechadosMes: 0 })).postit, { numero: 0, linhas: ['fechados', 'no mês ★'] });
});
