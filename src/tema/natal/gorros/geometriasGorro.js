/*
 * Geometrias dos gorros (docs/tema-natal.md, 5.2). JS puro com three: roda nos
 * testes em Node. Nada nasce ao importar; quem guarda o cache é montagem.js.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const chaveDe = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;

/**
 * Normais suaves também nas costuras: vértices repetidos na mesma posição
 * (a emenda do cone e do toro) ficam com a média das normais.
 * @param {THREE.BufferGeometry} geometria
 */
export function soldarNormais(geometria) {
  geometria.computeVertexNormals();
  const pos = geometria.attributes.position;
  const nor = geometria.attributes.normal;
  const grupos = new Map();
  for (let i = 0; i < pos.count; i++) {
    const chave = chaveDe(pos.getX(i), pos.getY(i), pos.getZ(i));
    grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
  }
  const soma = new THREE.Vector3();
  grupos.forEach((indices) => {
    if (indices.length < 2) return;
    soma.set(0, 0, 0);
    indices.forEach((i) => soma.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i))));
    soma.normalize();
    indices.forEach((i) => nor.setXYZ(i, soma.x, soma.y, soma.z));
  });
  nor.needsUpdate = true;
  return geometria;
}

// Passos da integração do eixo dobrado.
const PASSOS = 48;

/*
 * Dobra de um ponto do cone (5.2), num plano vertical que contém `dir`. O eixo
 * sobe reto até `inicio` e depois gira até `curva` rad na ponta. O giro cresce
 * como s^suave: pouco embaixo, onde o cone é largo, e muito perto da ponta.
 * Assim o lado de dentro não se dobra sobre si mesmo. Com suave = 1 é a dobra
 * de raio constante do plano: u' = R − (R − u)·cos θ, y' = (R − u)·sin θ.
 * A fatia de cada altura fica perpendicular ao eixo. Depois de t = 0,7, a
 * `queda` puxa para baixo.
 */
function dobrar(x, y, z, { altura, curva, dx, dz, inicio, queda, suave }) {
  const t = y / altura;
  const u = x * dx + z * dz;
  const w = -x * dz + z * dx;
  const y0 = inicio * altura;
  const giro = (s) => (s <= y0 ? 0 : curva * ((s - y0) / (altura - y0)) ** suave);
  // Eixo: integral de (sin θ, cos θ) de 0 até y (regra do ponto médio).
  let cu = 0;
  let cy = 0;
  const passo = y / PASSOS;
  for (let i = 0; i < PASSOS; i++) {
    const theta = giro((i + 0.5) * passo);
    cu += Math.sin(theta) * passo;
    cy += Math.cos(theta) * passo;
  }
  const theta = giro(y);
  let u2 = cu + u * Math.cos(theta);
  let y2 = cy - u * Math.sin(theta);
  if (t > 0.7) y2 -= queda * (t - 0.7) ** 2;
  return [u2 * dx - w * dz, y2, u2 * dz + w * dx];
}

// Faixa de transição (m) do apoio na cabeça: sem ela, o pano dobra em dentes.
const MACIO = 0.03;

/*
 * Apoia na cabeça o ponto que entraria nela: a distância ao centro vira um
 * "máximo suave" entre ela e o raio (raio + MACIO·e^(x−1), com x a folga em
 * MACIO), igual à de antes a partir de raio + MACIO. Embaixo, perto da aba, o
 * efeito entra aos poucos a partir de `desde`, medido na altura do cone ainda
 * reto (`y`): o lado de dentro da dobra, que desce, continua apoiado.
 */
function apoiar(ponto, cabeca, y) {
  if (!cabeca) return ponto;
  const peso = Math.min(1, Math.max(0, (y - cabeca.desde) / MACIO));
  const d = ponto.map((v, i) => v - cabeca.centro[i]);
  const distancia = Math.hypot(...d);
  const folga = (distancia - cabeca.raio) / MACIO;
  if (peso === 0 || folga >= 1 || distancia < 1e-6) return ponto;
  const apoiada = cabeca.raio + MACIO * Math.exp(folga - 1);
  const nova = distancia + (apoiada - distancia) * peso;
  return d.map((v, i) => cabeca.centro[i] + (v * nova) / distancia);
}

