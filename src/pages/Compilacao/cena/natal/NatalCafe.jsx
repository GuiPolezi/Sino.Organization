/*
 * O Natal da mesa do café (docs/tema-natal.md, 4.5), no espaço da mesa de
 * CantoDoCafe.jsx: um panetone entre o vaso e as xícaras e um raminho com laço
 * na alça da jarra da cafeteira. Parado: é enfeite de mesa.
 */
import * as THREE from 'three';
import { materialNatal } from '../../../../tema/natal/materiais.js';
import Laco from '../../../../tema/natal/pecas/Laco.jsx';

// Folga de ≥ 0,24 m até o vaso (−0,56; −0,18) e as xícaras (CantoDoCafe.jsx).
const PANETONE = { x: -0.3, z: -0.22, raio: 0.09, papel: 0.09, cupula: 0.095, achatado: 0.7 };
// A alça da jarra (cafeteira em (0,38; −0,12), girada −0,1), acima do tampo.
const ALCA = { x: 0.515, y: 0.21, z: -0.05, giro: -0.1 };
// Frutas cristalizadas na cúpula: ângulo, altura (0 = borda, 1 = topo) e cor.
const FRUTAS = [
  [0.3, 0.35, 'vermelho'],
  [1.6, 0.55, 'pinheiroClaro'],
  [2.9, 0.3, 'ouro'],
  [4.1, 0.6, 'vermelho'],
  [5.3, 0.4, 'pinheiroClaro'],
];
// O raminho: duas folhas de azevinho atrás do laço e três frutinhas.
const FOLHAS = [-0.55, 0.55];
const FRUTINHAS = [
  [-0.012, 0.012],
  [0.012, 0.014],
  [0, -0.006],
];

let G = null;
const geometrias = () =>
  (G ??= {
    // Forma de papel pregueada, aberta em cima (a cúpula cobre).
    papel: (() => {
      const g = new THREE.CylinderGeometry(PANETONE.raio, PANETONE.raio * 0.94, PANETONE.papel, 40, 1, true);
      const pos = g.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const prega = 1 + 0.045 * Math.cos(20 * Math.atan2(pos.getX(i), pos.getZ(i)));
        pos.setXYZ(i, pos.getX(i) * prega, pos.getY(i) + PANETONE.papel / 2, pos.getZ(i) * prega);
      }
      g.computeVertexNormals();
      return g;
    })(),
    fundo: new THREE.CircleGeometry(PANETONE.raio * 0.94, 24).rotateX(-Math.PI / 2),
    cupula: new THREE.SphereGeometry(PANETONE.cupula, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    fruta: new THREE.SphereGeometry(0.013, 8, 6),
    folha: new THREE.SphereGeometry(0.02, 10, 6),
    frutinha: new THREE.SphereGeometry(0.008, 8, 6),
  });

// Ponto da superfície da cúpula achatada, um pouco para fora.
function naCupula(angulo, alto) {
  const phi = (1 - alto) * (Math.PI / 2);
  const r = PANETONE.cupula * 1.02;
  return [Math.sin(phi) * Math.sin(angulo) * r, PANETONE.papel + Math.cos(phi) * r * PANETONE.achatado, Math.sin(phi) * Math.cos(angulo) * r];
}

function Panetone() {
  const g = geometrias();
  return (
    <group position={[PANETONE.x, 0, PANETONE.z]} rotation-y={0.4}>
      <mesh geometry={g.papel} material={materialNatal('panetonePapel')} />
      <mesh geometry={g.fundo} material={materialNatal('panetonePapel')} position-y={0.002} />
      <mesh geometry={g.cupula} material={materialNatal('panetone')} position-y={PANETONE.papel} scale={[1, PANETONE.achatado, 1]} />
      {FRUTAS.map(([angulo, alto, cor]) => (
        <mesh key={angulo} geometry={g.fruta} material={materialNatal(cor)} position={naCupula(angulo, alto)} />
      ))}
    </group>
  );
}

function Raminho() {
  const g = geometrias();
  return (
    <group position={[ALCA.x, ALCA.y, ALCA.z]} rotation-y={ALCA.giro}>
      {FOLHAS.map((giro) => (
        <mesh
          key={giro}
          geometry={g.folha}
          material={materialNatal('pinheiroClaro')}
          position={[Math.sin(giro) * 0.03, 0.012, -0.008]}
          rotation-z={-giro}
          scale={[0.7, 1.6, 0.35]}
        />
      ))}
      {FRUTINHAS.map(([x, y]) => (
        <mesh key={`${x},${y}`} geometry={g.frutinha} material={materialNatal('vermelho')} position={[x, y + 0.02, 0.006]} />
      ))}
      <Laco escala={0.1} position-z={0.012} />
    </group>
  );
}

/**
 * @param {{ altura: number }} props altura do tampo da mesa (planta.js, MESA_CAFE)
 */
export default function NatalCafe({ altura }) {
  return (
    <group name="natal:cafe" position-y={altura}>
      <Panetone />
      <Raminho />
    </group>
  );
}
