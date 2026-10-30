/*
 * O cantinho do café de /compilacao, no estilo massinha das outras cenas: a mesa
 * de madeira com a cafeteira (e a jarra com café), as xícaras e o vaso de flores,
 * e os pufes de descanso (as formas do pufe da sala de reunião). Sem eventos de
 * ponteiro: clicar neles fecha o card, como clicar no vazio.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FORMA_PUFE } from '../../Reuniao/cena/planta.js';
import { MOVIMENTO } from '../../Suporte/store.js';
import { MESA_CAFE } from './planta.js';

const G = {
  caixa: new THREE.BoxGeometry(1, 1, 1),
  arred: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new THREE.CylinderGeometry(0.32, 0.5, 1, 20),
  esfera: new THREE.SphereGeometry(0.5, 20, 14),
  asa: new THREE.TorusGeometry(0.03, 0.01, 8, 14),
};

const fosco = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
const vidro = (color, opacity) =>
  new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.1, depthWrite: false });

function criarMateriais(coresPufe) {
  return {
    madeira: fosco('#B9773F'),
    madeiraEscura: fosco('#8E5530'),
    preto: fosco('#2E2F36', 0.55),
    metal: fosco('#B8BCC6', 0.4),
    luz: new THREE.MeshBasicMaterial({ color: '#FF5A4E', toneMapped: false }),
    jarra: vidro('#E6F2F7', 0.42),
    cafe: fosco('#4A2C1C', 0.35),
    xicaras: ['#E25656', '#2E9C93', '#F4F1EA', '#F2B632'].map((cor) => fosco(cor, 0.6)),
    pires: fosco('#F4F1EA', 0.6),
    vaso: vidro('#7FA7D9', 0.6),
    agua: vidro('#A9D8FF', 0.35),
    caule: fosco('#4E8A4A'),
    folha: fosco('#6DAA5C'),
    flores: ['#F4A6C1', '#E77FA6', '#F7C6D9'].map((cor) => fosco(cor, 0.7)),
    miolo: fosco('#F2C46D'),
    vapor: new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.45, depthWrite: false }),
    pufes: Object.fromEntries(
      coresPufe.map((cor) => [cor, { base: fosco(cor, 0.9), dobra: fosco(new THREE.Color(cor).multiplyScalar(0.78), 0.95) }]),
    ),
  };
}

const todosOsMateriais = (M) => [
  ...Object.values(M).filter((m) => m instanceof THREE.Material),
  ...M.xicaras,
  ...M.flores,
  ...Object.values(M.pufes).flatMap(({ base, dobra }) => [base, dobra]),
];

const PERNAS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

function Mesa({ M }) {
  const { largura, profundidade, altura } = MESA_CAFE;
  return (
    <>
      <mesh geometry={G.arred} material={M.madeira} position-y={altura - 0.04} scale={[largura, 0.08, profundidade]} />
      <mesh geometry={G.caixa} material={M.madeiraEscura} position-y={altura - 0.13} scale={[largura - 0.16, 0.1, profundidade - 0.16]} />
      {PERNAS.map(([sx, sz], i) => (
        <mesh
          key={i}
          geometry={G.caixa}
          material={M.madeiraEscura}
          position={[sx * (largura / 2 - 0.1), (altura - 0.08) / 2, sz * (profundidade / 2 - 0.1)]}
          scale={[0.11, altura - 0.08, 0.11]}
        />
      ))}
    </>
  );
}

// Cafeteira de jarra: base e coluna pretas, a tampa por cima, a jarra de vidro com café e a luz vermelha.
function Cafeteira({ M, vapor }) {
  return (
    <group>
      <mesh geometry={G.arred} material={M.preto} position-y={0.03} scale={[0.34, 0.06, 0.3]} />
      <mesh geometry={G.arred} material={M.preto} position={[0, 0.24, -0.1]} scale={[0.32, 0.46, 0.12]} />
      <mesh geometry={G.arred} material={M.preto} position={[0, 0.5, -0.02]} scale={[0.34, 0.1, 0.28]} />
      <mesh geometry={G.arred} material={M.metal} position={[0, 0.44, 0.02]} scale={[0.22, 0.05, 0.2]} />
      <mesh geometry={G.esfera} material={M.luz} position={[0.11, 0.08, 0.15]} scale={0.03} />
      {/* A jarra: vidro por fora, café até a metade, e a alça. */}
      <mesh geometry={G.cil} material={M.cafe} position={[0, 0.13, 0.04]} scale={[0.18, 0.11, 0.18]} />
      <mesh geometry={G.cone} material={M.jarra} position={[0, 0.17, 0.04]} rotation-x={Math.PI} scale={[0.22, 0.24, 0.22]} />
      <mesh geometry={G.arred} material={M.preto} position={[0.14, 0.18, 0.04]} scale={[0.04, 0.16, 0.04]} />
      {vapor.map((ref, i) => (
        <mesh key={i} ref={ref} geometry={G.esfera} material={M.vapor} position={[0, 0.6, 0]} scale={0.05} />
      ))}
    </group>
  );
}

function XicaraNaMesa({ material, M, posicao, giro = 0 }) {
  return (
    <group position={posicao} rotation-y={giro}>
      <mesh geometry={G.cil} material={M.pires} position-y={0.008} scale={[0.15, 0.016, 0.15]} />
      <mesh geometry={G.cone} material={material} position-y={0.06} rotation-x={Math.PI} scale={[0.12, 0.09, 0.12]} />
      <mesh geometry={G.asa} material={material} position={[0.07, 0.06, 0]} />
    </group>
  );
}

