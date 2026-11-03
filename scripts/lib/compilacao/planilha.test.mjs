import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { lerArquivoExcel } from './leitor-excel.mjs';
import { LAYOUTS, gerarArquivo } from './planilha-sintetica.mjs';
import { identificarAba, lerAba, lerPlanilha } from './planilha.mjs';

let pasta;
let contador = 0;
before(async () => {
  pasta = await mkdtemp(path.join(tmpdir(), 'planilhas-'));
});
after(() => rm(pasta, { recursive: true, force: true }));

const CONFIG = { tituloContem: 'NATHALIA', modoDeficit: 'incluido' };
const VERMELHO = true;

const abaPadrao = (extra = {}) => ({
  nome: 'Outubro 26',
  titulo: 'RELATÓRIO SEMANAL DE ATUALIZAÇÃO - NATHALIA',
  periodo: 'PERÍODO: OUTUBRO',
  blocos: [
    {
      numero: 1,
      cidade: 'CIDADE A-SP',
      linhas: [
        { c: 'L ', d: [['10, 01/10/2026 '], ['(3, 5-6)', VERMELHO]], e: 'L', f: [['9, 01/10/2026 '], ['(5, 8)', VERMELHO]], g: null, h: 4 },
        { c: 'D', e: '-', g: 2, h: 3 },
      ],
    },
    { numero: 2, cidade: 'CIDADE B-MG', linhas: [{ c: 'LC', e: 'LC', h: 1 }] },
  ],
  ...extra,
});

async function ler(def, { layout = 'nathalia', config = CONFIG } = {}) {
  contador += 1;
  const caminho = await gerarArquivo(pasta, `t${contador}.xlsx`, { layout: LAYOUTS[layout], abas: [def] });
  const modelo = await lerArquivoExcel(caminho);
  return lerAba(modelo.abas[0], config);
}

const porSigla = (resultado, cidade, sigla) => resultado.linhas.find((l) => l.cidade === cidade && l.sigla === sigla);

test('identificarAba reconhece os três padrões de nome e o ano de 2 ou 4 dígitos', () => {
  assert.deepEqual(identificarAba('JANEIRO-26'), { mes: 1, ano: 2026 });
  assert.deepEqual(identificarAba('JANEIRO2026'), { mes: 1, ano: 2026 });
  assert.deepEqual(identificarAba('Janeiro 26'), { mes: 1, ano: 2026 });
  assert.deepEqual(identificarAba('MARÇO-26'), { mes: 3, ano: 2026 });
  assert.deepEqual(identificarAba('dezembro 2027'), { mes: 12, ano: 2027 });
});

test('identificarAba devolve null para nome que não é de mês', () => {
  for (const nome of ['Resumo', 'JANEIRO', 'OUTUBRO-2', 'FOO-26']) assert.equal(identificarAba(nome), null, nome);
});

test('lê as linhas de uma aba: cidade, UF, sigla, tipo e números', async () => {
  const r = await ler(abaPadrao());
  assert.equal(r.mes, 10);
  assert.equal(r.ano, 2026);
  assert.equal(r.linhas.length, 3);
  assert.deepEqual(
    { cidade: 'Cidade A', uf: 'SP', sigla: 'L', moduloId: 23, balde: 'leis', total: 4, deficit: 0 },
    (({ cidade, uf, sigla, moduloId, balde, total, deficit }) => ({ cidade, uf, sigla, moduloId, balde, total, deficit }))(porSigla(r, 'Cidade A', 'L')),
  );
  assert.equal(porSigla(r, 'Cidade B', 'LC').uf, 'MG');
});

test('sigla L vira módulo 23, nunca 41', async () => {
  const r = await ler(abaPadrao());
  assert.equal(porSigla(r, 'Cidade A', 'L').moduloId, 23);
});

test('modo incluido: compiladas = TOTAL − DÉFICIT', async () => {
  const r = await ler(abaPadrao());
  assert.equal(porSigla(r, 'Cidade A', 'D').compiladas, 1);
  assert.deepEqual(r.totais, { total: 8, deficit: 2, compiladas: 6 });
});

test('modo separado: compiladas = TOTAL, mesmo com déficit maior que o total', async () => {
  const def = abaPadrao();
  def.blocos[0].linhas[1] = { c: 'D', e: '-', g: 9, h: 3 };
  const r = await ler(def, { config: { tituloContem: 'NATHALIA', modoDeficit: 'separado' } });
  assert.equal(porSigla(r, 'Cidade A', 'D').compiladas, 3);
  assert.equal(r.totais.compiladas, 8);
});

test('I14: modo incluido recusa DÉFICIT maior que TOTAL e diz a célula', async () => {
  const def = abaPadrao();
  def.blocos[0].linhas[1] = { c: 'D', e: '-', g: 9, h: 3 };
  await assert.rejects(ler(def), /G5.*maior/);
});

