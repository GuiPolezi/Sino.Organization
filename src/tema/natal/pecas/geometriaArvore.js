/*
 * Conta da árvore de Natal, sem React nem DOM (roda nos testes em Node): as
 * camadas gordinhas com a borda ondulada, a saia de algodão, a estrela e onde
 * ficam as bolas e as luzinhas. Tudo no espaço da árvore (pé em y = 0, escala 1).
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARVORE } from './medidas.js';

// Onde começa o lado da camada, acima da borda de baixo (m).
const LABIO = 0.05;
// Ondulação da borda: quanto o dente sai para fora, quanto a ponta cai e até que fração da altura vai.
const ONDA = { raio: 0.08, queda: 0.04, ergue: 0.015, alcance: 0.4 };
// Giro de cada camada, para os dentes não ficarem alinhados.
const faseDa = (k) => k * 0.7;

const CORES_BOLAS = ['vermelho', 'ouro', 'creme', 'verdeAgua'];
// Bolas por camada, de baixo para cima (somam ARVORE.bolas.quantas).
const BOLAS_POR_CAMADA = [6, 5, 3, 2];

// Raio do lado da camada na fração s (0 = logo acima da borda, 1 = ponta); levemente convexo.
const raioLado = ({ r }, s) => r * 0.97 * (1 - s) ** 0.82;
const yLado = ({ h }, s) => -h / 2 + LABIO + s * (h - LABIO);

// Perfil do torno: por baixo (côncavo), a borda arredondada e o lado até a ponta.
function perfil(camada) {
  const { r, h } = camada;
  const baixo = [
    [0, -h / 2 + 0.06],
    [r * 0.5, -h / 2 + 0.04],
    [r * 0.85, -h / 2 + 0.012],
    [r * 0.97, -h / 2 + 0.005],
    [r, -h / 2 + 0.025],
    [r * 0.985, -h / 2 + 0.045],
  ];
  const lado = Array.from({ length: 9 }, (_, i) => {
    const s = 0.08 + i * 0.11;
    return [raioLado(camada, s), yLado(camada, s)];
  });
  return [...baixo, ...lado, [0, h / 2]].map(([x, y]) => new THREE.Vector2(x, y));
}

/**
 * Deforma um ponto da camada pela borda ondulada: os dentes saem e caem, os vãos sobem.
 * @returns {{ fator: number, dy: number }} multiplica o raio e soma no y
 */
function onda(camada, k, theta, y) {
  const t = (y + camada.h / 2) / camada.h;
  const w = Math.max(0, 1 - t / ONDA.alcance) ** 2;
  const f = Math.cos(camada.dentes * (theta + faseDa(k)));
  return { fator: 1 + ONDA.raio * w * f, dy: w * (-ONDA.queda * Math.max(f, 0) + ONDA.ergue * Math.max(-f, 0)) };
}

