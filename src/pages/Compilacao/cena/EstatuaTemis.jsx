import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import { CONFIG_QUADRO, QUADRO, atualizarObstaculos, posicionarQuadro, removerQuadro } from '../../Suporte/quadro/posicao.js';
import { novaTextura } from '../../Suporte/quadro/texturas.js';
import { MOVIMENTO, passoDoFrame, useEquipe } from '../../Suporte/store.js';
import styles from '../../Suporte/quadro/Quadro.module.css';
import { useResumo } from '../useResumo.js';
import { texturaFolhaTemis } from './folha.js';

const OURO = '#FFC23D';
const { damp } = THREE.MathUtils;

/*
 * Medidas (m) no espaço da estátua, de frente para +z. O pedestal vai até BASE;
 * dali sobe a figura. A mão erguida segura uma haste com a folha pendurada
 * (no lugar da balança da Têmis de sempre); a outra apoia a espada no pedestal.
 */
const BASE = 0.42;
const TOPO = 2.72;
const FOLHA = { largura: 1.0, altura: 1.3, x: 1.22, y: 2.56, z: 0.16 };
const OMBRO = { e: [-0.33, 1.98, 0], d: [0.33, 1.98, 0] };
const COTOVELO = { e: [-0.43, 1.62, 0.06], d: [0.6, 2.12, 0.08] };
const MAO = { e: [-0.46, 1.34, 0.2], d: [0.66, 2.48, 0.12] };
const PONTA_ESPADA = [-0.6, BASE + 0.03, 0.34];
const HASTE = { de: [0.66, 2.38, 0.12], ate: [0.66, 2.7, 0.12] };
const BARRA = { de: [0.62, 2.62, FOLHA.z - 0.04], ate: [FOLHA.x + FOLHA.largura / 2 + 0.06, 2.62, FOLHA.z - 0.04] };

// O manto: um torno do pé até a cintura, com pregas que somem perto da cintura.
function criarManto() {
  const perfil = [
    [0.47, 0],
    [0.49, 0.05],
    [0.46, 0.2],
    [0.41, 0.45],
    [0.35, 0.75],
    [0.3, 1.0],
    [0.28, 1.1],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const geometria = new THREE.LatheGeometry(perfil, 72);
  const posicoes = geometria.attributes.position;
  for (let i = 0; i < posicoes.count; i++) {
    const x = posicoes.getX(i);
    const z = posicoes.getZ(i);
    const prega = 1 + 0.075 * (1 - (posicoes.getY(i) / 1.1) * 0.75) * Math.sin(Math.atan2(z, x) * 9);
    posicoes.setX(i, x * prega);
    posicoes.setZ(i, z * prega);
  }
  geometria.computeVertexNormals();
  return geometria;
}

const G = {
  arred: new RoundedBoxGeometry(1, 1, 1, 4, 0.12),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  capsula: new THREE.CapsuleGeometry(0.5, 1, 6, 14),
  esfera: new THREE.SphereGeometry(0.5, 28, 20),
  caixa: new THREE.BoxGeometry(1, 1, 1),
  plano: new THREE.PlaneGeometry(1, 1),
  faixa: new THREE.TorusGeometry(0.195, 0.03, 10, 40),
  echarpe: new THREE.TorusGeometry(0.31, 0.055, 10, 40),
  manto: criarManto(),
  losango: new THREE.OctahedronGeometry(0.5, 0),
  anel: new THREE.TorusGeometry(1, 0.045, 10, 80),
};

// Massinha que acende em dourado no hover (como o quadro das outras equipes).
const massinha = (color, roughness = 0.75) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, emissive: OURO, emissiveIntensity: 0 });

function criarMateriais() {
  const massinhas = {
    marmore: massinha('#D3D5DA', 0.7),
    prega: massinha('#C2C5CC', 0.75),
    pedestal: massinha('#9EA3AD'),
    tampo: massinha('#B5B9C2'),
    lamina: massinha('#E4E7EC', 0.35),
    cabo: massinha('#7E838E', 0.6),
    papelVerso: massinha('#EFEDE4', 0.9),
  };
  return {
    ...massinhas,
    brilham: Object.values(massinhas),
    placa: new THREE.MeshStandardMaterial({ color: '#E2B85A', roughness: 0.45, metalness: 0.15 }),
    ouro: new THREE.MeshStandardMaterial({ color: '#F2B632', roughness: 0.45, metalness: 0.1, emissive: OURO, emissiveIntensity: 0.25 }),
    anel: Object.assign(
      new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
      // O anel do chão não entra no passe de sombras de contato.
      { allowOverride: false },
    ),
  };
}

