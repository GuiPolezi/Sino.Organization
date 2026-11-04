import assert from 'node:assert/strict';
import test from 'node:test';
import { EQUIPE_COMPILACAO } from '../src/pages/Compilacao/equipe.js';
import { CompilacaoError, lerEquipe } from './lib/compilacao/configuracao.mjs';
import {
  AGORA,
  EQUIPE_CONFIG,
  auditoriaSintetica,
  estoqueSintetico,
  planilhasSinteticas,
  registro,
} from './lib/compilacao/compilacao-sintetica.mjs';
import { ELENCO } from './lib/compilacao/elenco.mjs';
import { cidadesDosProjetos, filaDaEquipe, montarCompilacao, paresDosProjetos } from './lib/build-compilacao.mjs';
import { inferirProjeto } from './lib/compilacao/projeto.mjs';

const equipe = lerEquipe(EQUIPE_CONFIG);
const entradas = (extra = {}) => ({
  equipe,
  agora: AGORA,
  auditoria: auditoriaSintetica(),
  estoque: estoqueSintetico,
  planilhas: planilhasSinteticas,
  ...extra,
});
const montar = (extra) => montarCompilacao(entradas(extra));
const pessoa = (id, extra) => montar(extra).pessoas[id];
const BALDES = ['leis', 'decretos', 'resolucoes', 'portarias', 'complementares', 'emendas', 'outros'];
const soma = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);

// ---------- elenco e configuração (I5, I7) ----------

test('o elenco do servidor é o mesmo de equipe.js', () => {
  assert.deepEqual([...ELENCO].sort(), EQUIPE_COMPILACAO.map((p) => p.id).sort());
});

test('a resposta tem cada pessoa configurada uma vez, na ordem do elenco', () => {
  const ids = Object.keys(montar().pessoas);
  assert.deepEqual(ids, ELENCO.filter((id) => ids.includes(id)));
  assert.equal(ids.length, 7);
});

test('só aparece quem está na configuração', () => {
  const { 900007: _fora, ...resto } = EQUIPE_CONFIG;
  const dados = montar({ equipe: lerEquipe(resto) });
  assert.equal(dados.pessoas.nathalia, undefined);
  assert.equal(Object.keys(dados.pessoas).length, 6);
});

test('cada pessoa tem a função da configuração', () => {
  const dados = montar();
  for (const { personagem, funcao } of Object.values(EQUIPE_CONFIG)) {
    assert.equal(dados.pessoas[personagem].funcao, funcao);
  }
});

for (const [nome, bruto] of [
  ['JSON inválido', '{nao e json'],
  ['configuração vazia', '{}'],
  ['personagem fora de equipe.js', JSON.stringify({ 900001: { personagem: 'fulano', funcao: 'projetos' } })],
  ['função desconhecida', JSON.stringify({ 900001: { personagem: 'leonardo', funcao: 'chefe' } })],
  ['id que não é número', JSON.stringify({ 'joao.silva': { personagem: 'leonardo', funcao: 'projetos' } })],
  [
    'dois ids para a mesma pessoa',
    JSON.stringify({
      900001: { personagem: 'leonardo', funcao: 'projetos' },
      900002: { personagem: 'leonardo', funcao: 'projetos' },
    }),
  ],
  ['ausente', undefined],
]) {
  test(`configuração inválida (${nome}) dá erro seguro sem repetir o conteúdo`, () => {
    assert.throws(
      () => lerEquipe(bruto),
      (erro) => erro instanceof CompilacaoError && !/fulano|joao|900001|chefe/.test(erro.message),
    );
  });
}

test('a configuração aceita texto JSON ou objeto', () => {
  assert.deepEqual(lerEquipe(JSON.stringify(EQUIPE_CONFIG)), lerEquipe(EQUIPE_CONFIG));
});

// ---------- períodos ----------

test('a resposta traz a referência e os períodos (semana de segunda a domingo)', () => {
  const dados = montar();
  assert.equal(dados.referencia, '2026-11-04');
  assert.deepEqual(dados.periodos, {
    semana: { inicio: '2026-11-02', fim: '2026-11-08' },
    mes: { inicio: '2026-11-01', fim: '2026-11-30' },
  });
});

// ---------- Projetos Novos ----------

test('Projetos: hoje, semana e mês são normas distintas com versão nova (não versões)', () => {
  const { producao, fontes } = pessoa('leonardo');
  assert.deepEqual(producao, { hoje: 3, semana: 5, mes: 6, tudo: null });
  assert.deepEqual(fontes, { hoje: 'sistema', semana: 'sistema', mes: 'sistema', tudo: null });
});

test('Projetos: a versão de fora do período não conta', () => {
  assert.equal(pessoa('leonardo').producao.mes, 6); // a de 30/10 ficou de fora
});

