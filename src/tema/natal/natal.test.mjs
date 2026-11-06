// Natal no tapete (docs/tema-natal.md, 6.1, testes 3 e 5): a árvore de cada página, nas duas
// formas do tapete, fica fora do caminho ou vira um obstáculo que não fecha chegada, assento,
// mesa nem o corredor do quadro. O interruptor só é lido, nunca fixado.
// Uso: node --test src/tema/natal/natal.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { NATAL_ATIVO } from '../natal.js';
import { BASES_SUPORTE, OBSTACULOS, definirEstacoes, dentroDaArea, tirarEstacoes } from '../../pages/Suporte/boneco/estacoes.js';
import { CONFIG_QUADRO, atualizarObstaculos, configurarQuadro, corredorAberto, posicionarQuadro } from '../../pages/Suporte/quadro/posicao.js';
import { CENA, configurarCena } from '../../pages/Suporte/store.js';
import { CENA_DEV, CORREDOR_DEV, basesDasMesas } from '../../pages/Desenvolvimento/cena/estacoes.js';
import { aplicarPlanta } from '../../pages/Compilacao/cena/lugares.js';
import { CENA_COMPILACAO, MARCA_MOBILIA, QUADRO_COMPILACAO } from '../../pages/Compilacao/cena/planta.js';
import { NATAL_COMPILACAO } from '../../pages/Compilacao/cena/natal/configNatal.js';
import { NATAL_CENA, arvoreNoTapete, cenaNatal, configurarNatal } from './cenario.js';

// A config de /desenvolvimento é de outro pacote (B): sem ela, o caso dela fica pulado.
const NATAL_DEV = await import('../../pages/Desenvolvimento/cena/natal/configNatal.js').then(
  (m) => m.NATAL_DEV,
  () => null,
);

// Raio do corpo do boneco (geometrias.js): a borda da área é onde fica o centro dele.
const RAIO_CORPO = 0.34;
// Folga mínima até chegadas e assentos (6.1).
const FOLGA = 0.3;

// Copiados antes de qualquer página mudar a cena ou o quadro.
const CENA_SUPORTE = { ...CENA };
const QUADRO_SUPORTE = { ...CONFIG_QUADRO };

const PAGINAS = [
  { nome: '/suporte', natal: {}, cena: CENA_SUPORTE, quadro: {}, estacoes: () => definirEstacoes(BASES_SUPORTE) },
  {
    nome: '/desenvolvimento',
    natal: NATAL_DEV,
    cena: CENA_DEV,
    quadro: { corredorPaisagem: CORREDOR_DEV },
    estacoes: (retrato) => definirEstacoes(basesDasMesas(retrato)),
  },
  { nome: '/compilacao', natal: NATAL_COMPILACAO, cena: CENA_COMPILACAO, quadro: QUADRO_COMPILACAO, estacoes: aplicarPlanta },
];

const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Menor distância de um ponto até a borda da elipse (amostrada a cada 0,25°).
function ateABorda(area, p) {
  let menor = Infinity;
  for (let i = 0; i < 1440; i++) {
    const a = (i * Math.PI) / 720;
    menor = Math.min(menor, Math.hypot(p.x - area.rx * Math.cos(a), p.z - area.rz * Math.sin(a)));
  }
  return menor;
}

// Monta a página como o index dela faz e devolve a árvore, as estações e a área.
function montar(pagina, retrato) {
  tirarEstacoes();
  OBSTACULOS.splice(0, OBSTACULOS.length, ...OBSTACULOS.filter(({ estacao }) => estacao !== MARCA_MOBILIA));
  configurarCena(pagina.cena);
  configurarQuadro({ ...QUADRO_SUPORTE, ...pagina.quadro });
  configurarNatal(pagina.natal);
  const estacoes = pagina.estacoes(retrato);
  const area = retrato ? CENA.areaRetrato : CENA.areaPaisagem;
  posicionarQuadro(area, retrato);
  // A pegada do quadro cresce até o tamanho inteiro.
  atualizarObstaculos(10, false);
  return { arvore: arvoreNoTapete(cenaNatal().arvore, area, retrato), estacoes, area };
}

