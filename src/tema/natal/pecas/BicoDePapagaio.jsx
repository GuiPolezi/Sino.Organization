/*
 * Bico-de-papagaio (poinsétia) num vasinho: vaso creme, folhas verdes por baixo,
 * brácteas vermelhas em roseta e o miolo dourado. Tem 0,2 m de diâmetro, pé em
 * y = 0. Cada cor é uma geometria mesclada: 4 draw calls por vaso.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materialNatal } from '../materiais.js';

const m4 = () => new THREE.Matrix4();

// Pétala: esfera unitária esticada em x, girada para fora e erguida (`ergue`) a partir do centro.
function petala(esfera, { angulo, comprimento, largura, ergue, y }) {
  const matriz = m4()
    .makeTranslation(0, y, 0)
    .multiply(m4().makeRotationY(angulo))
    .multiply(m4().makeRotationZ(ergue))
    .multiply(m4().makeTranslation(comprimento, 0, 0))
    .multiply(m4().makeScale(comprimento, 0.012, largura));
  return esfera.clone().applyMatrix4(matriz);
}

function roseta(esfera, n, giro, medidas) {
  return Array.from({ length: n }, (_, i) => petala(esfera, { ...medidas, angulo: giro + (i * Math.PI * 2) / n }));
}

const unir = (partes) => {
  const unica = mergeGeometries(partes);
  partes.forEach((parte) => parte.dispose());
  return unica;
};

// Geometrias criadas no 1º vaso e compartilhadas por todos.
let G = null;
const geometrias = () => {
  if (G) return G;
  const esfera = new THREE.SphereGeometry(1, 12, 8);
  G = {
    vaso: unir([
      new THREE.CylinderGeometry(0.06, 0.046, 0.08, 18).translate(0, 0.04, 0),
      new THREE.CylinderGeometry(0.066, 0.066, 0.018, 18).translate(0, 0.077, 0),
    ]),
    folhas: unir(roseta(esfera, 5, 0.3, { comprimento: 0.056, largura: 0.026, ergue: -0.12, y: 0.088 })),
    bracteas: unir([
      ...roseta(esfera, 6, 0, { comprimento: 0.05, largura: 0.024, ergue: 0.22, y: 0.098 }),
      ...roseta(esfera, 5, 0.6, { comprimento: 0.032, largura: 0.017, ergue: 0.5, y: 0.106 }),
    ]),
    miolo: unir(
      Array.from({ length: 5 }, (_, i) => {
        const a = (i * Math.PI * 2) / 5;
        return new THREE.SphereGeometry(0.009, 8, 6).translate(Math.cos(a) * 0.01, 0.118, Math.sin(a) * 0.01);
      }),
    ),
  };
  esfera.dispose();
  return G;
};

/** Poinsétia de mesa. Repassa position, rotation, scale… para o grupo de fora. */
export default function BicoDePapagaio(props) {
  const g = geometrias();
  return (
    <group {...props}>
      <mesh geometry={g.vaso} material={materialNatal('creme')} />
      <mesh geometry={g.folhas} material={materialNatal('pinheiroClaro')} />
      <mesh geometry={g.bracteas} material={materialNatal('vermelho', 'veludo')} />
      <mesh geometry={g.miolo} material={materialNatal('ouro', 'ouro')} />
    </group>
  );
}