test('Projetos: por tipo, com Outros', () => {
  const { porTipo } = pessoa('leonardo');
  assert.deepEqual(Object.keys(porTipo.hoje), BALDES);
  assert.equal(porTipo.hoje.resolucoes, 2);
  assert.equal(porTipo.hoje.leis, 1);
  assert.equal(porTipo.tudo, null);
});

test('Projetos: tipo fora dos 6 vai para Outros', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004].versoes = [registro({ tipo: 'Ato da Mesa', numero: 1, cidade: 'Cidade C-XX', data: '2026-11-04' })];
  assert.equal(pessoa('laura', { auditoria }).porTipo.hoje.outros, 1);
});

test('I1/I2: a soma dos tipos é o total, por pessoa e período', () => {
  const dados = montar();
  for (const p of Object.values(dados.pessoas)) {
    for (const periodo of ['hoje', 'semana', 'mes', 'tudo']) {
      if (p.producao[periodo] === null) {
        assert.equal(p.porTipo[periodo], null);
      } else if (p.funcao === 'atualizacoes' && periodo === 'tudo') {
        assert.equal(p.porTipo.tudo, null); // Todo o Tempo de Atualizações: só o total (1 contagem)
      } else {
        assert.equal(soma(p.porTipo[periodo]), p.producao[periodo], `${periodo}`);
      }
    }
  }
});

test('I13: normas distintas nunca passam do número de versões', () => {
  const auditoria = auditoriaSintetica();
  const dados = montar({ auditoria });
  // O Mês vem do sistema para as 7 pessoas.
  for (const [id, { personagem, funcao }] of Object.entries(EQUIPE_CONFIG)) {
    const lista = funcao === 'atualizacoes' ? auditoria[id].normasIncluidas : auditoria[id].versoes;
    assert.ok(dados.pessoas[personagem].producao.mes <= lista.length);
  }
  assert.ok(pessoa('leonardo').producao.hoje < 4, 'a norma com 2 versões vale 1');
});

test('hoje não passa do mês quando vêm da mesma fonte', () => {
  const { producao } = pessoa('leonardo');
  assert.ok(producao.hoje <= producao.mes);
});

test('o projeto vem da Auditoria recente: cidade e tipo dominante', () => {
  const { projeto, cidades } = pessoa('leonardo');
  assert.deepEqual(projeto, {
    cidade: { nome: 'Cidade A', uf: 'XX' },
    tipos: ['Resoluções'],
    total: 40,
    compiladas: 30,
    aguardando: 10,
    compartilhadaCom: [],
  });
  assert.deepEqual(cidades, [{ nome: 'Cidade A', uf: 'XX' }]);
});

test('I4: compiladas + aguardando = total no projeto', () => {
  for (const id of ['leonardo', 'ramon', 'glopes', 'laura']) {
    const { projeto } = pessoa(id);
    assert.equal(projeto.compiladas + projeto.aguardando, projeto.total, id);
  }
});

test('tipo misturado: entram os tipos com 20% ou mais e o estoque é somado', () => {
  const { projeto } = pessoa('glopes');
  assert.deepEqual(projeto.tipos, ['Leis Ordinárias', 'Leis Complementares']); // decreto, com 9%, fica de fora
  assert.deepEqual([projeto.total, projeto.compiladas, projeto.aguardando], [80, 40, 40]);
});

test('o aguardando de Projetos vem das Normas', () => {
  assert.deepEqual(pessoa('leonardo').aguardando, { valor: 10, fonte: 'normas' });
});

test('I4: estoque que não fecha deixa os números do projeto em branco', () => {
  const estoque = { ...estoqueSintetico, 'Cidade A-XX|28': { total: 40, versionadas: 30, naoVersionadas: 11 } };
  const p = pessoa('leonardo', { estoque });
  assert.equal(p.projeto.cidade.nome, 'Cidade A');
  assert.deepEqual([p.projeto.total, p.projeto.compiladas, p.projeto.aguardando], [null, null, null]);
  assert.deepEqual(p.aguardando, { valor: null, fonte: null });
});

test('sem estoque buscado, o aguardando é "—" e nunca 0', () => {
  const p = pessoa('leonardo', { estoque: {} });
  assert.equal(p.aguardando.valor, null);
  assert.equal(p.projeto.total, null);
});

test('sem ação nenhuma recente, a pessoa fica sem projeto', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004] = { versoes: [], normas: [], recentes: [] };
  const p = pessoa('laura', { auditoria });
  assert.equal(p.projeto, null);
  assert.deepEqual(p.cidades, []);
  assert.equal(p.producao.hoje, 0); // a fonte respondeu: zero de verdade
});

test('I6: fila compartilhada tem os mesmos números e aponta o colega', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004].versoes = [registro({ numero: 31, cidade: 'Cidade A-XX', data: '2026-11-04', usuario: 900004 })];
  const dados = montar({ auditoria });
  const { leonardo, laura } = dados.pessoas;
  assert.deepEqual(leonardo.projeto.compartilhadaCom, ['laura']);
  assert.deepEqual(laura.projeto.compartilhadaCom, ['leonardo']);
  assert.deepEqual(
    [laura.projeto.total, laura.projeto.compiladas, laura.projeto.aguardando],
    [leonardo.projeto.total, leonardo.projeto.compiladas, leonardo.projeto.aguardando],
  );
});

