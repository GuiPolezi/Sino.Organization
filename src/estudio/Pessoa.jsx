/*
 * Um boneco posado para as ilustrações da home: a mesma Figura das cenas, parada
 * numa pose escolhida (em pé, acenando, sentado, cabeça virada). Sem
 * comportamento, sem clique e sem etiqueta. Só existe no estúdio (dev).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { APARENCIAS_COMPILACAO } from '../pages/Compilacao/equipe.js';
import { APARENCIAS_DEV } from '../pages/Desenvolvimento/aparencias.js';
import { aparenciaDe, registrarAparencias } from '../pages/Suporte/boneco/aparencia.js';
import { Figura, useMateriais } from '../pages/Suporte/boneco/Boneco.jsx';
import { BOCHECHA, BRANCO, ESCURO, LOGO } from '../pages/Suporte/boneco/geometrias.js';

// O suporte já vem registrado; desenvolvimento e compilação entram aqui.
registrarAparencias(APARENCIAS_DEV);
registrarAparencias(APARENCIAS_COMPILACAO);

// Mesmos números do comportamento sentado (useComportamento.js).
const PERNA_SENTADO = -1.5;
const ELEVACAO_CADEIRA = 0.17;
// Braço esquerdo erguido, espelho do aceno da Figura.
const ACENO_ESQUERDO = -2.55;

/**
 * @param {object} props
 * @param {string} props.id
 * @param {[number, number, number]} [props.posicao]
 * @param {number} [props.giro] rotação em y (0 = de frente para +z)
 * @param {number} [props.escala] multiplica a altura da aparência
 * @param {boolean} [props.aceno] braço direito erguido (a pose do retrato)
 * @param {boolean} [props.acenoEsquerdo] braço esquerdo erguido
 * @param {boolean} [props.sentado]
 * @param {number} [props.elevacao] subida do corpo sentado
 * @param {number} [props.cabeca] giro da cabeça em y
 * @param {number} [props.bracos] abre os dois braços (rad), para quem está de mãos na cintura ou relaxado
 */
export default function Pessoa({
  id,
  posicao = [0, 0, 0],
  giro = 0,
  escala = 1,
  aceno = false,
  acenoEsquerdo = false,
  sentado = false,
  elevacao = ELEVACAO_CADEIRA,
  cabeca = 0,
  bracos = 0,
}) {
  const aparencia = useMemo(() => aparenciaDe(id), [id]);
  const materiais = useMateriais(aparencia);
  const corpo = useRef(null);
  const cabecaRef = useRef(null);
  const pernaE = useRef(null);
  const pernaD = useRef(null);
  const bracoE = useRef(null);
  const bracoD = useRef(null);
  const partes = useMemo(
    () => ({ corpo, cabeca: cabecaRef, pernaE, pernaD, bracoE, bracoD }),
    [],
  );

  useLayoutEffect(() => {
    const perna = sentado ? PERNA_SENTADO : 0;
    pernaE.current.rotation.x = perna;
    pernaD.current.rotation.x = perna;
    corpo.current.position.y = sentado ? elevacao : 0;
    cabecaRef.current.rotation.y = cabeca;
    bracoE.current.rotation.z = acenoEsquerdo ? ACENO_ESQUERDO : -bracos;
    if (!aceno) bracoD.current.rotation.z = bracos;
  });

  return (
    <group position={posicao} rotation-y={giro} scale={(aparencia.altura ?? 1) * escala}>
      <Figura id={id} aparencia={aparencia} materiais={materiais} partes={partes} aceno={aceno} />
    </group>
  );
}

/*
 * Silhueta: tudo o que está dentro vira um preto quase puro, com um contorno de
 * luz fria nas bordas (fresnel). Os materiais das peças são compartilhados com
 * as outras cenas, então cada malha só troca de material, sem mexer no original.
 * Troca a cada quadro: assim pega também o que montar depois (o gorro).
 */
function criarSilhueta() {
  const material = new THREE.MeshStandardMaterial({ color: '#1A1D24', roughness: 0.95, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float aro = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.5);
      outgoingLight += vec3(0.34, 0.4, 0.5) * aro;
      #include <opaque_fragment>`,
    );
  };
  return material;
}

// Detalhes do rosto e do peito (olhos, brilho, bochecha, óculos, logo): somem na silhueta.
const DETALHES = new Set([BOCHECHA, BRANCO, ESCURO, LOGO]);

export function Silhueta({ children }) {
  const grupo = useRef(null);
  const material = useMemo(criarSilhueta, []);
  useFrame(() => {
    grupo.current?.traverse((objeto) => {
      if (!objeto.isMesh || objeto.material === material) return;
      if (DETALHES.has(objeto.material)) objeto.visible = false;
      else objeto.material = material;
    });
  });
  return <group ref={grupo}>{children}</group>;
}