const normal2 = ([a, b]) => {
  const n = Math.hypot(a, b) || 1;
  return [a / n, b / n];
};

/**
 * Cone mole e curvo, com a base em y = 0. `perfil` > 1 deixa o cone mais
 * cheio embaixo (raio = base·(1 − t^perfil)), como um pano com a cabeça dentro;
 * `suave` é o expoente do giro ao longo do eixo (ver dobrar). Com `cabeca`
 * ({ centro, raio, desde }), o pano que cairia para dentro dela se apoia na
 * superfície, como um gorro mole de verdade.
 * @returns {{ geometria: THREE.BufferGeometry, ponta: THREE.Vector3, tangente: THREE.Vector3 }}
 */
export function coneCurvo({
  raioBase,
  altura,
  curva = 0,
  dir = [1, 0],
  queda = 0,
  perfil = 1,
  raioPonta = 0,
  inicio = 0,
  suave = 1.6,
  cabeca = null,
  radiais = 20,
  aneis = 12,
}) {
  const geometria = new THREE.CylinderGeometry(raioPonta, raioBase, altura, radiais, aneis, true);
  geometria.translate(0, altura / 2, 0);
  const [dx, dz] = normal2(dir);
  const opcoes = { altura, curva, dx, dz, inicio, queda, suave };
  const pos = geometria.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    // Preso em 0..1: um −0 de arredondamento daria NaN na potência.
    const t = Math.min(1, Math.max(0, pos.getY(i) / altura));
    const linear = raioPonta + (raioBase - raioPonta) * (1 - t);
    const cheio = raioPonta + (raioBase - raioPonta) * (1 - t ** perfil);
    const s = linear > 1e-6 ? cheio / linear : 1;
    const y = pos.getY(i);
    pos.setXYZ(i, ...apoiar(dobrar(pos.getX(i) * s, y, pos.getZ(i) * s, opcoes), cabeca, y));
  }
  soldarNormais(geometria);
  const ponta = new THREE.Vector3(...apoiar(dobrar(0, altura, 0, opcoes), cabeca, altura));
  const antes = new THREE.Vector3(...apoiar(dobrar(0, altura * 0.97, 0, opcoes), cabeca, altura * 0.97));
  return { geometria, ponta, tangente: ponta.clone().sub(antes).normalize() };
}

/**
 * Aba de pelúcia: toro deitado (no plano XZ) com o deslocamento "fofo"
 * 1 + 0,07·sin(9θ)·sin(5φ) no tubo (2.2).
 */
export function abaFofa(raio, tubo) {
  const geometria = new THREE.TorusGeometry(raio, tubo, 10, 32);
  const pos = geometria.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const theta = Math.atan2(y, x);
    const [cx, cy] = [raio * Math.cos(theta), raio * Math.sin(theta)];
    const [ox, oy] = [x - cx, y - cy];
    const phi = Math.atan2(z, ox * Math.cos(theta) + oy * Math.sin(theta));
    const k = 1 + 0.07 * Math.sin(9 * theta) * Math.sin(5 * phi);
    pos.setXYZ(i, cx + ox * k, cy + oy * k, z * k);
  }
  geometria.rotateX(-Math.PI / 2);
  return soldarNormais(geometria);
}

// Ruído suave e fixo na esfera (sem aleatório: o mesmo pompom em toda carga).
const ruido = (x, y, z) =>
  0.6 * Math.sin(x * 7.1 + 1.3) * Math.sin(y * 6.3 + 0.7) * Math.sin(z * 8.2 + 2.1) +
  0.4 * Math.sin(x * 13.7 + 0.4) * Math.sin(y * 11.9 + 2.6) * Math.sin(z * 12.3 + 1.1);

