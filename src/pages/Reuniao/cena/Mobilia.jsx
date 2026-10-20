/*
 * Móveis da sala: a mesa com os objetos em cima, as cadeiras e os pufes ATIVOS
 * (conforme os membros, lugares.js) e a luminária de pé, que acende no
 * entardecer e à noite. Sem eventos de ponteiro: clicar neles fecha o card,
 * como clicar no vazio.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pontoLocal } from '../../Suporte/boneco/estacoes.js';
import { G, fosco, useDescartar } from './comum.js';
import { FORMA_PUFE, LUGARES_MESA, LUMINARIA, MESA, POLTRONAS } from './planta.js';

const CORES_PUFE = [...new Set(POLTRONAS.map(({ cor }) => cor))];

const criarMateriais = () => ({
  madeira: fosco('#C98B56'),
  madeiraEscura: fosco('#9A6338'),
  jarra: new THREE.MeshStandardMaterial({ color: '#E6F7FF', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }),
  agua: fosco('#8ED3F0', 0.3),
  xicara: [fosco('#F2F2F2'), fosco('#E58F8F'), fosco('#7FA7D9')],
  notebook: fosco('#B9C0CC', 0.5),
  tela: new THREE.MeshBasicMaterial({ color: '#A9D8FF', toneMapped: false }),
  papel: fosco('#FFF6C7'),
  metal: fosco('#4A4E5A', 0.5),
  cupula: new THREE.MeshStandardMaterial({ color: '#FFE2B0', roughness: 0.7, emissive: '#FFC473', emissiveIntensity: 0 }),
  // Pufes: base e dobra (um pouco mais escura) por cor.
  pufe: Object.fromEntries(
    CORES_PUFE.map((cor) => [cor, { base: fosco(cor, 0.9), dobra: fosco(new THREE.Color(cor).multiplyScalar(0.78), 0.95) }]),
  ),
});

const descartaveis = (M) => ({ ...M, pufe: Object.values(M.pufe).flatMap(({ base, dobra }) => [base, dobra]) });

function Cadeira({ M }) {
  return (
    <group>
      <mesh geometry={G.arred} material={M.madeira} position-y={0.47} scale={[0.5, 0.06, 0.46]} />
      {[[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]].map(([x, z], i) => (
        <mesh key={i} geometry={G.caixa} material={M.madeiraEscura} position={[x, 0.23, z]} scale={[0.05, 0.46, 0.05]} />
      ))}
      {/* Encosto de três ripas, do lado de fora (+z). */}
      {[-1, 1].map((l) => (
        <mesh key={l} geometry={G.caixa} material={M.madeiraEscura} position={[l * 0.21, 0.74, 0.2]} scale={[0.05, 0.56, 0.05]} />
      ))}
      <mesh geometry={G.arred} material={M.madeira} position={[0, 0.98, 0.2]} scale={[0.52, 0.1, 0.06]} />
      {[-0.1, 0, 0.1].map((x) => (
        <mesh key={x} geometry={G.caixa} material={M.madeira} position={[x, 0.72, 0.2]} scale={[0.045, 0.4, 0.03]} />
      ))}
    </group>
  );
}

const XICARAS = [[-0.85, -0.25, 0], [0.35, 0.3, 1], [0.95, -0.15, 2]];
// Notebooks virados para os lugares do fundo e da frente.
const NOTEBOOKS = [[0.6, -0.3, Math.PI], [-0.6, 0.3, 0]];
const PERNAS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

function Mesa({ M }) {
  const { x, z, comp, larg, altura } = MESA;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={G.arred} material={M.madeira} position-y={altura - 0.04} scale={[comp, 0.08, larg]} />
      <mesh geometry={G.caixa} material={M.madeiraEscura} position-y={altura - 0.13} scale={[comp - 0.2, 0.1, larg - 0.2]} />
      {PERNAS.map(([sx, sz], i) => (
        <mesh
          key={i}
          geometry={G.cone}
          material={M.madeiraEscura}
          position={[sx * (comp / 2 - 0.16), (altura - 0.08) / 2, sz * (larg / 2 - 0.14)]}
          rotation-x={Math.PI}
          scale={[0.1, altura - 0.08, 0.1]}
        />
      ))}
      {/* Jarra com água, xícaras, notebooks e bloco de notas. */}
      <mesh geometry={G.cil} material={M.jarra} position={[0, altura + 0.14, 0]} scale={[0.16, 0.28, 0.16]} />
      <mesh geometry={G.cil} material={M.agua} position={[0, altura + 0.1, 0]} scale={[0.13, 0.18, 0.13]} />
      {XICARAS.map(([mx, mz, c], i) => (
        <group key={i} position={[mx, altura, mz]}>
          <mesh geometry={G.cil} material={M.xicara[c]} position-y={0.05} scale={[0.09, 0.1, 0.09]} />
          <mesh geometry={G.esfera} material={M.xicara[c]} position={[0.055, 0.06, 0]} scale={[0.04, 0.05, 0.02]} />
        </group>
      ))}
      {NOTEBOOKS.map(([nx, nz, r], i) => (
        <group key={i} position={[nx, altura, nz]} rotation-y={r}>
          <mesh geometry={G.arred} material={M.notebook} position-y={0.015} scale={[0.42, 0.03, 0.3]} />
          <group position={[0, 0.03, -0.15]} rotation-x={-0.35}>
            <mesh geometry={G.arred} material={M.notebook} position-y={0.14} scale={[0.42, 0.28, 0.025]} />
            <mesh geometry={G.plano} material={M.tela} position={[0, 0.14, 0.014]} scale={[0.36, 0.22, 1]} />
          </group>
        </group>
      ))}
      <mesh geometry={G.arred} material={M.papel} position={[-0.25, altura + 0.01, 0.32]} rotation-y={0.2} scale={[0.22, 0.02, 0.3]} />
    </group>
  );
}

