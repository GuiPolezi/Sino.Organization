// Casos do que vai escrito no quadro da cena de /desenvolvimento: o resumo do painel.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { COR_OUTROS, coresDosTipos } from '../card/cores.js';
import { LETRAS_DO_LOCAL, anotacoesDoQuadro } from './anotacoes.js';

const TIPOS = ['Bug / Erro', 'Melhoria / Nova Função', 'Implantação'];
const corDe = coresDosTipos(TIPOS);

const dev = (id, total) => ({ id, nome: `${id[0].toUpperCase()}${id.slice(1)} Silva`, total });
const local = (nome, bug, melhoria) => ({
  local: nome,
  total: bug + melhoria,
  tipos: [
    { tipo: 'Bug / Erro', total: bug },
    { tipo: 'Melhoria / Nova Função', total: melhoria },
    { tipo: 'Implantação', total: 0 },
  ],
});

const resumo = (visao = {}, totalDesenvolvedores = 3) => ({
  totalDesenvolvedores,
  visao: { total: 3715, porDesenvolvedor: [dev('ana', 10), dev('beto', 30)], porCategoria: [], porLocal: [local('Araras', 4, 2)], tiposDosLocais: TIPOS, ficticio: true, ...visao },
});

test('com chamados, o quadro resume o painel: total no post-it, barras por dev e barras por local', () => {
  const anotacoes = anotacoesDoQuadro(resumo());

  assert.equal(anotacoes.assinatura, 'desenvolvimento');
  assert.deepEqual(anotacoes.postit, { numero: '+3.715', linhas: ['total de', 'tickets ★'] });

  assert.equal(anotacoes.grafico.titulo, 'Carga por Dev');
  assert.equal(anotacoes.grafico.subtitulo, 'todo o tempo');
  // Da maior para a menor, com o primeiro nome, a parte do total (como no painel) e a cor fixa de cada pessoa.
  assert.deepEqual(
    anotacoes.grafico.barras.map(({ rotulo, valor, percentual }) => [rotulo, valor, percentual]),
    [['Beto', 30, '75%'], ['Ana', 10, '25%']],
  );
  assert.notEqual(anotacoes.grafico.barras[0].cor, anotacoes.grafico.barras[1].cor);
  assert.equal(anotacoes.grafico.fatias, undefined);

  assert.equal(anotacoes.lista.titulo, 'Carga por Local');
  assert.deepEqual(anotacoes.lista.barras, [
    {
      rotulo: 'Araras',
      valor: 6,
      partes: [
        { cor: corDe('Bug / Erro'), valor: 4 },
        { cor: corDe('Melhoria / Nova Função'), valor: 2 },
      ],
    },
  ]);
});

test('no papel cabem seis barras: da sétima em diante, viram "outros"; quem não tem ticket não entra', () => {
  const porDesenvolvedor = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => dev(id, 8 - i));
  const { barras } = anotacoesDoQuadro(resumo({ porDesenvolvedor: [...porDesenvolvedor, dev('z', 0)] })).grafico;

  assert.equal(barras.length, 6);
  assert.deepEqual(barras.at(-1), { chave: 'Outros', rotulo: 'outros', valor: 3 + 2 + 1, cor: COR_OUTROS, percentual: '17%' });
  assert.ok(!barras.some(({ rotulo }) => rotulo === 'Z'));
  // As partes somam 100%, como no painel (aqui nenhuma fica abaixo de 1%).
  barras.forEach(({ percentual }) => assert.match(percentual, /^\d+%$/));
  assert.equal(barras.reduce((soma, { percentual }) => soma + Number.parseInt(percentual, 10), 0), 100);
});

test('na folha cabem cinco barras, na ordem do painel', () => {
  const porLocal = ['A', 'B', 'C', 'D', 'E', 'F'].map((nome, i) => local(nome, 10 - i, 0));
  const { barras } = anotacoesDoQuadro(resumo({ porLocal })).lista;
  assert.deepEqual(
    barras.map(({ rotulo }) => rotulo),
    ['A', 'B', 'C', 'D', 'E'],
  );
});

test('na folha, o nome comprido de um local termina em reticências; as cores seguem a legenda', () => {
  const nome = '2º Tabelião de Notas de Piracicaba Bortoletto';
  const [barra] = anotacoesDoQuadro(resumo({ porLocal: [local(nome, 1, 1)] })).lista.barras;
  assert.equal(barra.rotulo.length, LETRAS_DO_LOCAL);
  assert.ok(barra.rotulo.endsWith('…'));
  assert.ok(nome.startsWith(barra.rotulo.slice(0, -1)));
  assert.equal(anotacoesDoQuadro(resumo({ porLocal: [local('Itapevi CM', 1, 0)] })).lista.barras[0].rotulo, 'Itapevi CM');
  // Cores distintas para tipos distintos, e "Outros" (ou um tipo fora da legenda) no cinza.
  assert.notEqual(corDe('Bug / Erro'), corDe('Melhoria / Nova Função'));
  assert.equal(corDe('Treinamento'), COR_OUTROS);
});

test('sem chamados, sobra o post-it com o tamanho da equipe; sem equipe, nada', () => {
  const vazio = { total: null, porDesenvolvedor: [], porLocal: [] };

  const anotacoes = anotacoesDoQuadro(resumo(vazio, 10));
  assert.equal(anotacoes.grafico, null);
  assert.equal(anotacoes.lista, null);
  assert.deepEqual(anotacoes.postit, { numero: 10, linhas: ['desenvolvedores', 'na equipe ★'] });

  assert.deepEqual(anotacoesDoQuadro(resumo(vazio, 1)).postit.linhas, ['desenvolvedor', 'na equipe ★']);
  assert.equal(anotacoesDoQuadro(resumo(vazio, 0)).postit, null);
});

test('zero tickets ainda é um número para o post-it', () => {
  assert.deepEqual(anotacoesDoQuadro(resumo({ total: 0, porDesenvolvedor: [], porLocal: [] })).postit, {
    numero: '0',
    linhas: ['total de', 'tickets ★'],
  });
});
