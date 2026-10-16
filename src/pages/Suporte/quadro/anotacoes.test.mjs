// Casos do que vai escrito no quadro da cena de /suporte.
// Uso: npm run test:quadro
import assert from 'node:assert/strict';
import test from 'node:test';
import { resumoEquipe } from '../mappers/resumoEquipe.js';
import { anotacoesDoQuadro } from './anotacoes.js';

const tecnico = (id) => ({ id, nome: id, funcao: null, ausente: false, avatarIniciais: 'X' });
const EQUIPE = [tecnico('a'), tecnico('b')];
const EXTRAS = {
  atendimentosHoje: 47,
  atendimentosUltimosDias: [41, 52, 44, 38, 47],
  tempoMedioPrimeiraResposta: 18,
  chamados: { abertos: 23, emAndamento: 14, concluidasMes: 412, atrasadas: 3 },
  slaMedio: 96,
  avaliacaoMedia: 4.7,
};
const textos = (lista) => lista.linhas.map(({ texto }) => texto);

test('com todos os dados, o quadro tem as três anotações e a assinatura da equipe técnica', () => {
  const resumo = resumoEquipe(EQUIPE, EXTRAS);
  const anotacoes = anotacoesDoQuadro(resumo);

  assert.equal(anotacoes.assinatura, 'equipe técnica');
  assert.deepEqual(anotacoes.grafico, { titulo: 'Atendimentos', subtitulo: 'últimos 5 dias', dias: resumo.dias });
  assert.equal(anotacoes.lista.titulo, 'Metas da semana');
  assert.deepEqual(anotacoes.lista.linhas, [
    { texto: '✓ SLA 96%  (meta 95%)' },
    { texto: '✓ 47 atendimentos hoje' },
    { texto: '• 3 atrasados → zerar!', alerta: true },
    { texto: '✓ nota média 4,7' },
    { texto: '• 1ª resposta: 18 min' },
  ]);
  assert.deepEqual(anotacoes.postit, { numero: 412, linhas: ['atendimentos', 'no mês ★'] });
});

test('SLA abaixo da meta perde o visto, e sem atrasados a linha comemora', () => {
  const resumo = resumoEquipe(EQUIPE, { slaMedio: 90, chamados: { ...EXTRAS.chamados, atrasadas: 0 } });
  assert.deepEqual(textos(anotacoesDoQuadro(resumo).lista), ['• SLA 90%  (meta 95%)', '✓ nenhum chamado atrasado']);
});

test('só com a identidade dos técnicos, sobra o post-it com o tamanho da equipe', () => {
  const anotacoes = anotacoesDoQuadro(resumoEquipe(EQUIPE, null));
  assert.equal(anotacoes.grafico, null);
  assert.equal(anotacoes.lista, null);
  assert.deepEqual(anotacoes.postit, { numero: 2, linhas: ['técnicos', 'na equipe ★'] });

  assert.equal(anotacoesDoQuadro(resumoEquipe([], null)).postit, null);
});