test('I6: no total da equipe a fila compartilhada entra uma vez', () => {
  const separado = filaDaEquipe(entradas());
  assert.equal(separado.projetos, 105); // 10 + 40 + 20 + 20 + 15
  assert.equal(separado.atualizacoes, 7); // déficit: Dâmaris 3 (outubro) + G.Dressano 4 (novembro)
  const auditoria = auditoriaSintetica();
  auditoria[900004].versoes = [registro({ numero: 31, cidade: 'Cidade A-XX', data: '2026-11-04', usuario: 900004 })];
  assert.equal(filaDaEquipe(entradas({ auditoria })).projetos, 90); // o par A×Resolução só uma vez
});

test('dado da pessoa que não foi buscado fica "—", nunca 0', () => {
  const auditoria = auditoriaSintetica();
  delete auditoria[900001];
  const p = pessoa('leonardo', { auditoria });
  assert.deepEqual(p.producao, { hoje: null, semana: null, mes: null, tudo: null });
  assert.equal(p.projeto, null);
});

// ---------- Atualizações ----------

test('Atualizações: Hoje, Semana e Mês são as inclusões em Normas da pessoa, pelo sistema', () => {
  const p = pessoa('damaris');
  assert.deepEqual([p.producao.hoje, p.producao.semana, p.producao.mes], [2, 3, 3]);
  assert.deepEqual([p.fontes.hoje, p.fontes.semana, p.fontes.mes], ['sistema', 'sistema', 'sistema']);
  // O tipo sai do começo da descrição, com ou sem o ano no número.
  assert.equal(p.porTipo.hoje.leis, 1);
  assert.equal(p.porTipo.hoje.decretos, 1);
  assert.equal(soma(p.porTipo.mes), 3);
});

test('Atualizações: Todo o Tempo é o total de inclusões em Normas do sistema; os tipos ficam "—"', () => {
  const p = pessoa('damaris');
  assert.equal(p.producao.tudo, 250);
  assert.equal(p.fontes.tudo, 'sistema');
  assert.equal(p.porTipo.tudo, null);
});

test('Atualizações: os números de normas não vêm da planilha (com ou sem ela, são os mesmos)', () => {
  const com = pessoa('gdressano');
  const sem = pessoa('gdressano', { planilhas: null });
  assert.deepEqual(com.producao, sem.producao);
  assert.deepEqual(com.producao, { hoje: 0, semana: 1, mes: 1, tudo: 120 });
  assert.ok(Object.values(com.fontes).every((f) => f === 'sistema'));
});

test('Atualizações: cada inclusão é uma linha da Auditoria e conta 1, como no painel', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900006].normasIncluidas.unshift(
    registro({ modulo: 'Normas', tipo: 'Lei Ordinária', numero: 50, cidade: 'Cidade E-XX', data: '2026-11-04', usuario: 900006 }),
  );
  const p = pessoa('gdressano', { auditoria });
  assert.deepEqual([p.producao.hoje, p.producao.mes], [1, 2]);
});

test('Atualizações: versões e ações que não são inclusão em Normas não contam', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900006].normasIncluidas.unshift(
    registro({ modulo: 'Versões', numero: 60, data: '2026-11-04', usuario: 900006 }),
    registro({ modulo: 'Normas', acao: 2, numero: 61, data: '2026-11-04', usuario: 900006 }),
  );
  auditoria[900006].versoes = [registro({ modulo: 'Versões', numero: 62, data: '2026-11-04', usuario: 900006 })];
  assert.deepEqual(pessoa('gdressano', { auditoria }).producao, { hoje: 0, semana: 1, mes: 1, tudo: 120 });
});

test('Atualizações: tipo desconhecido vai para Outros e a soma fecha', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900006].normasIncluidas.unshift(
    registro({ modulo: 'Normas', descricao: 'Instrução normativa nº 3', data: '2026-11-04', usuario: 900006 }),
  );
  const p = pessoa('gdressano', { auditoria });
  assert.equal(p.porTipo.hoje.outros, 1);
  assert.equal(soma(p.porTipo.mes), p.producao.mes);
});

test('Atualizações: sem o total de todo o tempo, só o Todo o Tempo fica "—"', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidasTotal = null;
  const p = pessoa('damaris', { auditoria });
  assert.deepEqual([p.producao.mes, p.producao.tudo, p.fontes.tudo], [3, null, null]);
});

test('Atualizações: Todo o Tempo menor que o Mês fica "—", com aviso', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005].normasIncluidasTotal = 2;
  const avisos = [];
  const p = pessoa('damaris', { auditoria, avisar: (m) => avisos.push(m) });
  assert.deepEqual([p.producao.mes, p.producao.tudo], [3, null]);
  assert.ok(avisos.some((m) => m.includes('damaris')));
});