function geometriaDaCamada(camada, k) {
  const g = new THREE.LatheGeometry(perfil(camada), 28);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const { fator, dy } = onda(camada, k, Math.atan2(x, z), y);
    pos.setXYZ(i, x * fator, y + dy + camada.y, z * fator);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * As camadas de uma cor mescladas numa geometria (paridade 0: 1ª e 3ª; 1: 2ª e 4ª).
 * @param {0 | 1} paridade
 */
export function geometriaCamadas(paridade) {
  const partes = ARVORE.camadas.map(geometriaDaCamada).filter((_, k) => k % 2 === paridade);
  const unica = mergeGeometries(partes);
  partes.forEach((g) => g.dispose());
  return unica;
}

// Ponto na superfície da camada (com a onda), afastado `fora` metros para fora.
function naSuperficie(k, s, theta, fora) {
  const camada = ARVORE.camadas[k];
  const y = yLado(camada, s);
  const { fator, dy } = onda(camada, k, theta, y);
  const raio = raioLado(camada, s) * fator + fora;
  return [Math.sin(theta) * raio, camada.y + y + dy, Math.cos(theta) * raio];
}

/** Bolas penduradas nas pontas dos dentes: posição e cor de cada uma. */
export function pontosDasBolas() {
  const { raio } = ARVORE.bolas;
  return ARVORE.camadas.flatMap((camada, k) => {
    const quantas = BOLAS_POR_CAMADA[k];
    return Array.from({ length: quantas }, (_, j) => {
      // A ponta de um dente: cos(dentes·(θ + fase)) = 1.
      const dente = Math.round((j * camada.dentes) / quantas + k);
      const theta = (2 * Math.PI * dente) / camada.dentes - faseDa(k);
      const rPonta = camada.r * (1 + ONDA.raio) * 0.97;
      const y = camada.y - camada.h / 2 + 0.025 - ONDA.queda - raio * 0.7;
      return [Math.sin(theta) * rPonta, y, Math.cos(theta) * rPonta];
    });
  }).map((p, i) => ({ p, cor: CORES_BOLAS[i % CORES_BOLAS.length] }));
}

// Faixa visível do lado de cada camada (em s): da borda até onde a camada de cima a cobre.
function faixas() {
  const { camadas } = ARVORE;
  return camadas.map((camada, k) => {
    const acima = camadas[k + 1];
    if (!acima) return [0.1, 0.72];
    const bordaAcima = acima.y - acima.h / 2 - camada.y;
    return [0.1, (bordaAcima - yLado(camada, 0)) / (camada.h - LABIO) - 0.04];
  });
}

/** As luzinhas numa espiral de `voltas`, da base ao topo, sobre a parte visível de cada camada. */
export function pontosDasLuzes() {
  const { quantas, raio, voltas } = ARVORE.luzes;
  const lista = faixas();
  const comprimentos = lista.map(([a, b], k) => (b - a) * ARVORE.camadas[k].h);
  const total = comprimentos.reduce((a, b) => a + b, 0);
  return Array.from({ length: quantas }, (_, i) => {
    const u = (i + 0.5) / quantas;
    let resto = u * total;
    let k = 0;
    while (k < lista.length - 1 && resto > comprimentos[k]) resto -= comprimentos[k++];
    const [a, b] = lista[k];
    const s = a + (b - a) * (resto / comprimentos[k]);
    return naSuperficie(k, s, u * voltas * 2 * Math.PI, raio * 0.6);
  });
}

// Ruído leve e fixo, para o algodão e o pompom não ficarem lisos demais.
const ruido = (x, y, z) => Math.sin(3 * x + 1.7) * Math.sin(4 * y + 0.3) * Math.sin(3.5 * z + 2.1);

/** Bolota de algodão (raio 1), com calombos. */
export function geometriaAlgodao() {
  // Vértices unidos: as normais ficam lisas (o icosaedro vem com as faces soltas).
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, 2).deleteAttribute('normal').deleteAttribute('uv'));
  const pos = g.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + 0.1 * ruido(v.x, v.y, v.z));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** A saia: 7 bolotas achatadas e um anel de tufos fofos, quase tudo neve e um pouco de creme. */
export function instanciasDaSaia() {
  const { raio, altura } = ARVORE.saia;
  const meio = { p: [0, altura / 2, 0], s: [0.32, altura / 2, 0.32] };
  const roda = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3 + 0.26;
    const rb = 0.21;
    const d = raio - rb - 0.04;
    return { p: [Math.sin(a) * d, altura / 2, Math.cos(a) * d], s: [rb, altura / 2, rb * 0.92] };
  });
  const tufos = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 12 + 0.13;
    const t = 0.085 + 0.025 * ((i * 7) % 3) * 0.5;
    const d = raio - t;
    return { p: [Math.sin(a) * d, altura * 0.6, Math.cos(a) * d], s: [t, t * 0.7, t] };
  });
  return [meio, ...roda, ...tufos].map((b, i) => ({ ...b, cor: i % 3 === 2 ? 'creme' : 'neve' }));
}

/** Estrela de 5 pontas extrudada, centrada na origem e de frente para +z. */
export function geometriaEstrela() {
  const { raio, profundidade, bisel } = ARVORE.estrela;
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? raio * 0.46 : raio;
    if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  forma.closePath();
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: profundidade,
    bevelEnabled: true,
    bevelThickness: bisel,
    bevelSize: bisel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, -profundidade / 2);
  g.computeVertexNormals();
  return g;
}
