// Casos do card de cada pessoa em /compilacao (atuacao.js), sobre respostas inventadas do servidor.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERIODOS,
  PERIODO_INICIAL,
  agoraEmBrasilia,
  aguardandoDe,
  atividadeDe,
  atuacaoDe,
  barraDoProjeto,
  comMais,
  diaEMes,
  mesCurto,
  nomeDaCidade,
  nomeDoMes,
  normasDoPeriodo,
  numeroOuTraco,
  rotuloDataHora,
  trabalhandoEm,
} from './atuacao.js';
import { APARENCIAS_COMPILACAO, EQUIPE_COMPILACAO } from './equipe.js';
import { REFERENCIA, pessoaDeAtualizacoes, pessoaDeProjetos } from './respostas-teste.mjs';

const doDia = { referencia: REFERENCIA, hoje: REFERENCIA };

test('a equipe: os sete nomes, as iniciais do avatar e todos com aparência', () => {
  assert.deepEqual(
    EQUIPE_COMPILACAO.map(({ nome }) => nome),
    ['Leonardo', 'Ramon', 'G.Dressano', 'G.Lopes', 'Nathalia', 'Laura', 'Damaris'],
  );
  const iniciais = Object.fromEntries(EQUIPE_COMPILACAO.map(({ nome, avatarIniciais }) => [nome, avatarIniciais]));
  assert.equal(iniciais['G.Dressano'], 'GD');
  assert.equal(iniciais['G.Lopes'], 'GL');
  for (const { id } of EQUIPE_COMPILACAO) assert.ok(APARENCIAS_COMPILACAO[id], `aparência de ${id}`);
});

test('os períodos são Todo o Tempo, Mês, Semana e Hoje, e o card abre no Mês', () => {
  assert.deepEqual(PERIODOS.map(({ rotulo }) => rotulo), ['Todo o Tempo', 'Mês', 'Semana', 'Hoje']);
  assert.equal(PERIODO_INICIAL, 'mes');
});

test('Projetos: "Desde" do projeto e "Trabalhando em" com cidade e tipo', () => {
  const pessoa = pessoaDeProjetos({ projeto: { ...pessoaDeProjetos().projeto, tipos: ['Leis Ordinárias', 'Leis Complementares'] } });
  assert.deepEqual(atuacaoDe(pessoa), { responsabilidade: 'projetos', rotulo: 'Projetos Novos', linha: 'Desde: 20/10 - 08:15' });
  assert.deepEqual(trabalhandoEm(pessoa), { atual: 'Cidade A - XX · Leis Ordinárias + Leis Complementares', outras: [] });
  assert.equal(atuacaoDe(pessoaDeProjetos({ desde: null })).linha, 'Desde: —');
  assert.deepEqual(trabalhandoEm(pessoaDeProjetos({ projeto: null })), { atual: '—', outras: [] });
});

test('Atualizações: a planilha do mês e a carteira na ordem do servidor', () => {
  const pessoa = pessoaDeAtualizacoes();
  assert.equal(atuacaoDe(pessoa).linha, 'Planilha de outubro · importada em 01/11');
  assert.deepEqual(trabalhandoEm(pessoa), { atual: 'Cidade D - XX', outras: ['Cidade E - XX', 'Cidade F - XX'] });
  assert.equal(atuacaoDe(pessoaDeAtualizacoes({ planilha: null })).linha, 'Planilha: —');
  assert.deepEqual(trabalhandoEm(pessoaDeAtualizacoes({ cidades: [] })), { atual: '—', outras: [] });
});

test('sem a pessoa na resposta (ou com função desconhecida), não há atuação', () => {
  assert.equal(atuacaoDe(null), null);
  assert.equal(atuacaoDe({ funcao: 'outra' }), null);
});

test('normas do período: total, fonte e os 7 tipos que fecham o total', () => {
  const r = normasDoPeriodo(pessoaDeProjetos(), 'mes', doDia);
  assert.equal(r.total, 40);
  assert.equal(r.legenda, 'pelo sistema');
  assert.deepEqual(r.porTipo.map(({ chave }) => chave), ['leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros']);
  assert.equal(r.porTipo.reduce((soma, { valor }) => soma + valor, 0), r.total);
  assert.equal(r.porTipo.find(({ chave }) => chave === 'emendas').rotulo, 'Emendas');
  assert.equal(normasDoPeriodo(pessoaDeAtualizacoes(), 'tudo', doDia).legenda, 'pela planilha');
});

