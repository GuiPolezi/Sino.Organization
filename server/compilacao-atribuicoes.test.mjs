import assert from 'node:assert/strict';
import test from 'node:test';
import { lerEquipe } from '../scripts/lib/compilacao/configuracao.mjs';
import { AGORA, EQUIPE_CONFIG, auditoriaSintetica, estoqueSintetico, registro } from '../scripts/lib/compilacao/compilacao-sintetica.mjs';
import { desdePublico, montarCompilacao } from '../scripts/lib/build-compilacao.mjs';
import { decidirProjetos, linhasDoRetrato, repositorioAtribuicoes } from './compilacao-atribuicoes.mjs';

const equipe = lerEquipe(EQUIPE_CONFIG);
const idPorCidadeUf = new Map([
  ['cidade a-xx', 1001],
  ['cidade b-xx', 1002],
  ['cidade c-xx', 1003],
]);

// Repositório falso: guarda o que foi gravado.
function repoFalso(abertas = [], { falharLeitura = false, falharGravacao = false, falharAbrir = false } = {}) {
  const feito = { fechadas: [], abertas: [], retratos: [] };
  return {
    feito,
    async abertas() {
      if (falharLeitura) throw new Error('tabela não existe');
      return abertas;
    },
    async fechar(id, ate) {
      if (falharGravacao) throw new Error('sem permissão');
      feito.fechadas.push({ id, ate });
    },
    async abrir(linha) {
      if (falharGravacao || falharAbrir) throw new Error('sem permissão');
      feito.abertas.push(linha);
    },
    async gravarRetrato(linhas) {
      feito.retratos.push(...linhas);
    },
  };
}

const clienteFalso = (ultimo) => ({
  pedidos: [],
  async ultimoItem(controller, filtros) {
    this.pedidos.push({ controller, filtros });
    return ultimo;
  },
});

const decidir = (extra = {}) =>
  decidirProjetos({
    repo: repoFalso(),
    cliente: clienteFalso(null),
    equipe,
    auditoria: auditoriaSintetica(),
    catalogo: undefined,
    idPorCidadeUf,
    agora: AGORA,
    avisar: () => {},
    ...extra,
  });

const linha = (personagem, cidade_uf, modulo_ids, origem = 'inferida', id = 7) => ({
  id,
  personagem,
  cidade_uf,
  modulo_ids,
  origem,
  desde: '2026-10-01T12:30:00.000Z',
});

test('sem Supabase não há memória (o montador infere)', async () => {
  assert.equal(await decidir({ repo: null }), undefined);
});

test('sem a tabela (migração não rodada): sem memória e com aviso', async () => {
  const avisos = [];
  const r = await decidir({ repo: repoFalso([], { falharLeitura: true }), avisar: (m) => avisos.push(m) });
  assert.equal(r, undefined);
  assert.ok(avisos.some((m) => m.includes('0004')));
});

test('primeira vez: grava a atribuição com "Desde" = 1ª versão da pessoa na cidade', async () => {
  const repo = repoFalso();
  const cliente = clienteFalso(registro({ cidade: 'Cidade A-XX', data: '2026-09-15', hora: '07:40', usuario: 900001 }));
  const r = await decidir({ repo, cliente });
  assert.deepEqual(r.leonardo, { cidadeUf: 'Cidade A-XX', moduloIds: [28], desde: '2026-09-15T10:40:00.000Z' });
  const gravada = repo.feito.abertas.find((l) => l.personagem === 'leonardo');
  assert.deepEqual(
    { ...gravada, motivo: undefined },
    { personagem: 'leonardo', cidade_uf: 'Cidade A-XX', cidade_id: 1001, modulo_ids: [28], origem: 'inferida', desde: '2026-09-15T10:40:00.000Z', motivo: undefined },
  );
  const pedido = cliente.pedidos.find((p) => p.filtros.usuarioId === '900001');
  assert.deepEqual(pedido.filtros, { usuarioId: '900001', cidadeId: 1001, modulo: 'Versões' });
});

test('se o registro mais antigo é de outra cidade (filtro ignorado), usa a 1ª ação dos últimos dias', async () => {
  const cliente = clienteFalso(registro({ cidade: 'Cidade Z-XX', data: '2020-01-01' }));
  const r = await decidir({ cliente });
  // Leonardo: últimos 2 dias com ação são 04/11 e 03/11; a 1ª ação é 03/11 10:00 (Brasília).
  assert.equal(r.leonardo.desde, '2026-11-03T13:00:00.000Z');
});

test('atribuição gravada igual à inferida: mantém, com o "Desde" gravado e sem gravar nada', async () => {
  const repo = repoFalso([linha('leonardo', 'Cidade A-XX', [28])]);
  const r = await decidir({ repo });
  assert.equal(r.leonardo.desde, '2026-10-01T12:30:00.000Z');
  assert.equal(repo.feito.abertas.filter((l) => l.personagem === 'leonardo').length, 0);
});

test('correção manual em vigor ganha da inferida e da outra linha aberta', async () => {
  const repo = repoFalso([linha('leonardo', 'Cidade A-XX', [28], 'inferida', 1), linha('leonardo', 'Cidade C-XX', [29], 'manual', 2)]);
  const r = await decidir({ repo });
  assert.deepEqual([r.leonardo.cidadeUf, r.leonardo.moduloIds], ['Cidade C-XX', [29]]);
  assert.equal(repo.feito.abertas.length > 0 && repo.feito.abertas.some((l) => l.personagem === 'leonardo'), false);
});