const descartar = (M) => [...M.brilham, M.placa, M.ouro, M.anel].forEach((material) => material.dispose());

// Peça (cápsula, cilindro ou caixa) esticada entre dois pontos.
function Segmento({ de, ate, raio, material, geometria = G.capsula, espessura }) {
  const { posicao, giro, comprimento } = useMemo(() => {
    const inicio = new THREE.Vector3(...de);
    const direcao = new THREE.Vector3(...ate).sub(inicio);
    return {
      posicao: inicio.clone().addScaledVector(direcao, 0.5),
      comprimento: direcao.length(),
      giro: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize()),
    };
  }, [de, ate]);
  // A cápsula soma as pontas redondas ao comprimento: o meio dela encolhe para caber.
  const meio = geometria === G.capsula ? Math.max(comprimento - raio * 2, 0.001) : comprimento;
  return (
    <mesh
      geometry={geometria}
      material={material}
      position={posicao}
      quaternion={giro}
      scale={[raio * 2, geometria === G.capsula ? meio : comprimento, espessura ?? raio * 2]}
    />
  );
}

// Plaquinha dourada na frente do pedestal.
function usePlaca() {
  const textura = useMemo(
    () =>
      novaTextura(512, 128, (ctx, w, h) => {
        ctx.fillStyle = '#E2B85A';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#9A7424';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);
        ctx.fillStyle = '#5C4413';
        ctx.font = '700 56px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('COMPILAÇÃO', w / 2, h / 2 + 4);
      }),
    [],
  );
  useEffect(() => () => textura.dispose(), [textura]);
  return textura;
}

function Pedestal({ M }) {
  const placa = usePlaca();
  return (
    <>
      <mesh geometry={G.arred} material={M.pedestal} position-y={0.04} scale={[1.34, 0.08, 1.18]} />
      <mesh geometry={G.arred} material={M.pedestal} position-y={0.2} scale={[1.14, 0.3, 1.0]} />
      <mesh geometry={G.arred} material={M.tampo} position-y={BASE - 0.04} scale={[1.26, 0.08, 1.1]} />
      <mesh geometry={G.plano} position={[0, 0.21, 0.505]} scale={[0.66, 0.165, 1]}>
        <meshStandardMaterial map={placa} roughness={0.45} metalness={0.15} />
      </mesh>
    </>
  );
}

// A figura: manto, tronco com a echarpe, cabeça com a venda e o coque, e os braços.
function Figura({ M }) {
  return (
    <>
      <mesh geometry={G.manto} material={M.marmore} position-y={BASE} />
      <mesh geometry={G.esfera} material={M.marmore} position-y={1.72} scale={[0.58, 0.8, 0.38]} />
      <mesh geometry={G.esfera} material={M.marmore} position-y={1.97} scale={[0.74, 0.26, 0.38]} />
      {/* A echarpe cruzando o peito, do ombro direito ao quadril esquerdo. */}
      {/* Um anel deitado em volta do tronco (achatado na profundidade) e inclinado na diagonal. */}
      <mesh geometry={G.echarpe} material={M.prega} position-y={1.72} rotation={[Math.PI / 2, 0, -0.55, 'ZYX']} scale={[1, 0.66, 1]} />
      <mesh geometry={G.cil} material={M.marmore} position-y={2.12} scale={[0.15, 0.16, 0.15]} />
      <mesh geometry={G.esfera} material={M.marmore} position-y={2.33} scale={0.38} />
      {/* Cabelo preso: a calota por cima e o coque atrás. */}
      <mesh geometry={G.esfera} material={M.prega} position={[0, 2.37, -0.03]} scale={[0.4, 0.36, 0.39]} />
      <mesh geometry={G.esfera} material={M.prega} position={[0, 2.38, -0.2]} scale={0.19} />
      {/* A venda nos olhos e as pontas do nó caindo na nuca. */}
      <mesh geometry={G.faixa} material={M.marmore} position-y={2.34} rotation-x={Math.PI / 2 - 0.08} />
      <Segmento de={[0.03, 2.33, -0.2]} ate={[0.07, 2.12, -0.24]} raio={0.03} material={M.marmore} />
      <Segmento de={[-0.03, 2.33, -0.2]} ate={[-0.06, 2.15, -0.25]} raio={0.03} material={M.marmore} />

      {/* Braço da espada, caído junto do corpo. */}
      <Segmento de={OMBRO.e} ate={COTOVELO.e} raio={0.075} material={M.marmore} />
      <Segmento de={COTOVELO.e} ate={MAO.e} raio={0.065} material={M.marmore} />
      <mesh geometry={G.esfera} material={M.marmore} position={MAO.e} scale={0.15} />
      {/* Braço erguido, segurando a haste da folha. */}
      <Segmento de={OMBRO.d} ate={COTOVELO.d} raio={0.075} material={M.marmore} />
      <Segmento de={COTOVELO.d} ate={MAO.d} raio={0.065} material={M.marmore} />
      <mesh geometry={G.esfera} material={M.marmore} position={MAO.d} scale={0.15} />
    </>
  );
}

