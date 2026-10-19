// Casos das seis mesas de /desenvolvimento: onde ficam e se dá para sentar nelas.
// Uso: npm run test:cenario
import assert from 'node:assert/strict';
import test from 'node:test';
import { ESTACOES, OBSTACULOS, definirEstacoes, dentroDaArea, reservarEstacao, rotaAte, tirarEstacoes } from '../../Suporte/boneco/estacoes.js';
import { configurarQuadro, corredorAberto, posicionarQuadro } from '../../Suporte/quadro/posicao.js';
import { CENA_DEV, CORREDOR_DEV, IDS_DO_BLOCO, basesDasMesas } from './estacoes.js';

// O tapete maior desta página.
const PAISAGEM = CENA_DEV.areaPaisagem;
const RETRATO = CENA_DEV.areaRetrato;
const porId = (id) => ESTACOES.find((estacao) => estacao.id === id);
const distancia = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// Os obstáculos do quadro (quadro/posicao.js) e os das mesas, que ele acrescenta à mesma lista.
const pegadaDoQuadro = () => OBSTACULOS.filter(({ estacao }) => estacao === 'quadro');
const pegadaDasMesas = () => OBSTACULOS.filter(({ estacao }) => estacao !== 'quadro' && estacao !== 'quadro-corredor');

// O quadro como a página o usa: corredor curto, em paisagem.
configurarQuadro({ corredorPaisagem: CORREDOR_DEV });

test('são seis mesas: duas soltas à esquerda e um bloco de quatro no meio, cada uma com a sua pegada', () => {
  const estacoes = definirEstacoes(basesDasMesas(false));
  assert.equal(estacoes.length, 6);
  assert.ok(porId('dev-fundo').x < -2 && porId('dev-fundo').z < 0, 'a solta do fundo fica à esquerda, atrás');
  assert.ok(porId('dev-frente').x < -2 && porId('dev-frente').z > 0, 'a solta da frente fica à esquerda, na frente');
  for (const id of IDS_DO_BLOCO) assert.equal(OBSTACULOS.filter(({ estacao }) => estacao === id).length, 3);

  // O bloco: duas lado a lado no fundo, de frente para a câmera, e duas na frente, de costas.
  const [b1, b2, b3, b4] = IDS_DO_BLOCO.map(porId);
  assert.equal(b1.z, b2.z);
  assert.equal(b3.z, b4.z);
  assert.ok(b1.z < b3.z && b1.x < b2.x && b3.x < b4.x);
  assert.equal(b1.rot, Math.PI);
  assert.equal(b3.rot, 0);
  tirarEstacoes();
});

test('nas duas formas do tapete, o ponto de chegada e o assento de cada mesa caem na área de caminhada', () => {
  for (const [retrato, area] of [[false, PAISAGEM], [true, RETRATO]]) {
    for (const estacao of definirEstacoes(basesDasMesas(retrato))) {
      assert.ok(dentroDaArea(area, estacao.aprox, 0.2), `${estacao.id} em ${retrato ? 'retrato' : 'paisagem'}`);
      assert.ok(dentroDaArea(area, estacao.assento), `assento de ${estacao.id}`);
    }
  }
  tirarEstacoes();
});

test('em paisagem, nenhuma mesa encosta no quadro', () => {
  definirEstacoes(basesDasMesas(false));
  posicionarQuadro(PAISAGEM, false);
  assert.equal(pegadaDoQuadro().length, 3);
  for (const obstaculo of pegadaDasMesas()) {
    for (const pe of pegadaDoQuadro()) assert.ok(distancia(obstaculo, pe) >= obstaculo.r + pe.r, `${obstaculo.estacao} encosta no quadro`);
  }
  tirarEstacoes();
});

test('nas duas orientações, a borda do corredor do quadro fica a 0,3 m de toda pegada e de todo ponto de chegada', () => {
  for (const [retrato, area] of [[false, PAISAGEM], [true, RETRATO]]) {
    const estacoes = definirEstacoes(basesDasMesas(retrato));
    posicionarQuadro(area, retrato);
    const corredor = corredorAberto();
    assert.equal(corredor.length, 2);
    corredor.forEach((trecho, i) => {
      const onde = `trecho ${i} em ${retrato ? 'retrato' : 'paisagem'}`;
      for (const o of pegadaDasMesas()) assert.ok(distancia(trecho, o) >= trecho.r + o.r + 0.3 - 1e-9, `${onde} invade ${o.estacao}`);
      for (const estacao of estacoes) assert.ok(distancia(trecho, estacao.aprox) >= trecho.r + 0.3 - 1e-9, `${onde} cobre a chegada de ${estacao.id}`);
      // Em paisagem o corredor configurado já cabe inteiro: a rede de segurança não precisa encolhê-lo.
      if (!retrato) assert.equal(trecho.r, CORREDOR_DEV[i].rMax, `${onde} foi encolhido`);
    });
  }
  posicionarQuadro(PAISAGEM, false);
  tirarEstacoes();
});

