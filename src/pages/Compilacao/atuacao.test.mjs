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
  chaveEfetiva,
  comMais,
  diaEMes,
  ehResponsabilidade,
  lerResponsabilidades,
  mensagemDeFalha,
  mesCurto,
  naResponsabilidade,
  nomeDaCidade,
  nomeDoMes,
  normasDoPeriodo,
  numeroOuTraco,
  OPCOES_DE_RESPONSABILIDADE,
  rotuloDataHora,
  tempoDaFalha,
  trabalhandoEm,
  vinculadasDe,
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
  assert.deepEqual(atuacaoDe(pessoa), {
    responsabilidade: 'projetos',
    rotulo: 'Projetos Novos',
    situacao: null,
    normas: 'normal',
    linha: 'Desde: 20/10 - 08:15',
  });
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
  // O Mês de Atualizações vem do sistema: "—" só quando ele não respondeu.
  assert.equal(normasDoPeriodo(pessoaDeAtualizacoes(), 'mes', doDia).legenda, 'sem dado');
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

// 13:50Z = 10:50 em Brasília.
const ALTERADA_EM = '2026-10-30T13:50:00.000Z';

test('as quatro opções do "Alterar", na ordem e com as chaves do servidor', () => {
  assert.deepEqual(
    OPCOES_DE_RESPONSABILIDADE.map(({ chave, rotulo }) => [chave, rotulo]),
    [
      ['atualizacoes', 'Atualizações'],
      ['projetos', 'Projetos Novos'],
      ['projetos_finalizando', 'Projetos Novos - Finalizando'],
      ['projetos_sem_normas', 'Projetos Novos - Sem normas'],
    ],
  );
});

test('responsabilidade que vale: a salva; sem ela (ou inválida), a configurada', () => {
  assert.equal(chaveEfetiva(pessoaDeProjetos(), null), 'projetos');
  assert.equal(chaveEfetiva(pessoaDeProjetos(), { chave: 'projetos_finalizando' }), 'projetos_finalizando');
  assert.equal(chaveEfetiva(pessoaDeAtualizacoes(), { chave: 'outra' }), 'atualizacoes');
  assert.equal(chaveEfetiva({ funcao: 'outra' }, null), null);
  assert.equal(chaveEfetiva(null, null), null);
});

test('salva: "Última Alteração" em Brasília, a situação e a seção de normas', () => {
  const finalizando = atuacaoDe(pessoaDeProjetos(), { chave: 'projetos_finalizando', alteradaEm: ALTERADA_EM });
  assert.deepEqual(finalizando, {
    responsabilidade: 'projetos_finalizando',
    rotulo: 'Projetos Novos',
    situacao: { texto: 'Finalizando', tom: 'finalizando' },
    normas: 'vinculadas',
    linha: 'Última Alteração: 30/10 - 10:50',
  });
  const semNormas = atuacaoDe(pessoaDeProjetos(), { chave: 'projetos_sem_normas', alteradaEm: ALTERADA_EM });
  assert.deepEqual(semNormas.situacao, { texto: 'Sem normas', tom: 'semNormas' });
  assert.equal(semNormas.normas, 'desativada');
  assert.equal(atuacaoDe(pessoaDeAtualizacoes(), { chave: 'atualizacoes', alteradaEm: ALTERADA_EM }).linha, 'Última Alteração: 30/10 - 10:50');
  // Data que não é data: a linha de sempre.
  assert.equal(atuacaoDe(pessoaDeProjetos(), { chave: 'projetos_finalizando', alteradaEm: 'x' }).linha, 'Desde: 20/10 - 08:15');
});

test('trocar de grupo não quebra: o card mostra "—" no que é do outro grupo', () => {
  const paraProjetos = naResponsabilidade(pessoaDeAtualizacoes(), { chave: 'projetos_finalizando' });
  assert.equal(paraProjetos.funcao, 'projetos');
  assert.equal(paraProjetos.responsabilidade, 'projetos_finalizando');
  assert.deepEqual(trabalhandoEm(paraProjetos), { atual: '—', outras: [] });
  assert.equal(aguardandoDe(paraProjetos).valor, null);
  assert.equal(barraDoProjeto(paraProjetos), null);
  assert.equal(vinculadasDe(paraProjetos).valor, null);
  assert.equal(atuacaoDe(pessoaDeAtualizacoes(), { chave: 'projetos', alteradaEm: null }).linha, 'Desde: —');

  const paraAtualizacoes = naResponsabilidade(pessoaDeProjetos(), { chave: 'atualizacoes' });
  assert.equal(paraAtualizacoes.funcao, 'atualizacoes');
  assert.equal(aguardandoDe(paraAtualizacoes).valor, null);
  assert.equal(atuacaoDe(pessoaDeProjetos(), { chave: 'atualizacoes' }).linha, 'Planilha: —');
  // A produção é da pessoa no sistema: continua valendo.
  assert.equal(normasDoPeriodo(paraAtualizacoes, 'mes', doDia).total, 40);
  // Sem troca de grupo, nada some.
  assert.equal(naResponsabilidade(pessoaDeProjetos(), { chave: 'projetos_sem_normas' }).projeto.total, 404);
  assert.equal(naResponsabilidade(null, { chave: 'projetos' }), null);
});