test('troca confirmada na mesma cidade: fecha a antiga e abre a nova com "Desde" da 1ª ação dos dias', async () => {
  // Gravado: Cidade A × Lei Complementar. Leonardo fez Resoluções em A nos 2 últimos dias.
  const repo = repoFalso([linha('leonardo', 'Cidade A-XX', [24], 'inferida', 9)]);
  const cliente = clienteFalso(null);
  const r = await decidir({ repo, cliente });
  assert.deepEqual(repo.feito.fechadas, [{ id: 9, ate: AGORA.toISOString() }]);
  assert.deepEqual(r.leonardo.moduloIds, [28]);
  assert.equal(r.leonardo.desde, '2026-11-03T13:00:00.000Z');
  assert.equal(cliente.pedidos.some((p) => p.filtros.usuarioId === '900001'), false); // mesma cidade: sem pedido
});

test('troca em que a nova não grava reabre a antiga (a regra dos 2 dias não se perde)', async () => {
  const repo = repoFalso([linha('leonardo', 'Cidade A-XX', [24], 'inferida', 9)], { falharAbrir: true });
  const avisos = [];
  await decidir({ repo, avisar: (m) => avisos.push(m) });
  assert.deepEqual(repo.feito.fechadas, [
    { id: 9, ate: AGORA.toISOString() },
    { id: 9, ate: null },
  ]);
  assert.ok(avisos.some((m) => m.includes('leonardo')));
});

test('pessoa cuja Auditoria não respondeu fica com a atribuição gravada', async () => {
  const auditoria = auditoriaSintetica();
  delete auditoria[900004];
  const repo = repoFalso([linha('laura', 'Cidade C-XX', [28])]);
  const r = await decidir({ repo, auditoria });
  assert.equal(r.laura.cidadeUf, 'Cidade C-XX');
});

test('falha ao gravar não derruba: avisa e usa o projeto decidido', async () => {
  const avisos = [];
  const r = await decidir({ repo: repoFalso([], { falharGravacao: true }), avisar: (m) => avisos.push(m) });
  assert.equal(r.leonardo.cidadeUf, 'Cidade A-XX');
  assert.ok(avisos.some((m) => m.includes('leonardo')));
});

test('o montador usa o projeto decidido e mostra "Desde" em Brasília', () => {
  const atribuicoes = { leonardo: { cidadeUf: 'Cidade C-XX', moduloIds: [28], desde: '2026-09-15T10:40:00.000Z' }, laura: null };
  const dados = montarCompilacao({ equipe, agora: AGORA, auditoria: auditoriaSintetica(), estoque: estoqueSintetico, atribuicoes });
  assert.deepEqual(dados.pessoas.leonardo.desde, { data: '2026-09-15', hora: '07:40' });
  assert.equal(dados.pessoas.leonardo.projeto.cidade.nome, 'Cidade C');
  assert.equal(dados.pessoas.leonardo.projeto.total, 20);
  assert.equal(dados.pessoas.laura.projeto, null);
  assert.equal(dados.pessoas.ramon.desde, null); // sem atribuição: inferido, sem "Desde"
});

test('desdePublico: ISO inválido ou vazio vira null', () => {
  assert.equal(desdePublico(null), null);
  assert.equal(desdePublico('não é data'), null);
  assert.deepEqual(desdePublico('2026-11-04T02:30:00.000Z'), { data: '2026-11-03', hora: '23:30' });
});

test('retrato do dia: uma linha por par com estoque que fecha e cidade conhecida', () => {
  const pares = [
    { cidadeUf: 'Cidade A-XX', moduloId: 28 },
    { cidadeUf: 'Cidade B-XX', moduloId: 23 },
    { cidadeUf: 'Cidade Z-XX', moduloId: 28 },
  ];
  const estoque = { ...estoqueSintetico, 'Cidade B-XX|23': { total: 50, versionadas: 30, naoVersionadas: 1 } };
  const linhas = linhasDoRetrato({ estoque, pares, idPorCidadeUf, hoje: '2026-11-04', agora: AGORA });
  assert.deepEqual(linhas, [
    { data: '2026-11-04', cidade_id: 1001, modulo_id: 28, cidade_uf: 'Cidade A-XX', total: 40, versionadas: 30, nao_versionadas: 10, capturado_em: AGORA.toISOString() },
  ]);
});

test('repositório: caminhos e métodos do Supabase', async () => {
  const pedidos = [];
  const pedir = async (caminho, opcoes = {}) => {
    pedidos.push([opcoes.method ?? 'GET', caminho, opcoes.headers?.prefer ?? null]);
    return [];
  };
  const repo = repositorioAtribuicoes(pedir);
  await repo.abertas(['leonardo', 'laura']);
  await repo.fechar(9, '2026-11-04T00:00:00.000Z');
  await repo.abrir({ personagem: 'leonardo' });
  await repo.gravarRetrato([{ data: '2026-11-04' }]);
  await repo.gravarRetrato([]);
  assert.equal(pedidos.length, 4);
  assert.match(pedidos[0][1], /ate=is\.null&personagem=in\.\(leonardo,laura\)/);
  assert.deepEqual(pedidos.slice(1).map(([m]) => m), ['PATCH', 'POST', 'POST']);
  assert.match(pedidos[1][1], /id=eq\.9$/);
  assert.match(pedidos[3][2], /merge-duplicates/);
  assert.deepEqual(await repositorioAtribuicoes(pedir).abertas([]), []);
});