const casos = PAGINAS.flatMap((pagina) => [false, true].map((retrato) => ({ pagina, retrato, forma: retrato ? 'retrato' : 'paisagem' })));

for (const { pagina, retrato, forma } of casos) {
  const pular = !pagina.natal && 'falta a config de Natal desta página';

  test(`${pagina.nome} (${forma}): a árvore fica no tapete e, sem obstáculo, fora do caminho`, { skip: pular }, () => {
    const { arvore, area } = montar(pagina, retrato);
    const tapete = { rx: area.rx + CENA.margemTapete, rz: area.rz + CENA.margemTapete };
    assert.ok(dentroDaArea(tapete, arvore), 'o centro fica no tapete');
    for (const p of arvore.presentes) assert.ok(dentroDaArea(tapete, p, p.raio), `presente ${p.modelo} inteiro no creme`);
    if (arvore.obstaculo) return;
    assert.ok(!dentroDaArea(area, arvore), 'o centro fica fora da área de caminhada');
    const folga = ateABorda(area, arvore) - arvore.raioSaia - RAIO_CORPO;
    assert.ok(folga >= 0, `a saia fica a ${folga.toFixed(2)} m de quem passa`);
    for (const p of arvore.presentes) {
      assert.ok(!dentroDaArea(area, p), `presente ${p.modelo} fora da área`);
      assert.ok(ateABorda(area, p) >= p.raio + RAIO_CORPO, `presente ${p.modelo} longe de quem passa`);
    }
  });

  test(`${pagina.nome} (${forma}): o obstáculo da árvore não fecha chegada, assento, mesa nem quadro`, { skip: pular }, () => {
    const { arvore, estacoes } = montar(pagina, retrato);
    if (!arvore.obstaculo) return;
    const { r } = arvore.obstaculo;
    for (const estacao of estacoes) {
      assert.ok(distancia(arvore, estacao.aprox) >= r + FOLGA, `chegada de ${estacao.id}`);
      assert.ok(distancia(arvore, estacao.assento) >= r + FOLGA, `assento de ${estacao.id}`);
    }
    for (const o of OBSTACULOS) {
      if (o.r <= 0 || o.estacao === 'quadro-corredor') continue;
      // A mesa do café pode encostar: é o canto fechado de propósito (4.2). Só o pé da árvore não a toca.
      const minimo = o.estacao === MARCA_MOBILIA ? arvore.raioSaia + o.r - RAIO_CORPO : r + o.r;
      assert.ok(distancia(arvore, o) >= minimo - 1e-9, `encosta em ${o.estacao}`);
    }
    for (const p of arvore.presentes) {
      assert.ok(distancia(arvore, p) + p.raio <= r, `presente ${p.modelo} dentro do obstáculo`);
    }
  });

  test(`${pagina.nome} (${forma}): o corredor do quadro aberto não cai sobre a árvore`, { skip: pular }, () => {
    const { arvore } = montar(pagina, retrato);
    const raio = arvore.obstaculo?.r ?? arvore.raioSaia;
    for (const trecho of corredorAberto()) {
      if (trecho.r <= 0) continue;
      assert.ok(distancia(trecho, arvore) >= trecho.r + raio, `trecho em (${trecho.x.toFixed(2)}; ${trecho.z.toFixed(2)})`);
    }
  });
}

test('configurarNatal parte sempre do padrão e não muda o padrão', () => {
  configurarNatal({ arvore: { escala: 2 } });
  configurarNatal({ arvore: { angulo: 10 } });
  assert.equal(cenaNatal().arvore.escala, NATAL_CENA.arvore.escala);
  assert.equal(cenaNatal().arvore.angulo, 10);
  assert.equal(NATAL_CENA.arvore.angulo, -145);
  configurarNatal({});
  assert.deepEqual(cenaNatal(), NATAL_CENA);
  tirarEstacoes();
});

test('o interruptor é um booleano (o teste passa ligado e desligado)', () => {
  assert.equal(typeof NATAL_ATIVO, 'boolean');
});