// A espada, com a ponta no pedestal: cabo e guarda na mão, lâmina até embaixo.
function Espada({ M }) {
  const [mx, my, mz] = MAO.e;
  const guarda = [mx - 0.01, my - 0.1, mz + 0.01];
  return (
    <>
      <Segmento de={[mx, my + 0.1, mz]} ate={guarda} raio={0.03} material={M.cabo} geometria={G.cil} />
      <mesh geometry={G.esfera} material={M.cabo} position={[mx, my + 0.13, mz]} scale={0.07} />
      <mesh geometry={G.arred} material={M.cabo} position={guarda} rotation-z={0.12} scale={[0.3, 0.045, 0.06]} />
      <Segmento de={guarda} ate={PONTA_ESPADA} raio={0.035} espessura={0.02} material={M.lamina} geometria={G.caixa} />
    </>
  );
}

// A haste na mão erguida, a barra e as presilhas de onde a folha pende.
function Haste({ M }) {
  return (
    <>
      <Segmento de={HASTE.de} ate={HASTE.ate} raio={0.025} material={M.cabo} geometria={G.cil} />
      <mesh geometry={G.esfera} material={M.cabo} position={HASTE.ate} scale={0.08} />
      <Segmento de={BARRA.de} ate={BARRA.ate} raio={0.022} material={M.cabo} geometria={G.cil} />
      <mesh geometry={G.esfera} material={M.cabo} position={BARRA.ate} scale={0.07} />
      {[-0.36, 0.36].map((dx) => (
        <mesh key={dx} geometry={G.arred} material={M.cabo} position={[FOLHA.x + dx, BARRA.de[1] - 0.04, FOLHA.z - 0.02]} scale={[0.08, 0.1, 0.05]} />
      ))}
    </>
  );
}

// Conta as vezes que a fonte manuscrita terminou de carregar, para redesenhar a folha.
function useFonteManuscrita() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let ativo = true;
    Promise.all([document.fonts.load('700 60px "Caveat"'), document.fonts.load('600 40px "Caveat"')])
      .then(() => ativo && setVersao((n) => n + 1))
      // Sem a fonte, a folha fica com a letra reserva.
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  return versao;
}

// A folha: pende da barra e balança de leve. O pivô fica na barra (topo da folha).
function Folha({ M, textura, folha }) {
  return (
    <group ref={folha} position={[FOLHA.x, FOLHA.y, FOLHA.z]}>
      <mesh geometry={G.plano} position-y={-FOLHA.altura / 2} scale={[FOLHA.largura, FOLHA.altura, 1]}>
        <meshStandardMaterial map={textura} roughness={0.9} />
      </mesh>
      <mesh geometry={G.plano} material={M.papelVerso} position={[0, -FOLHA.altura / 2, -0.004]} rotation-y={Math.PI} scale={[FOLHA.largura, FOLHA.altura, 1]} />
    </group>
  );
}

/**
 * A estátua de Têmis, o "quadro" da equipe de compilação: no lugar da balança ela
 * segura uma folha com o quadro geral. Ocupa o lugar e o comportamento do
 * quadro das outras equipes (Suporte/quadro/posicao.js): fica na borda do
 * tapete, os bonecos a contornam, o losango dourado avisa que dá para clicar e,
 * no hover, ela acende, ganha um anel no chão e uma etiqueta; o clique abre o
 * painel. Com o painel aberto, os bonecos saem da frente dela.
 *
 * @param {{ area: { rx: number, rz: number } }} props
 */