test('Atualizações sem a Auditoria (não respondeu): todos os números ficam "—", nunca 0', () => {
  const auditoria = auditoriaSintetica();
  delete auditoria[900005];
  const p = pessoa('damaris', { auditoria });
  assert.deepEqual(p.producao, { hoje: null, semana: null, mes: null, tudo: null });
  assert.deepEqual(p.fontes, { hoje: null, semana: null, mes: null, tudo: null });
});

test('Atualizações: lista no formato antigo (só versões) não vira número', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900005] = { versoes: [registro({ data: '2026-11-04', usuario: 900005 })], normas: [], recentes: [] };
  assert.deepEqual(pessoa('damaris', { auditoria }).producao, { hoje: null, semana: null, mes: null, tudo: null });
});

test('Atualizações sem nenhuma inclusão: 0 é 0 (o sistema respondeu)', () => {
  const p = pessoa('nathalia');
  assert.deepEqual(p.producao, { hoje: 0, semana: 0, mes: 0, tudo: 0 });
  assert.equal(p.fontes.mes, 'sistema');
});

test('D12 opção B por configuração: Hoje e Semana de Atualizações ficam "—"; Mês e Todo o Tempo seguem do sistema', () => {
  const p = pessoa('damaris', { atualizacoesDiaSemana: 'vazio' });
  assert.deepEqual([p.producao.hoje, p.producao.semana], [null, null]);
  assert.deepEqual([p.fontes.hoje, p.fontes.semana], [null, null]);
  assert.equal(p.porTipo.hoje, null);
  assert.deepEqual([p.producao.mes, p.fontes.mes, p.producao.tudo, p.fontes.tudo], [3, 'sistema', 250, 'sistema']);
});

test('Atualizações: carteira e aguardando continuam da planilha (aba do mês ou a mais recente)', () => {
  const damaris = pessoa('damaris');
  assert.deepEqual(damaris.aguardando, { valor: 3, fonte: 'planilha', mes: '2026-10' });
  assert.deepEqual(damaris.planilha, { mes: '2026-10', importadaEm: '2026-11-01T12:00:00.000Z' });
  const gdressano = pessoa('gdressano');
  assert.deepEqual(gdressano.aguardando, { valor: 4, fonte: 'planilha', mes: '2026-11' });
  assert.equal(gdressano.cidades.length, 2);
});

test('Atualizações: a carteira são as cidades ativas da aba, sem as que saíram', () => {
  assert.deepEqual(pessoa('damaris').cidades.map((c) => c.nome).sort(), ['cidade d', 'cidade e']);
});

test('Atualizações sem nenhuma aba: carteira e aguardando ficam "—"', () => {
  const p = pessoa('nathalia');
  assert.deepEqual(p.aguardando, { valor: null, fonte: null });
  assert.equal(p.planilha, null);
  assert.deepEqual(p.cidades, []);
});

test('Atualizações: planilhas ainda não lidas (null) deixam carteira e aguardando "—", não zero', () => {
  const p = pessoa('damaris', { planilhas: null });
  assert.deepEqual(p.aguardando, { valor: null, fonte: null });
  assert.deepEqual(p.cidades, []);
  assert.equal(p.producao.mes, 3);
});

test('o projeto de Atualizações não existe', () => {
  assert.equal(pessoa('damaris').projeto, null);
  assert.equal(pessoa('damaris').desde, null);
  assert.equal(pessoa('leonardo').planilha, null);
});

// ---------- atividade e ausência ----------

test('atividade: a mais recente de um módulo da lista, com descrição cortada em 160', () => {
  const { atividade } = pessoa('leonardo');
  assert.equal(atividade.modulo, 'Arquivos'); // "Usuários" é mais novo, mas fora da lista
  assert.equal(atividade.descricao.length, 160);
  assert.deepEqual(Object.keys(atividade).sort(), ['acao', 'cidade', 'data', 'descricao', 'hora', 'modulo']);
});

test('atividade: a ação numérica vira texto', () => {
  assert.equal(pessoa('leonardo').atividade.acao, 'Inclusão');
});

test('sem ação nos últimos dias a pessoa fica ausente, sem atividade', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004] = { versoes: [], normas: [], recentes: [] };
  const p = pessoa('laura', { auditoria });
  assert.equal(p.ausente, true);
  assert.equal(p.atividade, null);
});

test('quem trabalhou hoje não está ausente', () => {
  const p = pessoa('leonardo');
  assert.equal(p.ausente, false);
  assert.equal(p.semAtividadeDesde, null);
});

test('última ação antiga: informa desde quando está sem atividade', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004] = {
    versoes: [],
    normas: [],
    recentes: [registro({ data: '2026-10-28', modulo: 'Normas', usuario: 900004 })],
  };
  const p = pessoa('laura', { auditoria });
  assert.equal(p.ausente, false);
  assert.equal(p.semAtividadeDesde, '2026-10-28');
});