/** Pompom: icosaedro de detalhe 2, com normais suaves e um ruído leve de pelúcia. */
export function pompom(raio) {
  const bruto = new THREE.IcosahedronGeometry(1, 2);
  bruto.deleteAttribute('normal');
  bruto.deleteAttribute('uv');
  const geometria = mergeVertices(bruto);
  bruto.dispose();
  const pos = geometria.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    v.multiplyScalar(raio * (1 + 0.07 * ruido(v.x, v.y, v.z)));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometria.computeVertexNormals();
  return geometria;
}

/** Sino do elfo: perfil de sino girado (boca para baixo, em y = 0) e a alcinha no topo. */
export function sino(raio) {
  const perfil = [
    [0.72, 0.1],
    [1, 0],
    [0.97, 0.14],
    [0.78, 0.36],
    [0.66, 0.6],
    [0.6, 0.8],
    [0.42, 0.96],
    [0, 1.02],
  ].map(([r, y]) => new THREE.Vector2(r * raio, y * raio * 1.7));
  return {
    corpo: soldarNormais(new THREE.LatheGeometry(perfil, 18)),
    badalo: new THREE.SphereGeometry(raio * 0.32, 10, 8).translate(0, raio * 0.05, 0),
    alca: new THREE.TorusGeometry(raio * 0.28, raio * 0.09, 6, 14).translate(0, raio * 1.95, 0),
    altura: raio * 1.95,
  };
}

/** Rabo pendurado do gorro caído: cápsula que afina, presa pelo topo (y = 0) e caindo para −y. */
export function rabo({ raioTopo, raioBase, comprimento }) {
  const perfil = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    perfil.push(new THREE.Vector2(raioBase * Math.sin(a), -comprimento - raioBase * Math.cos(a)));
  }
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI / 2 - (i / 6) * (Math.PI / 2);
    perfil.push(new THREE.Vector2(raioTopo * Math.sin(a), raioTopo * Math.cos(a)));
  }
  return soldarNormais(new THREE.LatheGeometry(perfil, 16));
}

/**
 * Ponta da gola do elfo: uma gota de massinha, redonda em cima e afinando para
 * baixo (ponta em y = −1, topo em y ≈ 0,45). A escala dá largura, altura e espessura.
 */
export function petala() {
  const perfil = [
    [0, -1],
    [0.16, -0.86],
    [0.38, -0.6],
    [0.56, -0.3],
    [0.62, 0],
    [0.52, 0.27],
    [0.3, 0.42],
    [0, 0.47],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return soldarNormais(new THREE.LatheGeometry(perfil, 14));
}

/**
 * Cúpula do gorro de tricô: meia esfera achatada, base em y = 0. Na meia esfera
 * do three, o `v` da UV já vai de 0 (base) a 1 (topo).
 */
export function cupula(raio, achatar) {
  const geometria = new THREE.SphereGeometry(raio, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  geometria.scale(1, achatar, 1);
  return soldarNormais(geometria);
}

/** Barra dobrada do tricô: um anel gordo de perfil arredondado, centrado em y = 0. */
export function barra(raio, altura) {
  const meia = altura / 2;
  const perfil = [
    [-0.02, -meia * 0.9],
    [0, -meia],
    [0.016, -meia * 0.72],
    [0.022, 0],
    [0.016, meia * 0.72],
    [0, meia],
    [-0.02, meia * 0.9],
  ].map(([dr, y]) => new THREE.Vector2(raio + dr, y));
  return soldarNormais(new THREE.LatheGeometry(perfil, 36));
}

/** A marca da casa: o disquinho e o círculo do logo, de frente para +z. */
export function marca(raio) {
  return {
    disco: new THREE.CylinderGeometry(raio, raio, 0.018, 24).rotateX(Math.PI / 2),
    logo: new THREE.CircleGeometry(raio * 0.78, 24),
  };
}