export default function EstatuaTemis({ area }) {
  const abrirQuadro = useEquipe((s) => s.abrirQuadro);
  const aberto = useEquipe((s) => s.painel !== null);
  const retrato = useThree((s) => s.size.width / s.size.height < 1);
  const [posicao, setPosicao] = useState(() => ({ ...QUADRO }));
  const [emHover, setEmHover] = useState(false);

  const resumo = useResumo();
  const fonte = useFonteManuscrita();
  const textura = useMemo(() => texturaFolhaTemis(resumo), [resumo, fonte]);
  useEffect(() => () => textura.dispose(), [textura]);

  const M = useMemo(criarMateriais, []);
  useEffect(() => () => descartar(M), [M]);
  useEffect(() => {
    setPosicao(posicionarQuadro(area, retrato));
  }, [area, retrato]);
  // Só ao sair de cena: numa mudança de tela, posicionarQuadro cuida dos obstáculos.
  useEffect(() => removerQuadro, []);

  const grupo = useRef(null);
  const folha = useRef(null);
  const losango = useRef(null);
  const anel = useRef(null);
  const luz = useRef(null);
  const brilho = useRef(0);

  useFrame((state, delta) => {
    const dt = passoDoFrame(delta);
    // Com movimento reduzido ela acende, mas nada pulsa, flutua nem balança.
    const t = MOVIMENTO.reduzido ? 0 : state.clock.elapsedTime;
    atualizarObstaculos(dt, aberto);

    brilho.current = damp(brilho.current, emHover || aberto ? 1 : 0, 8, dt);
    const b = brilho.current;
    const pulso = 0.85 + Math.sin(t * 5) * 0.15;
    M.brilham.forEach((material) => {
      material.emissiveIntensity = b * 0.14 * pulso;
    });
    M.ouro.emissiveIntensity = 0.25 + b * 0.9;
    M.anel.opacity = b * (0.55 + Math.sin(t * 4) * 0.25);
    luz.current.intensity = b * 2.2 * pulso;
    grupo.current.scale.setScalar(CONFIG_QUADRO.escala * (1 + b * 0.03));
    anel.current.scale.setScalar(1.55 + Math.sin(t * 2.5) * 0.05);
    losango.current.position.y = TOPO * CONFIG_QUADRO.escala + 0.3 + Math.sin(t * 2.2) * 0.08;
    if (!MOVIMENTO.reduzido) losango.current.rotation.y += dt * (1.2 + b * 3);
    losango.current.scale.setScalar(0.3 + b * 0.08);
    // A folha balança de leve na barra, como papel pendurado.
    folha.current.rotation.x = Math.sin(t * 0.9) * 0.035;
    folha.current.rotation.z = Math.sin(t * 0.6 + 1) * 0.012;
  });

  const sairDoHover = () => {
    setEmHover(false);
    document.body.style.cursor = '';
  };
  const onPointerOver = (event) => {
    event.stopPropagation();
    setEmHover(true);
    document.body.style.cursor = 'pointer';
  };
  const onClick = (event) => {
    event.stopPropagation();
    // O painel abre por cima do ponteiro: a "mãozinha" do hover não pode ficar presa.
    document.body.style.cursor = '';
    abrirQuadro();
  };

  return (
    <group position={[posicao.x, 0, posicao.z]} rotation-y={posicao.rot}>
      <pointLight ref={luz} color="#FFB938" intensity={0} distance={4.5} decay={1.6} position={[0.4, 1.4, 1.4]} />
      <mesh ref={anel} geometry={G.anel} material={M.anel} rotation-x={-Math.PI / 2} position-y={0.03} />

      {/* Os eventos ficam no grupo: o clique vale em qualquer peça da estátua ou na folha. */}
      <group ref={grupo} onPointerOver={onPointerOver} onPointerOut={sairDoHover} onClick={onClick}>
        <Pedestal M={M} />
        <Figura M={M} />
        <Espada M={M} />
        <Haste M={M} />
        <Folha M={M} textura={textura} folha={folha} />
      </group>

      {/* Losango dourado: indica que dá para clicar. */}
      <mesh ref={losango} geometry={G.losango} material={M.ouro} position={[0, TOPO * CONFIG_QUADRO.escala + 0.3, 0.05]} />

      {emHover && !aberto && (
        <Html position={[0, TOPO * CONFIG_QUADRO.escala + 0.8, 0]} center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={styles.etiqueta}>Quadro da equipe · ver visão geral</div>
        </Html>
      )}
    </group>
  );
}