// Vaso de vidro azul com hastes e flores cor-de-rosa.
const FLORES = [
  [0, 0.42, 0, 0],
  [-0.07, 0.37, 0.04, 1],
  [0.07, 0.38, -0.03, 2],
  [0.03, 0.34, 0.08, 1],
  [-0.04, 0.4, -0.07, 0],
];

function Vaso({ M }) {
  return (
    <group>
      <mesh geometry={G.cone} material={M.vaso} position-y={0.11} rotation-x={Math.PI} scale={[0.13, 0.22, 0.13]} />
      <mesh geometry={G.cil} material={M.agua} position-y={0.07} scale={[0.09, 0.12, 0.09]} />
      {FLORES.map(([x, y, z, cor], i) => (
        <group key={i}>
          <mesh geometry={G.cil} material={M.caule} position={[x / 2, (0.18 + y) / 2, z / 2]} rotation={[Math.atan2(z, y - 0.18), 0, -Math.atan2(x, y - 0.18)]} scale={[0.012, Math.hypot(x, y - 0.18, z), 0.012]} />
          {/* Cinco pétalas em volta do miolo. */}
          {[0, 1, 2, 3, 4].map((p) => (
            <mesh
              key={p}
              geometry={G.esfera}
              material={M.flores[cor]}
              position={[x + Math.cos((p * 2 * Math.PI) / 5) * 0.028, y, z + Math.sin((p * 2 * Math.PI) / 5) * 0.028]}
              scale={[0.04, 0.025, 0.04]}
            />
          ))}
          <mesh geometry={G.esfera} material={M.miolo} position={[x, y + 0.008, z]} scale={0.025} />
        </group>
      ))}
      <mesh geometry={G.esfera} material={M.folha} position={[0.05, 0.27, 0.02]} rotation-z={-0.6} scale={[0.07, 0.025, 0.035]} />
      <mesh geometry={G.esfera} material={M.folha} position={[-0.05, 0.25, -0.01]} rotation-z={0.6} scale={[0.07, 0.025, 0.035]} />
    </group>
  );
}

// Um elipsoide de FORMA_PUFE (G.esfera tem raio 0,5: a escala é o dobro do raio).
function Elipsoide({ e, material }) {
  return <mesh geometry={G.esfera} material={material} position={[0, e.y, e.z]} scale={[e.rx * 2, e.ry * 2, e.rz * 2]} />;
}

// Virado para onde quem senta olha (rot); no 'alto', o encosto fica atrás.
function Pufe({ pufe, M }) {
  const mat = M.pufes[pufe.cor];
  const { estofado, dobra } = FORMA_PUFE[pufe.forma];
  return (
    <group position={[pufe.x, 0, pufe.z]} rotation-y={pufe.rot}>
      <Elipsoide e={estofado} material={mat.base} />
      {pufe.forma === 'alto' && (
        <mesh geometry={G.esfera} material={mat.base} position={[0, 0.78, -0.2]} rotation-x={-0.35} scale={[0.95, 1.05, 0.55]} />
      )}
      <Elipsoide e={dobra} material={mat.dobra} />
    </group>
  );
}

// Vapor da cafeteira: três bolinhas subindo devagar e sumindo.
function useVapor() {
  const refs = [useRef(null), useRef(null), useRef(null)];
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.forEach((ref, i) => {
      const bolha = ref.current;
      if (!bolha) return;
      bolha.visible = !MOVIMENTO.reduzido;
      const ciclo = (t * 0.35 + i / 3) % 1;
      bolha.position.set(Math.sin(t * 1.3 + i * 2) * 0.03, 0.58 + ciclo * 0.42, -0.02);
      bolha.scale.setScalar(0.04 + ciclo * 0.07);
    });
  });
  return refs;
}

/**
 * @param {object} props
 * @param {{ x: number, z: number, rot: number }} props.cafe  a mesa do café (planta.js)
 * @param {{ id: string, x: number, z: number, rot: number, cor: string, forma: 'baixo' | 'alto' }[]} props.pufes
 */
export default function CantoDoCafe({ cafe, pufes }) {
  const coresPufe = useMemo(() => [...new Set(pufes.map(({ cor }) => cor))], [pufes]);
  const M = useMemo(() => criarMateriais(coresPufe), [coresPufe]);
  useEffect(() => () => todosOsMateriais(M).forEach((material) => material.dispose()), [M]);
  const vapor = useVapor();
  const { altura } = MESA_CAFE;

  return (
    <group name="canto-do-cafe">
      <group position={[cafe.x, 0, cafe.z]} rotation-y={cafe.rot}>
        <Mesa M={M} />
        {/* A cafeteira na frente do lugar da direita; as xícaras na frente do da esquerda. */}
        <group position={[0.38, altura, -0.12]} rotation-y={-0.1}>
          <Cafeteira M={M} vapor={vapor} />
        </group>
        <XicaraNaMesa material={M.xicaras[0]} M={M} posicao={[-0.2, altura, 0.12]} giro={0.4} />
        <XicaraNaMesa material={M.xicaras[1]} M={M} posicao={[-0.42, altura, 0.2]} giro={-0.3} />
        <XicaraNaMesa material={M.xicaras[2]} M={M} posicao={[-0.08, altura, -0.12]} giro={1.2} />
        <XicaraNaMesa material={M.xicaras[3]} M={M} posicao={[0.05, altura, 0.22]} giro={2.6} />
        <group position={[-0.56, altura, -0.18]}>
          <Vaso M={M} />
        </group>
      </group>

      {pufes.map((pufe) => (
        <Pufe key={pufe.id} pufe={pufe} M={M} />
      ))}
    </group>
  );
}
