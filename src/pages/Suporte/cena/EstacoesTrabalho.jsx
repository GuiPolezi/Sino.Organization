import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ESTACOES } from '../boneco/estacoes.js';
import { clay } from '../boneco/geometrias.js';

const CORES = {
  madeira: '#DDBE98',
  estrutura: '#BCC0CA',
  escuro: '#3A3B46',
  teclado: '#ECECEF',
  cadeiras: ['#5B6F9E', '#6E8C7A', '#9A6F8E', '#5B6F9E'],
  telas: ['#C8B6FF', '#FFD59A', '#A9D8FF', '#9FE3C8'],
  canecas: ['#E58F8F', null, '#7FA7D9', null], // null = sem caneca
};

// Geometrias unitárias compartilhadas, escaladas por peça.
const G = {
  caixa: new THREE.BoxGeometry(1, 1, 1),
  arred: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
  cilindro: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
};

const criarMateriais = () => ({
  madeira: clay(CORES.madeira),
  estrutura: clay(CORES.estrutura),
  escuro: clay(CORES.escuro),
  teclado: clay(CORES.teclado),
  cadeiras: CORES.cadeiras.map(clay),
  telas: CORES.telas.map((cor) => new THREE.MeshBasicMaterial({ color: cor, toneMapped: false })),
  canecas: CORES.canecas.map((cor) => (cor ? clay(cor) : null)),
});

function Estacao({ estacao, indice, materiais: M }) {
  const cadeira = M.cadeiras[indice % M.cadeiras.length];
  const caneca = M.canecas[indice % M.canecas.length];

  return (
    <group position={[estacao.x, 0, estacao.z]} rotation-y={estacao.rot}>
      {/* Mesa */}
      <mesh geometry={G.arred} material={M.madeira} position={[0, 0.74, 0]} scale={[1.6, 0.06, 0.78]} />
      <mesh geometry={G.caixa} material={M.estrutura} position={[-0.74, 0.36, 0]} scale={[0.05, 0.72, 0.68]} />
      <mesh geometry={G.caixa} material={M.estrutura} position={[0.74, 0.36, 0]} scale={[0.05, 0.72, 0.68]} />

      {/* Monitor (tela voltada para +z local) */}
      <mesh geometry={G.arred} material={M.escuro} position={[0, 1.13, -0.16]} scale={[0.7, 0.43, 0.05]} />
      <mesh
        geometry={G.caixa}
        material={M.telas[indice % M.telas.length]}
        position={[0, 1.14, -0.13]}
        scale={[0.63, 0.36, 0.01]}
      />
      <mesh geometry={G.caixa} material={M.escuro} position={[0, 0.92, -0.19]} scale={[0.05, 0.3, 0.04]} />
      <mesh geometry={G.arred} material={M.escuro} position={[0, 0.78, -0.18]} scale={[0.26, 0.025, 0.18]} />

      {/* Teclado e mouse */}
      <mesh geometry={G.arred} material={M.teclado} position={[0, 0.78, 0.13]} scale={[0.46, 0.022, 0.15]} />
      <mesh geometry={G.arred} material={M.teclado} position={[0.38, 0.78, 0.15]} scale={[0.07, 0.022, 0.11]} />

      {caneca && (
        <mesh geometry={G.cilindro} material={caneca} position={[-0.6, 0.83, 0.12]} scale={[0.09, 0.11, 0.09]} />
      )}

      {/* Cadeira (lado +z local; encosto mais para fora) */}
      <group position={[0, 0, 0.78]}>
        <mesh geometry={G.arred} material={cadeira} position={[0, 0.5, 0]} scale={[0.52, 0.09, 0.5]} />
        <mesh geometry={G.arred} material={cadeira} position={[0, 0.86, 0.24]} scale={[0.5, 0.52, 0.08]} />
        <mesh geometry={G.cilindro} material={M.escuro} position={[0, 0.26, 0]} scale={[0.06, 0.46, 0.06]} />
        <mesh geometry={G.cilindro} material={M.escuro} position={[0, 0.03, 0]} scale={[0.46, 0.04, 0.46]} />
      </group>
    </group>
  );
}

/*
 * Desenha as estações de estacoes.js (mesa, monitor, teclado, mouse e cadeira).
 * Sem eventos de ponteiro: não bloqueia o clique nos técnicos, e clicar nelas
 * fecha o card como clicar no vazio.
 */
export default function EstacoesTrabalho() {
  // Materiais criados uma vez e compartilhados entre as estações.
  const materiais = useMemo(criarMateriais, []);
  useEffect(
    () => () =>
      Object.values(materiais)
        .flat()
        .forEach((material) => material?.dispose()),
    [materiais],
  );

  return (
    <group name="estacoes-de-trabalho">
      {ESTACOES.map((estacao, indice) => (
        <Estacao key={estacao.id} estacao={estacao} indice={indice} materiais={materiais} />
      ))}
    </group>
  );
}