// ---------- contrato público (AC4, seção 5.7) ----------

const varrer = (valor, visita, caminho = '') => {
  if (Array.isArray(valor)) valor.forEach((v, i) => varrer(v, visita, `${caminho}[${i}]`));
  else if (valor && typeof valor === 'object') {
    for (const [chave, v] of Object.entries(valor)) {
      visita('chave', chave, `${caminho}.${chave}`);
      varrer(v, visita, `${caminho}.${chave}`);
    }
  } else visita('valor', valor, caminho);
};

test('contrato: nenhuma chave proibida na resposta', () => {
  const proibida = /login|usuario|cidadeId|e-?mail|senha|password|nomeCompleto|observac|nota|link|titulo|faltantes_/i;
  const achadas = [];
  varrer(montar(), (tipo, v, caminho) => {
    if (tipo === 'chave' && proibida.test(v) && !/^pessoas$/.test(v)) achadas.push(caminho);
  });
  assert.deepEqual(achadas, []);
});

test('contrato: nenhum valor vaza login, id, e-mail, nome do sistema ou texto da planilha', () => {
  const texto = JSON.stringify(montar());
  for (const proibido of ['login.sintetico', 'Pessoa Sintetica', '9000', '@', 'TEXTO-LIVRE-DA-PLANILHA', 'senha']) {
    assert.ok(!texto.includes(proibido), `vazou: ${proibido}`);
  }
});

test('contrato: só números, textos curtos e "null" nos valores; faltantes sem lista', () => {
  const dados = montar();
  varrer(dados, (tipo, v, caminho) => {
    if (tipo === 'valor') assert.ok(['number', 'string', 'boolean', 'object'].includes(typeof v), caminho);
    if (tipo === 'valor' && typeof v === 'string') assert.ok(v.length <= 160, caminho);
  });
  for (const p of Object.values(dados.pessoas)) assert.ok(p.faltantes === null || typeof p.faltantes === 'number');
});

test('contrato: as chaves de cada pessoa são exatamente as do plano', () => {
  assert.deepEqual(Object.keys(pessoa('leonardo')).sort(), [
    'ausente', 'aguardando', 'atividade', 'cidades', 'desde', 'faltantes', 'fontes',
    'funcao', 'planilha', 'porTipo', 'producao', 'projeto', 'semAtividadeDesde', 'vinculadas',
  ].sort());
});

// ---------- normas vinculadas da cidade do projeto (Finalizando) ----------

test('vinculadas: o número vem da cidade do projeto; sem contagem, "—"', () => {
  const dados = montar({ vinculadas: { 'Cidade A-XX': 5 } });
  assert.deepEqual(dados.pessoas.leonardo.vinculadas, { valor: 5, cidade: { nome: 'Cidade A', uf: 'XX' } });
  assert.deepEqual(dados.pessoas.glopes.vinculadas, { valor: null, cidade: { nome: 'Cidade B', uf: 'XX' } });
  assert.equal(pessoa('leonardo').vinculadas.valor, null, 'sem vinculadas buscadas, nunca 0');
});

test('vinculadas: Atualizações e quem está sem projeto ficam com null', () => {
  const dados = montar({ vinculadas: { 'Cidade A-XX': 5 } });
  assert.deepEqual(dados.pessoas.damaris.vinculadas, { valor: null, cidade: null });
  const semAcao = { ...auditoriaSintetica(), 900001: { versoes: [], normas: [], recentes: [] } };
  assert.deepEqual(pessoa('leonardo', { auditoria: semAcao, vinculadas: { 'Cidade A-XX': 5 } }).vinculadas, { valor: null, cidade: null });
});

test('vinculadas: valor que não é inteiro >= 0 vira "—"', () => {
  for (const ruim of [-1, 1.5, '7', null]) {
    assert.equal(pessoa('leonardo', { vinculadas: { 'Cidade A-XX': ruim } }).vinculadas.valor, null, String(ruim));
  }
});

test('cidadesDosProjetos lista cada cidade de projeto uma vez', () => {
  assert.deepEqual(cidadesDosProjetos({ equipe, auditoria: auditoriaSintetica() }).sort(), ['Cidade A-XX', 'Cidade B-XX', 'Cidade C-XX']);
});

// ---------- regras do projeto (plano de dados, 4.2 e 4.3) ----------

const acoes = (lista) => ({ versoes: lista.map((x) => registro(x)), normas: [] });

test('cidade: empate no número de ações fica com a da ação mais recente', () => {
  const p = inferirProjeto(
    acoes([
      { cidade: 'Cidade A-XX', data: '2026-11-03', hora: '10:00' },
      { cidade: 'Cidade B-XX', data: '2026-11-03', hora: '11:00' },
    ]),
  );
  assert.equal(p.cidadeUf, 'Cidade B-XX');
});

