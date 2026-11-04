// Fase F6 do /compilacao: histórico do Todo o Tempo de Projetos Novos.
// Uso: npm run test:compilacao
import assert from 'node:assert/strict';
import test from 'node:test';
import { lerEquipe } from '../scripts/lib/compilacao/configuracao.mjs';
import { AGORA, EQUIPE_CONFIG, auditoriaSintetica, registro } from '../scripts/lib/compilacao/compilacao-sintetica.mjs';
import { montarCompilacao } from '../scripts/lib/build-compilacao.mjs';
import { normasComBalde } from '../scripts/lib/compilacao/normas-distintas.mjs';
import { CATALOGO } from '../scripts/lib/compilacao/tipos.mjs';
import {
  LOTE,
  chaveGuardada,
  linhasDoHistorico,
  repositorioHistorico,
  todoOTempoDosProjetos,
  totaisPorPessoa,
} from './compilacao-historico.mjs';

const equipe = lerEquipe(EQUIPE_CONFIG);
const AUDITORIA = auditoriaSintetica();
const HOJE = '2026-11-04';
const INICIO = '2026-10-19'; // começo da janela de versões desta busca
const leo = (extra) => registro({ usuario: 900001, ...extra });

// Banco falso: tabela de normas com chave (personagem, chave), cargas e a view.
function bancoFalso({ cargas = {}, falhar = {} } = {}) {
  const normas = new Map();
  const carga = new Map(Object.entries(cargas));
  const gravacoes = [];
  return {
    normas,
    carga,
    gravacoes,
    async cargas(personagens) {
      if (falhar.cargas) throw new Error('tabela não existe');
      return new Map(personagens.filter((p) => carga.has(p)).map((p) => [p, carga.get(p)]));
    },
    async gravarNormas(linhas, { substituir = false } = {}) {
      if (falhar.gravar) throw new Error('sem permissão');
      gravacoes.push(linhas.length);
      for (const l of linhas) {
        const id = `${l.personagem}|${l.chave}`;
        if (substituir || !normas.has(id)) normas.set(id, l);
      }
    },
    async marcarCargas(linhas) {
      for (const l of linhas) carga.set(l.personagem, l.carregado_ate);
    },
    async avancarCargas(personagens, ate) {
      for (const p of personagens) if (carga.has(p) && carga.get(p) < ate) carga.set(p, ate);
    },
    async totais(personagens) {
      if (falhar.totais) throw new Error('view não existe');
      const contagem = new Map();
      for (const l of normas.values()) {
        if (!personagens.includes(l.personagem)) continue;
        const id = `${l.personagem}|${l.balde}`;
        contagem.set(id, (contagem.get(id) ?? 0) + 1);
      }
      return [...contagem].map(([id, n]) => {
        const [personagem, balde] = id.split('|');
        return { personagem, balde, normas: n };
      });
    },
  };
}

const rodar = (repo, opcoes = {}) => {
  const avisos = [];
  return todoOTempoDosProjetos({
    repo,
    equipe,
    auditoria: AUDITORIA,
    catalogo: CATALOGO,
    catalogoDoSistema: true,
    hoje: HOJE,
    inicioVersoes: INICIO,
    agora: AGORA,
    avisar: (m) => avisos.push(m),
    ...opcoes,
  }).then((resultado) => ({ resultado, avisos }));
};

test('a linha guarda só o resumo da norma, o tipo e a primeira data', () => {
  const linhas = linhasDoHistorico('leonardo', [
    leo({ numero: 1, data: '2026-11-04' }),
    leo({ numero: 1, data: '2026-10-20' }),
    leo({ numero: 2, data: '2026-11-03', acao: 2 }), // alteração não conta
    leo({ tipo: 'Lei Ordinária', numero: 7, data: '2026-11-01' }),
  ], CATALOGO, HOJE);
  assert.equal(linhas.length, 2);
  const resolucao = linhas.find((l) => l.balde === 'resolucoes');
  assert.equal(resolucao.primeira_data, '2026-10-20');
  for (const l of linhas) {
    assert.match(l.chave, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(l).sort(), ['balde', 'chave', 'personagem', 'primeira_data']);
  }
  assert.ok(!JSON.stringify(linhas).includes('Cidade'), 'nenhum texto do sistema no histórico');
});

