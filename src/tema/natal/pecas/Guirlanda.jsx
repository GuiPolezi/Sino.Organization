/*
 * Guirlanda de porta: aro de pinheiro, 18 folhas gordas por cima, 6 bolas
 * (vermelho e ouro) e um laço embaixo. No plano XY, olhando para +z, com o
 * centro na origem. Feita com 0,55 m de diâmetro e escalada por `diametro`.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { materialNatal } from '../materiais.js';
import Laco from './Laco.jsx';

const DIAMETRO_BASE = 0.55;
const RAIO_ARO = 0.2;
const FOLHAS = 18;
// Ângulos das bolas (graus): o topo fica para a fita e o fundo para o laço.
const BOLAS = [15, 62, 118, 165, 215, 325];

const m4 = () => new THREE.Matrix4();

// Folha: esfera achatada deitada na tangente do aro, alternando por dentro e por fora.
function folha(esfera, i) {
  const a = (i * Math.PI * 2) / FOLHAS;
  const raio = RAIO_ARO + (i % 2 ? 0.035 : -0.03);
  const matriz = m4()
    .makeTranslation(Math.cos(a) * raio, Math.sin(a) * raio, 0.03 + (i % 3) * 0.006)
    .multiply(m4().makeRotationZ(a + Math.PI / 2 + (i % 2 ? 0.35 : -0.35)))
    .multiply(m4().makeRotationX(i % 2 ? 0.3 : -0.3))
    .multiply(m4().makeScale(0.07, 0.032, 0.018));
  return esfera.clone().applyMatrix4(matriz);
}

function bolas(esfera, paridade) {
  return BOLAS.filter((_, i) => i % 2 === paridade).map((graus) => {
    const a = (graus * Math.PI) / 180;
    return esfera.clone().scale(0.032, 0.032, 0.032).translate(Math.cos(a) * RAIO_ARO, Math.sin(a) * RAIO_ARO, 0.05);
  });
}

const unir = (partes) => {
  const unica = mergeGeometries(partes);
  partes.forEach((parte) => parte.dispose());
  return unica;
};

// Geometrias criadas na 1ª guirlanda e compartilhadas.
let G = null;
const geometrias = () => {
  if (G) return G;
  const esfera = new THREE.SphereGeometry(1, 12, 8);
  G = {
    aro: new THREE.TorusGeometry(RAIO_ARO, 0.05, 10, 40),
    folhas: unir(Array.from({ length: FOLHAS }, (_, i) => folha(esfera, i))),
    vermelhas: unir(bolas(esfera, 0)),
    douradas: unir(bolas(esfera, 1)),
  };
  esfera.dispose();
  return G;
};

/**
 * @param {object} props
 * @param {number} [props.diametro] diâmetro total (m)
 * @param {string} [props.corLaco] chave da paleta ou hex
 */
export default function Guirlanda({ diametro = DIAMETRO_BASE, corLaco = 'vermelho', ...props }) {
  const g = geometrias();
  return (
    <group {...props}>
      <group scale={diametro / DIAMETRO_BASE}>
        <mesh geometry={g.aro} material={materialNatal('pinheiro')} />
        <mesh geometry={g.folhas} material={materialNatal('pinheiroClaro')} />
        <mesh geometry={g.vermelhas} material={materialNatal('vermelho')} />
        <mesh geometry={g.douradas} material={materialNatal('ouro', 'ouro')} />
        <Laco cor={corLaco} escala={0.2} pontas={0.12} position={[0, -RAIO_ARO, 0.06]} />
      </group>
    </group>
  );
}
