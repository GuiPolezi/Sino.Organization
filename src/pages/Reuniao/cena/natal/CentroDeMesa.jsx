/*
 * Centro de mesa da reunião: raminho de pinheiro deitado, três bolas e uma
 * vela com a chama tremulando ±5% (parada com movimento reduzido). Raio
 * 0,15 m, pé em y = 0 (o tampo).
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { naCamadaBrilho, useHabilitarBrilho } from '../../../../tema/natal/camadas.js';
import { materialNatal } from '../../../../tema/natal/materiais.js';
import { movimentoReduzido } from '../../../../tema/natal/movimento.js';

// Ramos: giro em y e deslocamento (m), deitados no tampo.
const RAMOS = [
  [-0.5, -0.03, 0.02],
  [0.15, 0.0, -0.01],
  [0.75, 0.03, 0.03],
];
const BOLAS = [
  ['vermelho', 'massinha', [0.07, 0.035, 0.05]],
  ['ouro', 'ouro', [-0.06, 0.035, 0.07]],
  ['creme', 'massinha', [0.1, 0.035, -0.06]],
];
const VELA = { x: -0.04, z: -0.05, raio: 0.028, altura: 0.11 };

function criar() {
  const ramos = RAMOS.map(([giro, dx, dz]) =>
    new THREE.CapsuleGeometry(0.018, 0.16, 4, 8).rotateZ(Math.PI / 2).rotateY(giro).translate(dx, 0.018, dz),
  );
  const geometria = {
    ramos: mergeGeometries(ramos),
    bola: new THREE.SphereGeometry(0.035, 14, 10),
    vela: new THREE.CylinderGeometry(VELA.raio, VELA.raio, VELA.altura, 14).translate(0, VELA.altura / 2, 0),
    chama: new THREE.SphereGeometry(1, 10, 8),
  };
  ramos.forEach((ramo) => ramo.dispose());
  return geometria;
}

// Criadas no 1º centro de mesa e compartilhadas.
let G = null;

function Chama() {
  useHabilitarBrilho();
  const chama = useRef(null);
  // Fora da camada 0: não vira mancha nas sombras de contato.
  useLayoutEffect(() => {
    naCamadaBrilho(chama.current);
  }, []);
  useFrame(({ clock }) => {
    const t = movimentoReduzido() ? 0 : clock.elapsedTime;
    const s = 1 + 0.05 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1);
    chama.current.scale.set(0.016, 0.034 * s, 0.016);
  });
  return (
    <mesh
      ref={chama}
      geometry={G.chama}
      material={materialNatal('luzQuente', 'brilho')}
      position={[VELA.x, VELA.altura + 0.03, VELA.z]}
      scale={[0.016, 0.034, 0.016]}
    />
  );
}

export default function CentroDeMesa(props) {
  G ??= criar();
  return (
    <group {...props}>
      <mesh geometry={G.ramos} material={materialNatal('pinheiro')} />
      {BOLAS.map(([cor, acabamento, posicao]) => (
        <mesh key={cor} geometry={G.bola} material={materialNatal(cor, acabamento)} position={posicao} />
      ))}
      <mesh geometry={G.vela} material={materialNatal('creme')} position={[VELA.x, 0, VELA.z]} />
      <Chama />
    </group>
  );
}