test('dia sem ação = nenhuma linha', () => {
  assert.deepEqual(linhasDoHistorico('leonardo', [], CATALOGO, HOJE), []);
  assert.deepEqual(linhasDoHistorico('leonardo', undefined, CATALOGO, HOJE), []);
});

test('versão sem número reconhecido vai para "outros", uma vez por texto', () => {
  const linhas = linhasDoHistorico('leonardo', [
    leo({ descricao: 'Ata da sessão', data: '2026-11-04' }),
    leo({ descricao: 'Ata da sessão', data: '2026-11-03' }),
  ], CATALOGO, HOJE);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].balde, 'outros');
  assert.equal(linhas[0].primeira_data, '2026-11-03');
});

test('I12: histórico da carga + janela da busca = contagem direta de todas as versões', async () => {
  const antigas = [
    leo({ numero: 1, data: '2026-10-02' }), // a mesma norma ganha versão de novo na janela
    leo({ numero: 90, data: '2026-09-15' }),
    leo({ tipo: 'Decreto', numero: 3, data: '2025-01-10' }),
  ];
  const banco = bancoFalso({ cargas: { leonardo: '2026-11-03' } });
  await banco.gravarNormas(linhasDoHistorico('leonardo', antigas, CATALOGO, '2026-11-03'), { substituir: true });

  const { resultado } = await rodar(banco);
  const direto = normasComBalde([...antigas, ...AUDITORIA[900001].versoes], CATALOGO);
  assert.equal(resultado.leonardo.total, direto.size);
  assert.equal(Object.values(resultado.leonardo.porBalde).reduce((a, b) => a + b, 0), resultado.leonardo.total);
  // A data mais antiga fica: a norma 1 continua com a data da carga.
  const n1 = banco.normas.get(`leonardo|${chaveGuardada('Cidade A-XX|28|1/2026')}`);
  assert.equal(n1?.primeira_data, '2026-10-02');
});

test('rodar duas vezes dá o mesmo total (idempotente) e avança a carga até hoje', async () => {
  const banco = bancoFalso({ cargas: { leonardo: '2026-11-03', ramon: '2026-11-04' } });
  const primeira = await rodar(banco);
  const segunda = await rodar(banco);
  assert.deepEqual(segunda.resultado, primeira.resultado);
  assert.equal(banco.carga.get('leonardo'), HOJE);
  assert.equal(banco.carga.get('ramon'), HOJE);
});

test('recarga apagou a carga no meio de uma busca: a busca não recria a marca', async () => {
  const banco = bancoFalso({ cargas: { leonardo: '2026-11-03' } });
  const ler = banco.cargas;
  banco.cargas = async (personagens) => {
    const lidas = await ler(personagens);
    banco.carga.delete('leonardo'); // o script apagou logo depois de a rota ler
    return lidas;
  };
  await rodar(banco);
  assert.equal(banco.carga.has('leonardo'), false);
});

test('sem carga, com buraco ou sem o catálogo do sistema: "—" com aviso, e nada gravado', async () => {
  const semCarga = await rodar(bancoFalso());
  assert.deepEqual(semCarga.resultado, {});
  assert.ok(semCarga.avisos.some((m) => m.includes('leonardo') && m.includes('não carregado')));

  const buraco = bancoFalso({ cargas: { leonardo: '2026-10-10' } });
  const comBuraco = await rodar(buraco);
  assert.equal(comBuraco.resultado.leonardo, undefined);
  assert.ok(comBuraco.avisos.some((m) => m.includes('rode a carga de novo')));
  assert.deepEqual(buraco.gravacoes, []);

  // A carga que termina na véspera do começo da janela não deixa buraco.
  const encostado = await rodar(bancoFalso({ cargas: { leonardo: '2026-10-18' } }));
  assert.ok(encostado.resultado.leonardo);

  const fixo = bancoFalso({ cargas: { leonardo: '2026-11-03' } });
  const semCatalogo = await rodar(fixo, { catalogoDoSistema: false });
  assert.deepEqual(semCatalogo.resultado, {});
  assert.deepEqual(fixo.gravacoes, []);
});

