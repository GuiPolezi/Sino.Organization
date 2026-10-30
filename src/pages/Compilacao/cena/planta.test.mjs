// Casos da planta de /compilacao: onde fica cada coisa e se dá para chegar em tudo.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import { ESTACOES, OBSTACULOS, dentroDaArea, reservarEstacao, tirarEstacoes } from '../../Suporte/boneco/estacoes.js';
import { configurarQuadro, corredorAberto, posicionarQuadro } from '../../Suporte/quadro/posicao.js';
import { aplicarPlanta } from './lugares.js';
import { CENA_COMPILACAO, IDS_DAS_MESAS, MARCA_MOBILIA, QUADRO_COMPILACAO } from './planta.js';

const FORMAS = [
  [false, CENA_COMPILACAO.areaPaisagem, 'paisagem'],
  [true, CENA_COMPILACAO.areaRetrato, 'retrato'],
];
const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const doQuadro = ({ estacao }) => estacao === 'quadro' || estacao === 'quadro-corredor';
const pegadaDoQuadro = () => OBSTACULOS.filter(({ estacao }) => estacao === 'quadro');

configurarQuadro(QUADRO_COMPILACAO);

// Retângulo em volta da pegada de uma estação (como os blocos de contorno de estacoes.js).
function retangulo(id) {
  const pegada = OBSTACULOS.filter(({ estacao }) => estacao === id);
  return {
    minX: Math.min(...pegada.map((o) => o.x - o.r)),
    maxX: Math.max(...pegada.map((o) => o.x + o.r)),
    minZ: Math.min(...pegada.map((o) => o.z - o.r)),
    maxZ: Math.max(...pegada.map((o) => o.z + o.r)),
  };
}
const seTocam = (a, b) => a.minX <= b.maxX && b.minX <= a.maxX && a.minZ <= b.maxZ && b.minZ <= a.maxZ;

test('são sete mesas, três pufes e dois lugares no café, nas duas formas do tapete', () => {
  for (const [retrato] of FORMAS) {
    const estacoes = aplicarPlanta(retrato);
    const tipos = (tipo) => estacoes.filter((e) => e.tipo === tipo).length;
    assert.equal(tipos('mesa'), 7);
    assert.equal(tipos('pufe'), 3);
    assert.equal(tipos('cafe'), 2);
    assert.ok(estacoes.filter((e) => e.tipo !== 'mesa').every((e) => e.especial), 'pufe e café só pela página');
    assert.equal(OBSTACULOS.filter(({ estacao }) => estacao === MARCA_MOBILIA).length, 2, 'a mesa do café, uma vez só');
  }
  tirarEstacoes();
});

test('o ponto de chegada e o assento de cada lugar caem na área de caminhada', () => {
  for (const [retrato, area, forma] of FORMAS) {
    for (const estacao of aplicarPlanta(retrato)) {
      assert.ok(dentroDaArea(area, estacao.aprox, 0.2), `chegada de ${estacao.id} em ${forma}`);
      assert.ok(dentroDaArea(area, estacao.assento), `assento de ${estacao.id} em ${forma}`);
    }
  }
  tirarEstacoes();
});

test('nenhum móvel encosta em outro, nem na estátua', () => {
  for (const [retrato, area, forma] of FORMAS) {
    aplicarPlanta(retrato);
    posicionarQuadro(area, retrato);
    const pecas = OBSTACULOS.filter((o) => o.r > 0 && o.estacao !== 'quadro-corredor');
    pecas.forEach((a, i) =>
      pecas.slice(i + 1).forEach((b) => {
        if (a.estacao === b.estacao) return;
        // As peças de uma mesma mesa de trabalho e as do bloco 2×2 podem se tocar.
        if (IDS_DAS_MESAS.includes(a.estacao) && IDS_DAS_MESAS.includes(b.estacao)) return;
        assert.ok(distancia(a, b) >= a.r + b.r - 1e-9, `${a.estacao} encosta em ${b.estacao} em ${forma}`);
      }),
    );
  }
  tirarEstacoes();
});

test('a chegada de cada lugar fica livre dos outros móveis e da estátua', () => {
  for (const [retrato, area, forma] of FORMAS) {
    const estacoes = aplicarPlanta(retrato);
    posicionarQuadro(area, retrato);
    for (const estacao of estacoes) {
      for (const o of OBSTACULOS) {
        if (o.r <= 0 || o.estacao === estacao.id || o.estacao === 'quadro-corredor') continue;
        assert.ok(distancia(estacao.aprox, o) >= o.r + 0.1, `chegada de ${estacao.id} dentro de ${o.estacao} em ${forma}`);
      }
    }
  }
  tirarEstacoes();
});

test('o bloco 2×2 é um só e as mesas soltas não encostam nele nem entre si', () => {
  for (const [retrato, , forma] of FORMAS) {
    aplicarPlanta(retrato);
    const soltas = ['c-dir-fundo', 'c-dir-frente', 'c-fundo'];
    const blocoInteiro = ['c-b1', 'c-b2', 'c-b3', 'c-b4'].map(retangulo).reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX),
      maxX: Math.max(a.maxX, b.maxX),
      minZ: Math.min(a.minZ, b.minZ),
      maxZ: Math.max(a.maxZ, b.maxZ),
    }));
    soltas.forEach((id, i) => {
      assert.ok(!seTocam(retangulo(id), blocoInteiro), `${id} encosta no bloco em ${forma}`);
      soltas.slice(i + 1).forEach((outra) => assert.ok(!seTocam(retangulo(id), retangulo(outra)), `${id} encosta em ${outra} em ${forma}`));
    });
  }
  tirarEstacoes();
});

test('o corredor da estátua não cobre nenhuma chegada', () => {
  for (const [retrato, area, forma] of FORMAS) {
    const estacoes = aplicarPlanta(retrato);
    posicionarQuadro(area, retrato);
    for (const trecho of corredorAberto()) {
      for (const estacao of estacoes) {
        assert.ok(distancia(trecho, estacao.aprox) >= trecho.r + 0.3 - 1e-9, `corredor cobre ${estacao.id} em ${forma}`);
      }
    }
    assert.equal(pegadaDoQuadro().length, 3);
  }
  tirarEstacoes();
});

test('o "ir trabalhar" padrão só reserva as sete mesas; o café e o pufe só com o filtro da página', () => {
  aplicarPlanta(false);
  const area = CENA_COMPILACAO.areaPaisagem;
  const reservas = Array.from({ length: 7 }, (_, i) => reservarEstacao(`p${i}`, area));
  assert.ok(reservas.every((e) => e?.tipo === 'mesa'));
  assert.equal(reservarEstacao('p7', area), null, 'sem mesa livre, não vai para o pufe');
  const cafe = reservarEstacao('p7', area, (e) => e.tipo === 'cafe');
  assert.equal(cafe?.tipo, 'cafe');
  assert.ok(ESTACOES.every((e) => !doQuadro(e)));
  tirarEstacoes();
});