test('"—" não é 0: sem número, total e tipos ficam null com o motivo', () => {
  const tudo = normasDoPeriodo(pessoaDeProjetos(), 'tudo', doDia);
  assert.equal(tudo.total, null);
  assert.equal(tudo.legenda, 'ainda sem histórico');
  assert.ok(tudo.porTipo.every(({ valor }) => valor === null));
  assert.equal(normasDoPeriodo(pessoaDeAtualizacoes(), 'mes', doDia).legenda, 'planilha do mês ainda não importada');
  // F6: com o histórico carregado, o Todo o Tempo de Projetos tem número e fonte.
  const comHistorico = pessoaDeProjetos({
    producao: { hoje: 3, semana: 12, mes: 40, tudo: 900 },
    fontes: { hoje: 'sistema', semana: 'sistema', mes: 'sistema', tudo: 'sistema' },
    porTipo: { ...pessoaDeProjetos().porTipo, tudo: { leis: 0, decretos: 0, resolucoes: 880, portarias: 0, complementares: 0, emendas: 0, outros: 20 } },
  });
  const tudoComHistorico = normasDoPeriodo(comHistorico, 'tudo', doDia);
  assert.equal(tudoComHistorico.total, 900);
  assert.equal(tudoComHistorico.legenda, 'pelo sistema');
  assert.equal(tudoComHistorico.porTipo.reduce((soma, { valor }) => soma + valor, 0), 900);
  const zero = normasDoPeriodo(pessoaDeProjetos({ producao: { hoje: 0, semana: 0, mes: 0, tudo: null } }), 'hoje', doDia);
  assert.equal(zero.total, 0);
});

test('Hoje só vale se os dados são de hoje (I9)', () => {
  const ontem = normasDoPeriodo(pessoaDeProjetos(), 'hoje', { referencia: '2026-11-03', hoje: REFERENCIA });
  assert.equal(ontem.total, null);
  assert.equal(ontem.legenda, 'aguardando os números de hoje');
  // A Semana continua valendo.
  assert.equal(normasDoPeriodo(pessoaDeProjetos(), 'semana', { referencia: '2026-11-03', hoje: REFERENCIA }).total, 12);
});

test('aguardando: no projeto (com a fila dividida) ou o déficit da planilha', () => {
  const dividido = pessoaDeProjetos({ projeto: { ...pessoaDeProjetos().projeto, compartilhadaCom: ['ramon'] } });
  assert.deepEqual(aguardandoDe(dividido), { valor: 42, legenda: 'no projeto', divididaCom: ['ramon'] });
  assert.deepEqual(aguardandoDe(pessoaDeAtualizacoes()), { valor: 112, legenda: 'déficit · planilha de outubro', divididaCom: [] });
  assert.equal(aguardandoDe(pessoaDeAtualizacoes({ aguardando: { valor: null, fonte: null } })).valor, null);
});

test('barra do projeto: "362 de 404" só em Projetos e com o estoque fechando', () => {
  assert.deepEqual(barraDoProjeto(pessoaDeProjetos()), { compiladas: 362, total: 404, parte: 89.6 });
  assert.equal(barraDoProjeto(pessoaDeAtualizacoes()), null);
  assert.equal(barraDoProjeto(pessoaDeProjetos({ projeto: { ...pessoaDeProjetos().projeto, total: null } })), null);
  assert.equal(barraDoProjeto(pessoaDeProjetos({ projeto: { ...pessoaDeProjetos().projeto, total: 0, compiladas: 0 } })), null);
});

test('atividade recente: campos prontos para a tela, ou null', () => {
  assert.deepEqual(atividadeDe(pessoaDeProjetos()), {
    acao: 'Inclusão',
    cidade: 'Cidade A-XX',
    modulo: 'Versões',
    data: '2026-11-04',
    hora: '09:30',
    descricao: 'Resolução nº 1/2026',
  });
  assert.equal(atividadeDe(pessoaDeAtualizacoes()), null);
});

test('rótulos: cidade, data e hora, mês, números com "—"', () => {
  assert.equal(nomeDaCidade({ nome: 'Cidade A', uf: 'XX' }), 'Cidade A - XX');
  assert.equal(nomeDaCidade({ nome: 'Cidade A', uf: '' }), 'Cidade A');
  assert.equal(rotuloDataHora({ data: '2026-10-30', hora: '10:50' }), '30/10 - 10:50');
  assert.equal(diaEMes('2026-10-05'), '05/10');
  assert.equal(nomeDoMes('2026-10'), 'outubro');
  assert.equal(nomeDoMes('x'), '—');
  assert.equal(mesCurto('2026-10'), 'out.');
  assert.equal(mesCurto('2026-05'), 'maio');
  assert.equal(numeroOuTraco(1234), '1.234');
  assert.equal(numeroOuTraco(null), '—');
  assert.equal(comMais(0), '+0');
  assert.equal(comMais(null), '—');
  assert.deepEqual(agoraEmBrasilia(Date.parse('2026-11-04T02:30:00Z')), { data: '2026-11-03', hora: '23:30' });
});