test('layout da Dâmaris: Total na coluna B, fórmula de H desde H2', async () => {
  const r = await ler(abaPadrao({ nome: 'OUTUBRO-26' }), { layout: 'damaris' });
  assert.equal(r.totais.total, 8);
  assert.equal(r.totalFormula, 8);
});

test('layout da G.Dressano: Total na coluna A', async () => {
  const r = await ler(abaPadrao({ nome: 'OUTUBRO2026' }), { layout: 'gdressano' });
  assert.equal(r.totais.total, 8);
  assert.equal(r.deficitFormula, 2);
});

test('só o vermelho conta como faltante, e D e F se juntam sem repetir', async () => {
  const r = await ler(abaPadrao());
  const linha = porSigla(r, 'Cidade A', 'L');
  assert.deepEqual(linha.faltantes.numeros, [[3, null], [5, null], [6, null], [8, null]]);
  assert.equal(linha.faltantes.total, 4);
  assert.equal(linha.faltantes.doDO, 3);
  assert.equal(linha.faltantes.siscam, 2);
});

test('número em preto entre parênteses não é faltante', async () => {
  const def = abaPadrao();
  def.blocos[1].linhas[0].d = [['4, 01/10/2026 (7, 8)']];
  const r = await ler(def);
  assert.equal(porSigla(r, 'Cidade B', 'LC').faltantes.total, 0);
});

test('mesclagem vertical em C, G e H: valor lido uma vez só', async () => {
  const def = abaPadrao();
  def.blocos[0].linhas = [
    { c: 'L', e: '-', g: 1, h: 5, mesclarComProxima: true },
    { d: [['(77)', VERMELHO]] },
  ];
  const r = await ler(def);
  assert.equal(r.linhas.filter((l) => l.cidade === 'Cidade A').length, 1);
  assert.equal(porSigla(r, 'Cidade A', 'L').total, 5);
  assert.equal(r.totais.total, 6);
});

test('linha de continuação junta a lista vermelha na linha de cima', async () => {
  const def = abaPadrao();
  def.blocos[0].linhas = [
    { c: 'D', e: '-', d: [['30, 01/10/2026 '], ['(1, 2', VERMELHO]], h: 2 },
    { d: [['4, 5)', VERMELHO]] },
  ];
  const r = await ler(def);
  assert.deepEqual(porSigla(r, 'Cidade A', 'D').faltantes.numeros, [[1, null], [2, null], [4, null], [5, null]]);
});

test('cidade que saiu: números contam, status "saiu", faltantes ficam fora do total da aba', async () => {
  const def = abaPadrao();
  def.blocos.push({
    numero: null,
    cidade: [['CIDADE C-SP - NÃO É MAIS CLIENTE', VERMELHO]],
    linhas: [{ c: 'D', e: '-', d: [['20, 01/10/2026 '], ['(1-10)', VERMELHO]], h: 11 }],
  });
  const r = await ler(def);
  const saiu = porSigla(r, 'Cidade C', 'D');
  assert.equal(saiu.cidade_status, 'saiu');
  assert.equal(saiu.total, 11);
  assert.equal(r.totais.total, 19);
  assert.equal(saiu.faltantes.total, 10);
  assert.equal(r.faltantes, 4);
  assert.equal(porSigla(r, 'Cidade A', 'L').cidade_status, 'ativa');
});

test('bloco não municipal (comitês) e sigla duvidosa recebem sinais', async () => {
  const def = abaPadrao();
  def.blocos.push(
    { numero: 3, cidade: 'PCJ - ORGAO', linhas: [{ c: 'COMITÊS PCJ', e: '-', h: 2 }] },
    { numero: 4, cidade: 'CIDADE D-SP', linhas: [{ c: 'LL', e: '-', h: 1 }] },
  );
  const r = await ler(def);
  const pcj = r.linhas.find((l) => l.sigla === 'COMITÊS PCJ');
  assert.equal(pcj.nao_municipal, true);
  assert.equal(pcj.moduloId, null);
  assert.equal(pcj.balde, 'outros');
  assert.equal(porSigla(r, 'Cidade D', 'LL').sigla_duvidosa, true);
});

test('sigla em rich text de duas cores, com espaço, é lida inteira', async () => {
  const def = abaPadrao();
  def.blocos[1].linhas[0].c = [['D'], ['L ', VERMELHO]];
  const r = await ler(def);
  assert.equal(porSigla(r, 'Cidade B', 'DL').moduloId, 25);
});

test('sigla só em E (C vazio) vale', async () => {
  const def = abaPadrao();
  def.blocos[1].linhas[0] = { e: 'LC', h: 1 };
  const r = await ler(def);
  assert.equal(porSigla(r, 'Cidade B', 'LC').total, 1);
});

test('sigla vermelha ou DÉFICIT com fundo vermelho marca par_em_alerta', async () => {
  const def = abaPadrao();
  def.blocos[0].linhas[0].siglaVermelha = true;
  def.blocos[0].linhas[1].gVermelho = true;
  const r = await ler(def);
  assert.equal(porSigla(r, 'Cidade A', 'L').par_em_alerta, true);
  assert.equal(porSigla(r, 'Cidade A', 'D').par_em_alerta, true);
  assert.equal(porSigla(r, 'Cidade B', 'LC').par_em_alerta, false);
});

