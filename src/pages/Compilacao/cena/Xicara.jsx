import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clay } from '../../Suporte/boneco/geometrias.js';
import { MOVIMENTO, passoDoFrame } from '../../Suporte/store.js';
import { DURACAO_GOLE } from './cafe.js';

const { damp } = THREE.MathUtils;

// Peças da xícara, criadas uma vez para todos os bonecos (a página inteira usa as mesmas).
const G = {
  corpo: new THREE.CylinderGeometry(0.075, 0.062, 0.12, 20),
  asa: new THREE.TorusGeometry(0.035, 0.012, 8, 16),
  cafe: new THREE.CircleGeometry(0.066, 20),
  vapor: new THREE.SphereGeometry(0.03, 10, 8),
};
export const CORES_XICARA = ['#F4F1EA', '#E58F8F', '#7FA7D9', '#F2C46D', '#8CC7A1'];
const MATERIAIS = CORES_XICARA.map(clay);
const CAFE = new THREE.MeshStandardMaterial({ color: '#4A2C1C', roughness: 0.35 });
const VAPOR = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5, depthWrite: false });

function hash(texto) {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Inclinação da xícara no meio do gole: sobe e desce junto com o braço.
const INCLINACAO_GOLE = -0.75;
const giroBraco = new THREE.Quaternion();
const giroGole = new THREE.Quaternion();
const EIXO_X = new THREE.Vector3(1, 0, 0);

/**
 * A xícara na mão direita (EXTRA.NaMao, em Suporte/boneco/useComportamento.js).
 * Aparece crescendo quando o boneco a pega na cafeteira e some ao devolver;
 * fica sempre em pé, desfazendo o giro do braço, e inclina para a boca no gole.
 * Com café, solta um fio de vapor. Tudo mutado em useFrame.
 *
 * @param {{ ia: { current: object }, bracoD: { current: THREE.Object3D } }} props
 */
export default function Xicara({ ia, bracoD }) {
  const grupo = useRef(null);
  const vapor = useRef([]);
  const superficie = useRef(null);
  const material = MATERIAIS[hash(ia.current.id) % MATERIAIS.length];

  useFrame((state, delta) => {
    const dt = passoDoFrame(delta);
    const s = ia.current;
    const g = grupo.current;
    const escala = damp(g.scale.x, s.xicara ? 1 : 0, 12, dt);
    g.scale.setScalar(escala);
    g.visible = escala > 0.02;
    if (!g.visible) return;

    // Em pé no corpo: o contrário do giro do braço. No gole, inclina na direção da boca.
    giroBraco.setFromEuler(bracoD.current.rotation).invert();
    const fase = s.bebendo > 0 ? Math.sin(Math.PI * (1 - s.bebendo / DURACAO_GOLE)) : 0;
    giroGole.setFromAxisAngle(EIXO_X, INCLINACAO_GOLE * fase);
    g.quaternion.copy(giroBraco).multiply(giroGole);

    // Vapor: duas bolinhas subindo e sumindo, desencontradas, só com café na xícara.
    superficie.current.visible = s.goles > 0;
    const comCafe = s.goles > 0 && !MOVIMENTO.reduzido;
    const t = state.clock.elapsedTime;
    vapor.current.forEach((bolha, i) => {
      if (!bolha) return;
      const ciclo = (t * 0.7 + i * 0.5) % 1;
      bolha.visible = comCafe && fase === 0;
      bolha.position.set(Math.sin(t * 2 + i * 3) * 0.02, 0.1 + ciclo * 0.22, 0);
      bolha.scale.setScalar(0.6 + ciclo * 0.9);
    });
  });

  return (
    <group ref={grupo} scale={0} visible={false}>
      {/* Um pouco à frente da mão, que segura a xícara pela lateral. */}
      <group position={[0, 0.04, 0.07]}>
        <mesh geometry={G.corpo} material={material} />
        <mesh geometry={G.asa} material={material} position={[0.08, 0, 0]} />
        <mesh ref={superficie} geometry={G.cafe} material={CAFE} position-y={0.05} rotation-x={-Math.PI / 2} />
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(bolha) => {
              vapor.current[i] = bolha;
            }}
            geometry={G.vapor}
            material={VAPOR}
            visible={false}
          />
        ))}
      </group>
    </group>
  );
}