test('a janela são os últimos 5 dias COM ação: dias mais antigos não pesam', () => {
  const recentes = ['2026-11-04', '2026-11-03', '2026-10-30', '2026-10-29', '2026-10-28'].map((data) => ({ cidade: 'Cidade A-XX', data }));
  const antigos = ['2026-10-27', '2026-10-26', '2026-10-23', '2026-10-22', '2026-10-21', '2026-10-20'].flatMap((data) =>
    [1, 2].map((numero) => ({ cidade: 'Cidade B-XX', data, numero })),
  );
  assert.equal(inferirProjeto(acoes([...recentes, ...antigos])).cidadeUf, 'Cidade A-XX');
});

test('ações de Normas também contam para cidade e tipo', () => {
  const entrada = {
    versoes: [registro({ cidade: 'Cidade A-XX', data: '2026-11-04' })],
    normas: [1, 2].map((numero) => registro({ cidade: 'Cidade B-XX', tipo: 'Portaria', modulo: 'Normas', numero, data: '2026-11-04' })),
  };
  assert.deepEqual(inferirProjeto(entrada), { cidadeUf: 'Cidade B-XX', moduloIds: [29] });
});

test('no máximo 3 tipos no conjunto, ordenados pela fatia', () => {
  const mistura = [
    ...Array(3).fill({ tipo: 'Lei Ordinária' }),
    ...Array(3).fill({ tipo: 'Lei Complementar' }),
    ...Array(2).fill({ tipo: 'Resolução' }),
    ...Array(2).fill({ tipo: 'Portaria' }),
  ].map((x, i) => ({ ...x, numero: i + 1, data: '2026-11-04' }));
  assert.deepEqual(inferirProjeto(acoes(mistura)).moduloIds, [23, 24, 28]);
});

test('sem tipo reconhecido, o projeto mostra a cidade e os números ficam "—"', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004].versoes = [registro({ descricao: 'texto sem número', cidade: 'Cidade C-XX', data: '2026-11-04' })];
  const { projeto, aguardando } = pessoa('laura', { auditoria });
  assert.deepEqual(projeto.tipos, []);
  assert.equal(projeto.total, null);
  assert.equal(aguardando.valor, null);
});

test('estoque faltando um dos tipos do conjunto deixa o projeto inteiro "—"', () => {
  const { 'Cidade B-XX|24': _fora, ...estoque } = estoqueSintetico;
  assert.equal(pessoa('glopes', { estoque }).projeto.total, null);
});

test('paresDosProjetos lista cada par cidade×tipo uma vez', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004].versoes = [registro({ numero: 31, cidade: 'Cidade A-XX', data: '2026-11-04', usuario: 900004 })];
  const pares = paresDosProjetos({ equipe, auditoria }).map((p) => `${p.cidadeUf}|${p.moduloId}`);
  assert.deepEqual(pares.sort(), ['Cidade A-XX|24', 'Cidade A-XX|28', 'Cidade B-XX|23', 'Cidade B-XX|24']);
});

test('a resposta traz a fila da equipe com as duas parcelas', () => {
  assert.deepEqual(montar().fila, { projetos: 105, atualizacoes: 7 });
});

// ---------- planilhas ----------

test('carteira: nome da cidade vem do cadastro quando há cidade_id', () => {
  const planilhas = {
    abas: planilhasSinteticas.abas,
    linhas: planilhasSinteticas.linhas.map((l) => (l.cidade === 'cidade g' ? { ...l, cidade_id: 77 } : l)),
  };
  const p = pessoa('gdressano', { planilhas, cidadesPorId: { 77: { nome: 'Cidade Gê', uf: 'XX' } } });
  assert.ok(p.cidades.some((c) => c.nome === 'Cidade Gê'));
});

test('carteira: a cidade com ação mais recente vem primeiro', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900006].normasIncluidas = [
    registro({ modulo: 'Normas', cidade: 'cidade h-XX', data: '2026-11-04', usuario: 900006 }),
    registro({ modulo: 'Normas', cidade: 'cidade g-XX', data: '2026-11-03', usuario: 900006 }),
  ];
  assert.deepEqual(pessoa('gdressano', { auditoria }).cidades.map((c) => c.nome), ['cidade h', 'cidade g']);
});

test('linha de planilha fora do formato deixa a pessoa sem carteira e aguardando (nunca chuta); as normas seguem', () => {
  const planilhas = {
    abas: planilhasSinteticas.abas,
    linhas: [...planilhasSinteticas.linhas, { personagem: 'gdressano', ano: 2026, mes: 11, balde: 'leis', compiladas: -1, deficit: 0 }],
  };
  const avisos = [];
  const p = pessoa('gdressano', { planilhas, avisar: (m) => avisos.push(m) });
  assert.deepEqual([p.aguardando.valor, p.cidades.length], [null, 0]);
  assert.deepEqual([p.producao.mes, p.producao.tudo], [1, 120]);
  assert.equal(avisos.length, 1);
});