test('falha no Supabase: Todo o Tempo "—" com aviso, sem quebrar a busca', async () => {
  const leitura = await rodar(bancoFalso({ falhar: { cargas: true } }));
  assert.deepEqual(leitura.resultado, {});
  assert.ok(leitura.avisos.some((m) => m.includes('0005')));
  for (const falha of ['gravar', 'totais']) {
    const r = await rodar(bancoFalso({ cargas: { leonardo: '2026-11-03' }, falhar: { [falha]: true } }));
    assert.deepEqual(r.resultado, {}, falha);
    assert.equal(r.avisos.length, 1 + 3, falha); // 3 pessoas sem carga + a falha
  }
  assert.deepEqual((await rodar(null)).resultado, {});
});

test('totais da view: só pessoas pedidas, baldes conhecidos e números válidos', () => {
  const r = totaisPorPessoa(
    [
      { personagem: 'leonardo', balde: 'resolucoes', normas: 10 },
      { personagem: 'leonardo', balde: 'outros', normas: 2 },
      { personagem: 'leonardo', balde: 'inventado', normas: 5 },
      { personagem: 'ramon', balde: 'leis', normas: -1 },
      { personagem: 'intruso', balde: 'leis', normas: 3 },
    ],
    ['leonardo', 'ramon'],
  );
  assert.equal(r.leonardo.total, 12);
  assert.equal(r.ramon.total, 0);
  assert.equal(r.intruso, undefined);
});

test('o repositório grava em lotes e só pede o que é das pessoas, com o id codificado', async () => {
  const pedidos = [];
  const pedir = async (caminho, opcoes = {}) => {
    pedidos.push({ caminho, ...opcoes });
    return [];
  };
  const repo = repositorioHistorico(pedir);
  const linhas = Array.from({ length: LOTE + 1 }, (_, i) => ({ personagem: 'leonardo', chave: String(i), balde: 'leis', primeira_data: HOJE }));
  await repo.gravarNormas(linhas);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[0].headers.prefer, /ignore-duplicates/);
  await repo.gravarNormas([], { substituir: true });
  assert.equal(pedidos.length, 2);
  await repo.avancarCargas(['leonardo'], HOJE, AGORA.toISOString());
  assert.equal(pedidos.at(-1).method, 'PATCH');
  assert.ok(pedidos.at(-1).caminho.includes(`carregado_ate=lt.${HOJE}`));
  await repo.totais(['a,b']);
  assert.ok(pedidos.at(-1).caminho.includes('personagem=in.(a%2Cb)'));
  assert.ok(!pedidos.some((p) => (p.method ?? 'GET') === 'DELETE'));

  // --refazer: tira a marca da carga antes de apagar, e só as linhas da pessoa.
  await repo.apagarPessoa('leonardo');
  const apagados = pedidos.filter((p) => p.method === 'DELETE');
  assert.deepEqual(apagados.map((p) => p.caminho), [
    '/compilacao_historico_carga?personagem=eq.leonardo',
    '/compilacao_historico_normas?personagem=eq.leonardo',
  ]);
});

test('a rota nunca apaga: só a carga com --refazer chama apagarPessoa', async () => {
  const fonte = await import('node:fs').then((fs) => fs.readFileSync(new URL('./compilacao-historico.mjs', import.meta.url), 'utf8'));
  const corpo = fonte.slice(fonte.indexOf('export async function todoOTempoDosProjetos'));
  assert.ok(!corpo.includes('apagarPessoa'));
});

test('no card: Todo o Tempo e tipos "pelo sistema"; menor que o Mês fica "—"', () => {
  const base = { equipe, agora: AGORA, auditoria: auditoriaSintetica() };
  const mes = montarCompilacao(base).pessoas.leonardo.producao.mes;
  const porBalde = { leis: 1, decretos: 0, resolucoes: 50, portarias: 0, complementares: 0, emendas: 0, outros: 0 };
  const dados = montarCompilacao({ ...base, historico: { leonardo: { total: 51, porBalde } } });
  assert.equal(dados.pessoas.leonardo.producao.tudo, 51);
  assert.equal(dados.pessoas.leonardo.fontes.tudo, 'sistema');
  assert.deepEqual(dados.pessoas.leonardo.porTipo.tudo, porBalde);
  assert.equal(dados.pessoas.ramon.producao.tudo, null);

  const avisos = [];
  const menor = montarCompilacao({ ...base, historico: { leonardo: { total: mes - 1, porBalde } }, avisar: (m) => avisos.push(m) });
  assert.equal(menor.pessoas.leonardo.producao.tudo, null);
  assert.ok(avisos.some((m) => m.includes('menor que o Mês')));
});