test("'' e ' ' em DÉFICIT valem 0 e geram aviso", async () => {
  const def = abaPadrao();
  def.blocos[0].linhas[0].g = ' ';
  def.blocos[1].linhas[0].g = '';
  const r = await ler(def);
  assert.equal(porSigla(r, 'Cidade A', 'L').deficit, 0);
  assert.equal(r.avisos.filter((a) => /G4|G6/.test(a)).length, 2);
});

test('número depois da coluna J gera aviso com a célula, e é ignorado nas somas', async () => {
  const r = await ler(abaPadrao({ extras: { Q5: 2, K4: 'nota qualquer' } }));
  assert.ok(r.avisos.some((a) => a.includes('Q5')));
  assert.ok(!r.avisos.some((a) => a.includes('K4')));
  assert.equal(r.totais.total, 8);
});

test('título com outra pessoa: lê a aba mas titulo_confere = false', async () => {
  const r = await ler(abaPadrao({ titulo: 'RELATÓRIO SEMANAL DE ATUALIZAÇÃO - OUTRO NOME' }));
  assert.equal(r.tituloConfere, false);
  assert.equal(r.linhas.length, 3);
});

test('título confere sem diferenciar acento nem caixa', async () => {
  const r = await ler(abaPadrao({ titulo: 'Relatório - Nathália' }));
  assert.equal(r.tituloConfere, true);
});

test('PERÍODO diferente do mês da aba gera aviso', async () => {
  const r = await ler(abaPadrao({ periodo: 'PERÍODO: MAIO' }));
  assert.ok(r.avisos.some((a) => /PER[ÍI]ODO/i.test(a)));
});

test('nome da cidade: tira notas, acha a UF no fim e mantém hífen do próprio nome', async () => {
  const def = abaPadrao();
  def.blocos.push(
    { numero: 3, cidade: [['CIDADE NOVA-SP '], ['(nota de trabalho)', VERMELHO]], linhas: [{ c: 'P', e: '-', h: 1 }] },
    { numero: 4, cidade: 'Arco-Íris', linhas: [{ c: 'P', e: '-', h: 1 }] },
    { numero: 5, cidade: 'VILA ALTA - MG', linhas: [{ c: 'P', e: '-', h: 1 }] },
  );
  const r = await ler(def);
  assert.deepEqual([porSigla(r, 'Cidade Nova', 'P').uf, porSigla(r, 'Arco-Íris', 'P').uf, porSigla(r, 'Vila Alta', 'P').uf], ['SP', '', 'MG']);
});

test('cidade_id fica nulo (resolução é uma etapa futura)', async () => {
  const r = await ler(abaPadrao());
  assert.ok(r.linhas.every((l) => l.cidadeId === null));
});

test('ler duas vezes dá o mesmo resultado (idempotência)', async () => {
  const def = abaPadrao();
  assert.deepEqual(await ler(def), await ler(def));
});

test('lerPlanilha ignora aba que não é de mês, com aviso, e isola o erro de uma aba', async () => {
  contador += 1;
  const ruim = abaPadrao({ nome: 'Setembro 26' });
  ruim.blocos[0].linhas[1] = { c: 'D', e: '-', g: 9, h: 3 };
  const caminho = await gerarArquivo(pasta, `t${contador}.xlsx`, {
    layout: LAYOUTS.nathalia,
    abas: [abaPadrao(), abaPadrao({ nome: 'Resumo' }), ruim],
  });
  const r = lerPlanilha(await lerArquivoExcel(caminho), CONFIG);
  assert.equal(r.abas.length, 2);
  assert.equal(r.abas.find((a) => a.mes === 10).linhas.length, 3);
  assert.match(r.abas.find((a) => a.mes === 9).erro, /maior/);
  assert.equal(r.avisos.length, 1);
});

test('P3: aba com o título de outra pessoa é lida, mas não entra nos totais nem nas abas contadas', async () => {
  contador += 1;
  const deOutra = abaPadrao({ nome: 'Setembro 26', titulo: 'RELATÓRIO SEMANAL DE ATUALIZAÇÃO - OUTRA PESSOA' });
  const caminho = await gerarArquivo(pasta, `t${contador}.xlsx`, {
    layout: LAYOUTS.nathalia,
    abas: [deOutra, abaPadrao()],
  });
  const r = lerPlanilha(await lerArquivoExcel(caminho), CONFIG);
  const outubro = r.abas.find((a) => a.mes === 10);
  assert.equal(r.abas.length, 2);
  assert.equal(r.abas.find((a) => a.mes === 9).tituloConfere, false);
  assert.equal(r.totais.abasContadas, 1);
  assert.deepEqual(
    [r.totais.total, r.totais.deficit, r.totais.compiladas],
    [outubro.totais.total, outubro.totais.deficit, outubro.totais.compiladas],
  );
});