test('carteira: a ordem também usa as ações recentes de qualquer módulo', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900006].normasIncluidas = [registro({ modulo: 'Normas', cidade: 'cidade g-XX', data: '2026-11-03', usuario: 900006 })];
  auditoria[900006].recentes = [registro({ modulo: 'Arquivos', cidade: 'cidade h-XX', data: '2026-11-04', usuario: 900006 })];
  assert.deepEqual(pessoa('gdressano', { auditoria }).cidades.map((c) => c.nome), ['cidade h', 'cidade g']);
});

// ---------- ausência por dias úteis ----------

test('ausente só depois de 10 dias úteis sem ação; fim de semana não conta', () => {
  const comUltima = (data) => {
    const auditoria = auditoriaSintetica();
    auditoria[900004] = { versoes: [], normas: [], recentes: [registro({ data, modulo: 'Normas', usuario: 900004 })] };
    return pessoa('laura', { auditoria });
  };
  // 04/11 é quarta: 21/10 (quarta) está a 10 dias úteis; 22/10 a 9.
  assert.equal(comUltima('2026-10-21').ausente, true);
  assert.equal(comUltima('2026-10-22').ausente, false);
  // Ação na sexta e hoje é segunda: 1 dia útil, ainda não é "sem atividade".
  const auditoria = auditoriaSintetica();
  auditoria[900004] = { versoes: [], normas: [], recentes: [registro({ data: '2026-10-30', modulo: 'Normas', usuario: 900004 })] };
  const segunda = montarCompilacao({ ...entradas({ auditoria }), agora: new Date('2026-11-02T15:00:00Z') }).pessoas.laura;
  assert.equal(segunda.semAtividadeDesde, null);
});

// ---------- correções da 1ª revisão ----------

test('atividade: texto hostil não chega à página (ação só 1/2/3, cidade com teto, sem e-mail)', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900001].recentes = [
    {
      ...registro({ modulo: 'Arquivos', data: '2026-11-04', hora: '18:00' }),
      acao: 'Fulano fulano@exemplo.invalid',
      cidadeUf: `${'x@y.invalid '.repeat(500)}-AAAA`,
      descricao: 'Arquivo enviado por pessoa@exemplo.invalid com nota',
    },
  ];
  const { atividade } = pessoa('leonardo', { auditoria });
  assert.equal(atividade.acao, '');
  assert.ok(atividade.cidade.nome.length <= 60);
  assert.equal(atividade.cidade.uf, '');
  assert.ok(!JSON.stringify(atividade).includes('@'));
  assert.match(atividade.descricao, /^Arquivo enviado por … com nota$/);
});

test('atividade: código de ação desconhecido vira texto vazio', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900001].recentes = [registro({ modulo: 'Arquivos', data: '2026-11-04', acao: 9 })];
  assert.equal(pessoa('leonardo', { auditoria }).atividade.acao, '');
});

test('I13: versão sem padrão conta em Outros, uma vez por texto, e os tipos fecham com o total', () => {
  const auditoria = auditoriaSintetica();
  const sem = (hora) => registro({ descricao: 'Texto sem padrão', cidade: 'Cidade C-XX', data: '2026-11-04', hora, usuario: 900004 });
  auditoria[900004].versoes = [...auditoria[900004].versoes, sem('10:00'), sem('11:00')];
  const p = pessoa('laura', { auditoria });
  assert.equal(p.producao.hoje, 2); // a Resolução 30 + o texto sem padrão (as 2 versões dele valem 1)
  assert.equal(p.porTipo.hoje.outros, 1);
  assert.equal(soma(p.porTipo.hoje), p.producao.hoje);
});

test('tipos espalhados (nenhum com 20%): fica o de mais ações', () => {
  const tipos = ['Lei Ordinária', 'Lei Ordinária', 'Lei Complementar', 'Resolução', 'Portaria', 'Decreto Municipal', 'Ato da Mesa', 'Ato da Presidência', 'Decreto Legislativo', 'Emenda à Lei Orgânica', 'Resolução SEFIN'];
  const p = inferirProjeto(acoes(tipos.map((tipo, i) => ({ tipo, numero: i + 1, data: '2026-11-04' }))));
  assert.deepEqual(p.moduloIds, [23]);
});

test('fronteira de 70%: exatamente 70% fica sozinho; 60% divide', () => {
  const lista = (lo, lc) => [...Array(lo).fill('Lei Ordinária'), ...Array(lc).fill('Lei Complementar')].map((tipo, i) => ({ tipo, numero: i + 1, data: '2026-11-04' }));
  assert.deepEqual(inferirProjeto(acoes(lista(7, 3))).moduloIds, [23]);
  assert.deepEqual(inferirProjeto(acoes(lista(6, 4))).moduloIds, [23, 24]);
});

