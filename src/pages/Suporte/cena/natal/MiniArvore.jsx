/*
 * Mini árvore de mesa (0,3 m): vasinho creme, três cones de pinheiro, três
 * bolinhas vermelhas e uma estrela dourada. Sem luz. Pé em y = 0. Cada cor é
 * uma geometria mesclada: 4 draw calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materialNatal } from '../../../../tema/natal/materiais.js';

// Cones: raio, altura e y da base.
const CONES = [
  [0.08, 0.12, 0.035],
  [0.062, 0.1, 0.105],
  [0.044, 0.105, 0.17],
];
// Bolinhas: cone, fração da altura e ângulo (espalhadas em volta).
const BOLINHAS = [
  [0, 0.3, 0.5],
  [1, 0.35, 2.3],
  [0, 0.35, 4.1],
];
const RAIO_BOLINHA = 0.011;
const Y_ESTRELA = 0.295;

function estrela(raio) {
  const forma = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? raio * 0.45 : raio;
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) forma.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else forma.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: raio * 0.35, bevelEnabled: true, bevelThickness: raio * 0.12, bevelSize: raio * 0.1, bevelSegments: 2 });
  return g.translate(0, 0, -raio * 0.175);
}

const unir = (partes) => {
  const unica = mergeGeometries(partes);
  partes.forEach((parte) => parte.dispose());
  return unica;
};

// Na superfície do cone, a `fracao` da altura, um pouco para fora.
function bolinha([cone, fracao, angulo]) {
  const [r, h, base] = CONES[cone];
  const raio = r * (1 - fracao) + RAIO_BOLINHA * 0.6;
  return new THREE.SphereGeometry(RAIO_BOLINHA, 10, 8).translate(Math.sin(angulo) * raio, base + h * fracao, Math.cos(angulo) * raio);
}

// Criadas na 1ª mini árvore e compartilhadas.
let G = null;
const geometrias = () =>
  (G ??= {
    vaso: new THREE.CylinderGeometry(0.045, 0.036, 0.04, 16).translate(0, 0.02, 0),
    cones: unir(CONES.map(([r, h, base]) => new THREE.ConeGeometry(r, h, 10, 1).translate(0, base + h / 2, 0))),
    bolinhas: unir(BOLINHAS.map(bolinha)),
    estrela: estrela(0.03).translate(0, Y_ESTRELA, 0),
  });

export default function MiniArvore(props) {
  const g = geometrias();
  return (
    <group {...props}>
      <mesh geometry={g.vaso} material={materialNatal('creme')} />
      <mesh geometry={g.cones} material={materialNatal('pinheiro')} />
      <mesh geometry={g.bolinhas} material={materialNatal('vermelho')} />
      <mesh geometry={g.estrela} material={materialNatal('ouro', 'ouro')} />
    </group>
  );
}
