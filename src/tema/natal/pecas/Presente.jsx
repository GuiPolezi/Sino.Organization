/*
 * Presente de massinha: caixa arredondada, duas fitas cruzadas e um laço em
 * cima. Base em y = 0, laço de frente para +z. As geometrias ficam guardadas
 * por tamanho e são compartilhadas (nunca descartadas).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { materialNatal } from '../materiais.js';
import Laco from './Laco.jsx';
import { PRESENTES } from './medidas.js';

// A fita sobra um pouco da caixa, para não piscar com ela.
const SOBRA = 0.008;

const cache = new Map();
function geometriasDe(largura, altura, profundidade) {
  const chave = `${largura}|${altura}|${profundidade}`;
  if (cache.has(chave)) return cache.get(chave);
  const raio = Math.min(largura, altura, profundidade) * 0.12;
  const faixa = Math.min(largura, profundidade) * 0.16;
  const fitas = [
    new THREE.BoxGeometry(largura + SOBRA, altura + SOBRA, faixa),
    new THREE.BoxGeometry(faixa, altura + SOBRA, profundidade + SOBRA),
  ];
  const geometrias = {
    caixa: new RoundedBoxGeometry(largura, altura, profundidade, 3, raio).translate(0, altura / 2, 0),
    fita: mergeGeometries(fitas).translate(0, altura / 2, 0),
  };
  fitas.forEach((g) => g.dispose());
  cache.set(chave, geometrias);
  return geometrias;
}

/**
 * @param {object} props
 * @param {'A' | 'B' | 'C' | 'D'} [props.modelo] um dos quatro de medidas.js (as outras props mudam o que vier dele)
 * @param {number} [props.largura] em x (m)
 * @param {number} [props.altura] (m)
 * @param {number} [props.profundidade] em z (m)
 * @param {string} [props.cor] da caixa: chave da paleta ou hex
 * @param {string} [props.fita] da fita e do laço: chave da paleta ou hex
 */
export default function Presente({ modelo = 'A', largura, altura, profundidade, cor, fita, ...props }) {
  const base = PRESENTES[modelo] ?? PRESENTES.A;
  const l = largura ?? base.largura;
  const a = altura ?? base.altura;
  const p = profundidade ?? base.profundidade;
  const g = geometriasDe(l, a, p);
  const corFita = fita ?? base.fita;
  return (
    <group {...props}>
      <mesh geometry={g.caixa} material={materialNatal(cor ?? base.cor)} />
      <mesh geometry={g.fita} material={materialNatal(corFita)} />
      <Laco cor={corFita} escala={Math.min(l, p) * 0.62} position-y={a + 0.025} />
    </group>
  );
}