test('o 6º dia com ação já fica fora da janela', () => {
  // 5 dias com 1 ação em A; o 6º dia (mais antigo) com 3 ações em B.
  const dias = ['2026-11-04', '2026-11-03', '2026-10-30', '2026-10-29', '2026-10-28'].map((data) => ({ cidade: 'Cidade A-XX', data }));
  const sexto = [1, 2, 3, 4, 5, 6].map((numero) => ({ cidade: 'Cidade B-XX', data: '2026-10-27', numero }));
  assert.equal(inferirProjeto(acoes([...dias, ...sexto])).cidadeUf, 'Cidade A-XX');
});

test('"sem atividade desde" começa com 2 dias úteis sem ação', () => {
  const comUltima = (data) => {
    const auditoria = auditoriaSintetica();
    auditoria[900004] = { versoes: [], normas: [], recentes: [registro({ data, modulo: 'Normas', usuario: 900004 })] };
    return pessoa('laura', { auditoria });
  };
  assert.equal(comUltima('2026-11-02').semAtividadeDesde, '2026-11-02'); // 2 dias úteis antes da quarta
  assert.equal(comUltima('2026-11-03').semAtividadeDesde, null); // ontem
});

test('data no futuro não conta como atividade', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900004] = { versoes: [], normas: [], recentes: [registro({ data: '2026-12-01', modulo: 'Normas', usuario: 900004 })] };
  assert.equal(pessoa('laura', { auditoria }).ausente, true);
});

test('fila da equipe: par com estoque que não fecha fica fora da soma', () => {
  const estoque = { ...estoqueSintetico, 'Cidade C-XX|28': { total: 20, versionadas: 5, naoVersionadas: 99 } };
  assert.equal(filaDaEquipe(entradas({ estoque })).projetos, 90);
});

test('carteira: do cadastro, nome com teto de 60 e UF inválida vira vazia', () => {
  const planilhas = {
    abas: planilhasSinteticas.abas,
    linhas: planilhasSinteticas.linhas.map((l) => (l.cidade === 'cidade g' ? { ...l, cidade_id: 77 } : l)),
  };
  const cidadesPorId = { 77: { nome: 'g'.repeat(300), uf: 'xx; drop' } };
  const cidade = pessoa('gdressano', { planilhas, cidadesPorId }).cidades.find((c) => c.nome.startsWith('g'));
  assert.equal(cidade.nome.length, 60);
  assert.equal(cidade.uf, '');
});

test('carteira: texto livre da planilha (sem cadastro) não vai para a página', () => {
  const anotacoes = ['Cidade Z-XX cadastrar só AM; R só do RI', 'g'.repeat(300), 'Cidade sem UF'];
  const planilhas = {
    abas: planilhasSinteticas.abas,
    linhas: [
      ...planilhasSinteticas.linhas,
      ...anotacoes.map((cidade, i) => ({ ...planilhasSinteticas.linhas.at(-1), cidade, uf: i === 2 ? '' : 'XX' })),
    ],
  };
  const avisos = [];
  const nomes = pessoa('gdressano', { planilhas, avisar: (m) => avisos.push(m) }).cidades.map((c) => c.nome);
  assert.deepEqual(nomes.sort(), ['cidade g', 'cidade h']);
  assert.ok(avisos.some((m) => m.includes('3 linha(s)')));
});

// ---------- correções da 2ª revisão ----------

test('atividade: CPF e telefone também são mascarados; números de norma ficam', async () => {
  const { textoPublico } = await import('./lib/compilacao/itens.mjs');
  assert.equal(textoPublico('Lei Ordinária nº 12.791/2026 · CPF 123.456.789-01'), 'Lei Ordinária nº 12.791/2026 · CPF …');
  assert.equal(textoPublico('ligar (14) 99876-5432 ou 14 3232-1000'), 'ligar … ou …');
  assert.equal(textoPublico('Decreto Municipal nº 10.500 / 03/11/2026'), 'Decreto Municipal nº 10.500 / 03/11/2026');
});

test('atividade: texto enorme sem espaço é limpo rápido (sem backtracking)', async () => {
  const { textoPublico } = await import('./lib/compilacao/itens.mjs');
  const inicio = Date.now();
  assert.equal(textoPublico('a'.repeat(400_000)).length, 160);
  assert.equal(textoPublico('9'.repeat(400_000)).length, 160);
  assert.ok(Date.now() - inicio < 500, `levou ${Date.now() - inicio} ms`);
});

test('atividade: o módulo sai com o nome da lista branca, não com o texto que veio', () => {
  const auditoria = auditoriaSintetica();
  auditoria[900001].recentes = [registro({ modulo: '  ARQUIVOS ', data: '2026-11-04' })];
  assert.equal(pessoa('leonardo', { auditoria }).atividade.modulo, 'Arquivos');
});

test('carteira: UF minúscula da planilha vira maiúscula', () => {
  const planilhas = {
    abas: planilhasSinteticas.abas,
    linhas: planilhasSinteticas.linhas.map((l) => (l.cidade === 'cidade g' ? { ...l, uf: 'sp' } : l)),
  };
  assert.equal(pessoa('gdressano', { planilhas }).cidades.find((c) => c.nome === 'cidade g').uf, 'SP');
});
