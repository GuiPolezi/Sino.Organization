/*
 * Laço gordo de massinha: duas alças (toros achatados), o nó no meio e, se
 * pedido, as duas pontas da fita caindo. Na escala 1 tem 1 m de largura, então
 * `escala` é a largura em metros. Olha para +z.
 */
import * as THREE from 'three';
import { materialNatal } from '../materiais.js';

// Geometrias unitárias, criadas no 1º laço e compartilhadas por todos.
let G = null;
const geometrias = () =>
  (G ??= {
    alca: new THREE.TorusGeometry(0.2, 0.085, 10, 24),
    no: new THREE.SphereGeometry(0.11, 14, 10),
    // Ponta da fita com 1 m, presa pelo topo (y = 0) e caindo para −y.
    ponta: new THREE.BoxGeometry(0.13, 1, 0.035).translate(0, -0.5, 0),
  });

// Alças erguidas para fora, como num laço de presente.
const ALCAS = [
  { lado: -1, giro: -0.35 },
  { lado: 1, giro: 0.35 },
];

/**
 * @param {object} props
 * @param {string} [props.cor] chave da paleta ou hex (padrão 'vermelho')
 * @param {number} [props.escala] largura do laço (m)
 * @param {number} [props.pontas] quanto as pontas da fita caem abaixo do nó, em metros já na escala final (0 = sem pontas)
 */
export default function Laco({ cor = 'vermelho', escala = 1, pontas = 0, ...props }) {
  const g = geometrias();
  const material = materialNatal(cor);
  const comprimento = pontas / escala;
  return (
    <group {...props}>
      <group scale={escala}>
        {ALCAS.map(({ lado, giro }) => (
          <mesh
            key={lado}
            geometry={g.alca}
            material={material}
            position={[lado * 0.24, 0.02, 0]}
            rotation-z={giro}
            scale={[1, 0.62, 0.5]}
          />
        ))}
        <mesh geometry={g.no} material={material} position-z={0.02} scale={[1, 0.9, 0.75]} />
        {comprimento > 0 &&
          ALCAS.map(({ lado }) => (
            <mesh
              key={`ponta${lado}`}
              geometry={g.ponta}
              material={material}
              position={[lado * 0.05, -0.04, -0.01]}
              rotation-z={lado * 0.35}
              scale-y={comprimento}
            />
          ))}
      </group>
    </group>
  );
}