test('vinculadas: o número da cidade do projeto, ou "—" com "sem dado"', () => {
  assert.deepEqual(vinculadasDe(pessoaDeProjetos()), { valor: 270, rotulo: 'Vinculadas', legenda: '' });
  assert.deepEqual(vinculadasDe(pessoaDeAtualizacoes()), { valor: null, rotulo: 'Vinculadas', legenda: 'sem dado' });
  assert.equal(vinculadasDe(pessoaDeProjetos({ vinculadas: { valor: 1, cidade: null } })).rotulo, 'Vinculada');
  assert.equal(vinculadasDe(pessoaDeProjetos({ vinculadas: { valor: 0, cidade: null } })).valor, 0);
  assert.equal(vinculadasDe(pessoaDeProjetos({ vinculadas: undefined })).valor, null);
});

test('GET das responsabilidades: só as escolhas com chave conhecida', () => {
  assert.deepEqual(
    lerResponsabilidades({
      responsabilidades: {
        glopes: { chave: 'projetos_finalizando', alteradaEm: ALTERADA_EM },
        laura: { chave: 'inventada', alteradaEm: ALTERADA_EM },
        ramon: { chave: 'atualizacoes' },
      },
    }),
    { glopes: { chave: 'projetos_finalizando', alteradaEm: ALTERADA_EM }, ramon: { chave: 'atualizacoes', alteradaEm: null } },
  );
  assert.deepEqual(lerResponsabilidades(null), {});
  assert.deepEqual(lerResponsabilidades({ aviso: 'x' }), {});
});

test('falha ao salvar: espera no 429, servidor sendo preparado no 503, o resto genérico', () => {
  assert.equal(mensagemDeFalha({ status: 429 }), 'Aguarde um instante e tente de novo.');
  // 429: a mensagem do servidor ('cedo' ou 'lotado'), se for uma string curta.
  const cedo = 'Essa responsabilidade acabou de mudar. Espere alguns segundos e tente de novo.';
  const lotado = 'Muitas trocas agora. Espere um minuto e tente de novo.';
  assert.equal(mensagemDeFalha({ status: 429, erro: cedo }), cedo);
  assert.equal(mensagemDeFalha({ status: 429, erro: `  ${lotado} ` }), lotado);
  assert.equal(mensagemDeFalha({ status: 429, erro: 'x'.repeat(120) }), 'x'.repeat(120));
  for (const erro of ['x'.repeat(121), '   ', '', 42, null, { texto: cedo }]) {
    assert.equal(mensagemDeFalha({ status: 429, erro }), 'Aguarde um instante e tente de novo.');
  }
  // Nos outros status, a do servidor nunca aparece.
  assert.equal(mensagemDeFalha({ status: 503, erro: cedo }), 'Ainda não dá para salvar: o servidor está sendo preparado.');
  assert.equal(mensagemDeFalha({ status: 400, erro: cedo }), 'Não deu para salvar. Tente de novo.');
  assert.equal(mensagemDeFalha({ status: 503 }), 'Ainda não dá para salvar: o servidor está sendo preparado.');
  for (const status of [0, 400, 404, 502]) assert.equal(mensagemDeFalha({ status }), 'Não deu para salvar. Tente de novo.');
});

test('chaves herdadas do objeto ("constructor", "__proto__") não valem como responsabilidade', () => {
  for (const chave of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.equal(ehResponsabilidade(chave), false, chave);
    assert.equal(chaveEfetiva(pessoaDeProjetos(), { chave }), 'projetos', chave);
    assert.equal(atuacaoDe(pessoaDeProjetos(), { chave, alteradaEm: ALTERADA_EM }).linha, 'Desde: 20/10 - 08:15', chave);
  }
  assert.equal(chaveEfetiva({ funcao: 'constructor' }, null), null);
  assert.equal(ehResponsabilidade(undefined), false);
  assert.equal(ehResponsabilidade('projetos_finalizando'), true);
  assert.deepEqual(
    lerResponsabilidades({
      responsabilidades: {
        glopes: { chave: 'constructor', alteradaEm: ALTERADA_EM },
        laura: { chave: '__proto__', alteradaEm: ALTERADA_EM },
        ramon: { chave: 'projetos', alteradaEm: ALTERADA_EM },
      },
    }),
    { ramon: { chave: 'projetos', alteradaEm: ALTERADA_EM } },
  );
});

test('a mensagem de falha fica 6 s, ou o Retry-After se for maior, até 60 s', () => {
  assert.equal(tempoDaFalha(null), 6000);
  assert.equal(tempoDaFalha(undefined), 6000);
  assert.equal(tempoDaFalha('3'), 6000); // 'cedo'
  assert.equal(tempoDaFalha('60'), 60000); // 'lotado'
  assert.equal(tempoDaFalha('20'), 20000);
  assert.equal(tempoDaFalha('3600'), 60000);
  assert.equal(tempoDaFalha('abc'), 6000);
  assert.equal(tempoDaFalha('-5'), 6000);
  assert.equal(tempoDaFalha('1.5'), 6000);
  const agora = Date.parse('2026-11-04T15:00:00Z');
  assert.equal(tempoDaFalha('Wed, 04 Nov 2026 15:00:30 GMT', agora), 30000);
  assert.equal(tempoDaFalha('Wed, 04 Nov 2026 14:00:00 GMT', agora), 6000);
});