test('os seis computadores podem ser reservados, um por pessoa', () => {
  definirEstacoes(basesDasMesas(false));
  const reservas = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => reservarEstacao(id, PAISAGEM));
  assert.ok(reservas.every(Boolean));
  assert.equal(new Set(reservas.map(({ id }) => id)).size, 6);
  assert.equal(reservarEstacao('g', PAISAGEM), null);
  tirarEstacoes();
});

test('cada mesa solta é um bloco próprio e o 2×2 é um só: quem cruza um dá a volta nele', () => {
  const fundo = definirEstacoes(basesDasMesas(false)).find(({ id }) => id === 'dev-fundo');
  const atras = { x: fundo.x, z: fundo.z - 2 };
  const naFrente = { x: fundo.x, z: fundo.z + 2.6 };
  const rota = rotaAte(atras, naFrente);
  assert.notDeepEqual(rota.ponto, naFrente, 'mira um canto do bloco da mesa');
  assert.ok(rota.comprimento > 4.6);

  // Atravessar o bloco central pelo meio também contorna.
  const [b1] = IDS_DO_BLOCO.map(porId);
  const atravessa = rotaAte({ x: b1.x + 0.8, z: -3 }, { x: b1.x + 0.8, z: 3 });
  assert.notDeepEqual(atravessa.ponto, { x: b1.x + 0.8, z: 3 });

  // Longe das mesas, o caminho é reto.
  assert.deepEqual(rotaAte({ x: 5, z: 1 }, { x: 5, z: 3 }), { ponto: { x: 5, z: 3 }, comprimento: 2 });
  tirarEstacoes();
});

test('um canto da mesa solta recortado para dentro da própria pegada não é mirado; os cantos ficam longe dos outros obstáculos', () => {
  definirEstacoes(basesDasMesas(false));
  posicionarQuadro(PAISAGEM, false);
  const fundo = porId('dev-fundo');
  // No tapete da página o canto de trás-esquerda cabe na área; num tapete mais apertado ele cai fora
  // da elipse, e o recorte para dentro dela o joga em cima da mesa: aí ele não pode ser mirado.
  const APERTADO = { rx: 7.6, rz: 4.2 };
  const semArea = rotaAte({ x: fundo.x, z: fundo.z - 2 }, { x: fundo.x, z: fundo.z + 2.6 });
  assert.ok(rotaAte({ x: fundo.x, z: fundo.z - 2 }, { x: fundo.x, z: fundo.z + 2.6 }, PAISAGEM).ponto.x < fundo.x, 'no tapete da página, pela esquerda');
  const comArea = rotaAte({ x: fundo.x, z: fundo.z - 2 }, { x: fundo.x, z: fundo.z + 2.6 }, APERTADO);
  assert.ok(semArea.ponto.x < fundo.x, 'sem área, dá a volta pela esquerda (mais curto)');
  assert.ok(comArea.ponto.x > fundo.x, 'no tapete apertado, o canto da esquerda cai na mesa e a volta é pela direita');
  for (const o of OBSTACULOS) {
    if (o.estacao === 'dev-fundo' || o.r <= 0) continue;
    assert.ok(distancia(comArea.ponto, o) >= o.r + 0.3, `canto em cima de ${o.estacao}`);
  }

  // O canto traseiro-direito do bloco fica perto do pé do quadro: é afastado dele até 0,4 m da pegada.
  const [b1] = IDS_DO_BLOCO.map(porId);
  const pelaDireita = rotaAte({ x: 4.5, z: -0.5 }, { x: b1.x - 0.7, z: -2.6 }, PAISAGEM);
  assert.ok(pelaDireita.canto !== undefined, 'mira um canto do bloco');
  assert.ok(pelaDireita.ponto.x > 2 && pelaDireita.ponto.z < -1.78, 'o canto traseiro-direito');
  for (const pe of pegadaDoQuadro()) assert.ok(distancia(pelaDireita.ponto, pe) >= pe.r + 0.4 - 1e-9, 'canto em cima do quadro');
  tirarEstacoes();
});