// Um elipsoide de FORMA_PUFE (G.esfera tem raio 0,5: a escala é o dobro do raio).
function Elipsoide({ e, material }) {
  return <mesh geometry={G.esfera} material={material} position={[0, e.y, e.z]} scale={[e.rx * 2, e.ry * 2, e.rz * 2]} />;
}

// Virado para a mesa (rot); no 'alto', o encosto fica atrás de quem senta.
function Pufe({ p, M }) {
  const mat = M.pufe[p.cor];
  const { estofado, dobra } = FORMA_PUFE[p.forma];
  return (
    <group position={[p.x, 0, p.z]} rotation-y={p.rot}>
      <Elipsoide e={estofado} material={mat.base} />
      {p.forma === 'alto' && (
        <mesh geometry={G.esfera} material={mat.base} position={[0, 0.78, -0.2]} rotation-x={-0.35} scale={[0.95, 1.05, 0.55]} />
      )}
      <Elipsoide e={dobra} material={mat.dobra} />
    </group>
  );
}

// Intensidade da luz quente com a luminária acesa.
const LUZ_ACESA = 7;

function Luminaria({ M, acesa }) {
  const luz = useRef(null);
  useFrame((_, dt) => {
    const atual = luz.current;
    atual.intensity = THREE.MathUtils.damp(atual.intensity, acesa ? LUZ_ACESA : 0, 3, Math.min(dt, 0.05));
    M.cupula.emissiveIntensity = (atual.intensity / LUZ_ACESA) * 1.1;
  });
  return (
    <group position={[LUMINARIA.x, 0, LUMINARIA.z]}>
      <mesh geometry={G.cil} material={M.metal} position-y={0.03} scale={[0.5, 0.06, 0.5]} />
      <mesh geometry={G.cil} material={M.metal} position-y={0.9} scale={[0.05, 1.75, 0.05]} />
      <mesh geometry={G.cone} material={M.cupula} position-y={1.85} scale={[0.6, 0.45, 0.6]} />
      <pointLight ref={luz} color="#FFC98A" intensity={0} distance={11} decay={1.4} position={[0, 1.6, 0.2]} />
    </group>
  );
}

/**
 * @param {object} props
 * @param {{ cadeiras: string[], poltronas: string[] }} props.plano lugares ativos (montarLugares)
 * @param {boolean} props.luminariaAcesa
 */
export default function Mobilia({ plano, luminariaAcesa }) {
  const M = useMemo(criarMateriais, []);
  useDescartar(useMemo(() => descartaveis(M), [M]));

  // Cada cadeira um pouco para fora da borda da mesa, virada para ela.
  const cadeiras = useMemo(
    () =>
      plano.cadeiras.map((id) => {
        const lugar = LUGARES_MESA[id];
        return { id, ...pontoLocal(lugar, 0, 0.72), rot: lugar.rot };
      }),
    [plano.cadeiras],
  );
  const pufes = useMemo(() => POLTRONAS.filter(({ id }) => plano.poltronas.includes(id)), [plano.poltronas]);

  return (
    <group name="mobilia">
      <Mesa M={M} />
      {cadeiras.map((c) => (
        <group key={c.id} position={[c.x, 0, c.z]} rotation-y={c.rot}>
          <Cadeira M={M} />
        </group>
      ))}
      {pufes.map((p) => (
        <Pufe key={p.id} p={p} M={M} />
      ))}
      <Luminaria M={M} acesa={luminariaAcesa} />
    </group>
  );
}
