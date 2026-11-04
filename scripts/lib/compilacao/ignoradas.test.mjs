import assert from 'node:assert/strict';
import test from 'node:test';
import { contarIgnoradas, motivosDaNorma, normaNoFormato, textoIndicaArquivoRuim } from './ignoradas.mjs';

// Norma fictícia no formato da listagem de Normas/Get (só os campos que a regra lê).
const norma = (extra = {}) => ({
  id: 1,
  situacaoSingular: 'Não consta revogação expressa',
  eficaciaPrejudicada: false,
  classificacao: 'Educação',
  observacoes: null,
  ementaAssunto: 'Dispõe sobre um assunto inventado.',
  ...extra,
});

// ---------- situação: Eficácia prejudicada ----------

test('situação "Eficácia prejudicada" é ignorada, sem diferença de acento, maiúsculas ou espaços', () => {
  for (const situacao of ['Eficácia prejudicada', 'EFICÁCIA PREJUDICADA', 'Eficacia prejudicada', '  Eficácia   prejudicada ']) {
    assert.equal(motivosDaNorma(norma({ situacaoSingular: situacao })).situacao, true, situacao);
  }
});

test('a caixa "Eficácia Prejudicada" da norma também conta como situação', () => {
  assert.equal(motivosDaNorma(norma({ eficaciaPrejudicada: true })).situacao, true);
});

test('outras situações de eficácia não são ignoradas', () => {
  for (const situacao of ['Eficácia suspensa', 'Eficácia parcialmente suspensa pelo TJ por liminar em ADIn', 'Revogada', null]) {
    assert.equal(motivosDaNorma(norma({ situacaoSingular: situacao })).situacao, false, String(situacao));
  }
});

// ---------- classificação: Finanças e orçamento público ----------

test('classificação "Finanças e orçamento público" é ignorada, sem diferença de acento ou maiúsculas', () => {
  for (const classificacao of ['Finanças e orçamento público', 'FINANÇAS E ORÇAMENTO PÚBLICO', 'Financas e orcamento publico']) {
    assert.equal(motivosDaNorma(norma({ classificacao })).classificacao, true, classificacao);
  }
});

test('só o nome exato: "Finanças e orçamento" e as combinações não são ignoradas', () => {
  for (const classificacao of ['Finanças e orçamento', 'Administração, finanças e orçamento', 'Finanças e orçamento, habitação', null]) {
    assert.equal(motivosDaNorma(norma({ classificacao })).classificacao, false, String(classificacao));
  }
});

// ---------- texto livre: arquivo ilegível ou corrompido ----------

test('texto que diz que o arquivo está ilegível ou corrompido', () => {
  const sim = [
    'Ilegível',
    'ILEGIVEL',
    'PDF ilegível.',
    'Ementa ilegível',
    'Ilegível assunto e número',
    'Arquivos ilegíveis',
    'Arquivo corrompido',
    'documento corrompida',
    'Arquivo danificado',
    'PDF danificado, pedir outro',
    'O arquivo não abre',
    'pdf nao abre',
    'não abre o arquivo',
  ];
  for (const texto of sim) assert.equal(textoIndicaArquivoRuim(texto), true, texto);
});

test('palavras parecidas ou danos que não são do arquivo não contam', () => {
  const nao = [
    'Declara elegível o projeto',
    'Cidadão considerado inelegível',
    'Receitas médicas de modo legível',
    'Reconstrução do muro danificado pelas obras',
    'Substituição de hidrômetros danificados',
    'Não abre mão da cobrança',
    'Abre crédito adicional',
    'Sem texto',
    '',
    null,
    undefined,
  ];
  for (const texto of nao) assert.equal(textoIndicaArquivoRuim(texto), false, String(texto));
});

test('o texto é procurado nas observações e na ementa/assunto', () => {
  assert.equal(motivosDaNorma(norma({ observacoes: 'Arquivo ilegível' })).texto, true);
  assert.equal(motivosDaNorma(norma({ ementaAssunto: 'Ilegível' })).texto, true);
  assert.equal(motivosDaNorma(norma()).texto, false);
});

// ---------- contagem ----------

test('cada norma ignorada conta uma vez; os motivos contam à parte, e "ambas" é situação E classificação', () => {
  const normas = [
    norma({ id: 1 }),
    norma({ id: 2, situacaoSingular: 'Eficácia prejudicada', classificacao: 'Finanças e orçamento público' }),
    norma({ id: 3, situacaoSingular: 'Eficácia prejudicada' }),
    norma({ id: 4, classificacao: 'Finanças e orçamento público' }),
    norma({ id: 5, observacoes: 'PDF ilegível' }),
    norma({ id: 6, classificacao: 'Finanças e orçamento público', ementaAssunto: 'Ilegível' }),
    norma({ id: 7, classificacao: 'Finanças e orçamento' }),
  ];
  assert.deepEqual(contarIgnoradas(normas), { ignoradas: 5, situacao: 2, classificacao: 3, ambas: 1, texto: 2 });
});

test('lista vazia: nada ignorado (zero de verdade)', () => {
  assert.deepEqual(contarIgnoradas([]), { ignoradas: 0, situacao: 0, classificacao: 0, ambas: 0, texto: 0 });
});

// ---------- formato ----------

test('norma fora do formato esperado (campo da regra sumiu) é recusada', () => {
  assert.equal(normaNoFormato(norma()), true);
  assert.equal(normaNoFormato(norma({ observacoes: null, classificacao: null, situacaoSingular: null })), true, 'null é valor');
  for (const campo of ['situacaoSingular', 'eficaciaPrejudicada', 'classificacao', 'observacoes', 'ementaAssunto']) {
    const { [campo]: _, ...semCampo } = norma();
    assert.equal(normaNoFormato(semCampo), false, campo);
  }
  assert.equal(normaNoFormato(null), false);
  assert.equal(normaNoFormato('texto'), false);
});
