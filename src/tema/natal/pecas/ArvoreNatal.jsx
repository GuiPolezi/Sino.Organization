/*
 * Árvore de Natal de massinha (docs/tema-natal.md, 4.1): saia de algodão,
 * tronco, quatro camadas gordinhas com a borda ondulada, bolas e luzinhas
 * instanciadas, a estrela dourada e uma luz quente. Geometrias e materiais
 * nascem na 1ª árvore e são compartilhados (nunca descartados).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clay } from '../../../pages/Suporte/boneco/geometrias.js';
import { materialNatal } from '../materiais.js';
import { movimentoReduzido } from '../movimento.js';
import { corNatal } from '../paleta.js';
import {
  geometriaAlgodao,
  geometriaCamadas,
  geometriaEstrela,
  instanciasDaSaia,
  pontosDasBolas,
  pontosDasLuzes,
} from './geometriaArvore.js';
import Luzinhas from './Luzinhas.jsx';
import { ARVORE } from './medidas.js';

const EMISSIVO_ESTRELA = 0.6;

let G = null;
const geometrias = () =>
  (G ??= {
    escura: geometriaCamadas(0),
    clara: geometriaCamadas(1),
    tronco: new THREE.CylinderGeometry(ARVORE.tronco.raio, ARVORE.tronco.raio * 1.15, ARVORE.tronco.altura, 12),
    estrela: geometriaEstrela(),
    algodao: geometriaAlgodao(),
    bola: new THREE.SphereGeometry(ARVORE.bolas.raio, 14, 10),
  });

// Ouro com brilho próprio: é da árvore, porque o "respirar" da estrela mexe nele.
let ouroEstrela = null;
const materialEstrela = () =>
  (ouroEstrela ??= Object.assign(clay(corNatal('ouro')), {
    roughness: 0.4,
    metalness: 0.15,
    emissive: new THREE.Color(corNatal('ouroBrilho')),
    emissiveIntensity: EMISSIVO_ESTRELA,
  }));

// Uma InstancedMesh com a cor posta na criação (three.js #21786).
function instanciar(geometria, material, itens) {
  const malha = new THREE.InstancedMesh(geometria, material, itens.length);
  const objeto = new THREE.Object3D();
  const cor = new THREE.Color();
  itens.forEach(({ p, s = [1, 1, 1], cor: chave }, i) => {
    objeto.position.set(...p);
    objeto.scale.set(...s);
    objeto.updateMatrix();
    malha.setMatrixAt(i, objeto.matrix);
    malha.setColorAt(i, cor.set(corNatal(chave)));
  });
  malha.instanceMatrix.needsUpdate = true;
  malha.instanceColor.needsUpdate = true;
  malha.computeBoundingSphere();
  return malha;
}

// As peças instanciadas: compartilham geometria e material, então só a malha é da árvore.
function usePecas() {
  const g = geometrias();
  const pecas = useMemo(
    () => ({
      saia: instanciar(g.algodao, materialNatal('#FFFFFF', 'pelucia'), instanciasDaSaia()),
      bolas: instanciar(g.bola, materialNatal('#FFFFFF', 'ouro'), pontosDasBolas()),
      luzes: pontosDasLuzes(),
    }),
    [g],
  );
  useEffect(
    () => () => {
      pecas.saia.dispose();
      pecas.bolas.dispose();
    },
    [pecas],
  );
  return pecas;
}

/**
 * @param {object} props
 * @param {number} [props.escala] 1 = 2,05 m de altura
 * @param {number} [props.luzAcesa] multiplica a intensidade da luz quente (0 apaga)
 * @param {boolean} [props.semLuz] sem a pointLight (fixo por cena: não alterne depois de montar)
 */
export default function ArvoreNatal({ escala = 1, luzAcesa = 1, semLuz = false, ...props }) {
  const g = geometrias();
  const pecas = usePecas();
  const estrela = useRef(null);
  const { luz } = ARVORE;

  useFrame(({ clock }) => {
    const parado = movimentoReduzido();
    const t = parado ? 0 : clock.elapsedTime;
    // Gira devagar e "respira" ±10%; parada, fica de frente para a câmera.
    estrela.current.rotation.y = t * 0.25;
    materialEstrela().emissiveIntensity = EMISSIVO_ESTRELA * (1 + 0.1 * Math.sin(t * 1.1));
  });

  return (
    <group name="natal:arvore" {...props}>
      <group scale={escala}>
        <primitive object={pecas.saia} />
        <mesh geometry={g.tronco} material={materialNatal('madeira')} position-y={ARVORE.tronco.altura / 2} />
        <mesh geometry={g.escura} material={materialNatal('pinheiro')} />
        <mesh geometry={g.clara} material={materialNatal('pinheiroClaro')} />
        <primitive object={pecas.bolas} />
        <Luzinhas pontos={pecas.luzes} raio={ARVORE.luzes.raio} />
        <mesh ref={estrela} geometry={g.estrela} material={materialEstrela()} position-y={ARVORE.estrela.y} />
        {!semLuz && (
          <pointLight
            color={corNatal('luzArvore')}
            position={luz.posicao}
            distance={luz.distancia}
            decay={1.6}
            intensity={luz.intensidade * luzAcesa}
          />
        )}
      </group>
    </group>
  );
}
