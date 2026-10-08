import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import { MOVIMENTO, useEquipe } from '../store.js';
import { CONFIG_QUADRO, QUADRO, atualizarCorredor, posicionarQuadro, removerQuadro } from './posicao.js';
import { texturaFolhaPautada, texturaPapelRasgado, texturaPostIt, texturaQuadroBranco } from './texturas.js';
import { useResumo } from './useResumo.js';
import styles from './Quadro.module.css';

const OURO = '#FFC23D';
const { damp } = THREE.MathUtils;

// Medidas do quadro (m): largura, altura e altura do centro.
const W = 2.4;
const H = 1.55;
const C = 1.9;
const BASE = C - H / 2;
const TOPO = C + H / 2;
// Frente do painel, onde as anotações ficam presas.
const Z_NOTA = 0.04;

// Geometrias unitárias compartilhadas, escaladas por peça.
const G = {
  arred: new RoundedBoxGeometry(1, 1, 1, 4, 0.2),
  arredFino: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
  capsula: new THREE.CapsuleGeometry(0.5, 1, 6, 14),
  cilindro: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
  esfera: new THREE.SphereGeometry(0.5, 16, 12),
  plano: new THREE.PlaneGeometry(1, 1),
  losango: new THREE.OctahedronGeometry(0.5, 0),
  anel: new THREE.TorusGeometry(1, 0.045, 10, 80),
};

// Pernas do cavalete: [ponto no quadro, ponto no chão].
const PERNAS = [
  [[-0.55, BASE + 0.08, 0], [-1, 0.02, 0.48]],
  [[0.55, BASE + 0.08, 0], [1, 0.02, 0.48]],
  [[0, TOPO - 0.35, -0.09], [0, 0.02, -0.95]],
];
const CANTOS = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
const CORES_PINCEIS = ['#2E8C93', '#E58F8F', '#3B4C8C'];
const FITA = { papel: '#E2C07E', folha: '#8ED3D6' };

// Massinha que acende em dourado no hover.
const massinha = (color, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, emissive: OURO, emissiveIntensity: 0 });

function criarMateriais() {
  const massinhas = {
    moldura: massinha('#DCDDE1'),
    canto: massinha('#868A93'),
    painel: massinha('#F4F4F1', 0.6),
    perna: massinha('#8C919B', 0.7),
    pe: massinha('#5A5E68'),
    bandeja: massinha('#C9CCD3'),
    apagador: massinha('#3E4250'),
  };
  const pinceis = CORES_PINCEIS.map((cor) => massinha(cor, 0.6));

  const materiais = {
    ...massinhas,
    pinceis,
    // As que recebem o brilho do hover, todas juntas.
    brilham: [...Object.values(massinhas), ...pinceis],
    fitas: {
      papel: new THREE.MeshStandardMaterial({ color: FITA.papel, roughness: 0.7, transparent: true, opacity: 0.88 }),
      folha: new THREE.MeshStandardMaterial({ color: FITA.folha, roughness: 0.7, transparent: true, opacity: 0.88 }),
    },
    ouro: new THREE.MeshStandardMaterial({
      color: '#F2B632',
      roughness: 0.45,
      metalness: 0.1,
      emissive: OURO,
      emissiveIntensity: 0.25,
    }),
    anel: new THREE.MeshBasicMaterial({ color: OURO, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }),
  };
  // O anel do chão não entra no passe de sombras de contato.
  materiais.anel.allowOverride = false;
  return materiais;
}

const descartarMateriais = (M) =>
  [...M.brilham, M.fitas.papel, M.fitas.folha, M.ouro, M.anel].forEach((material) => material.dispose());

// Cilindro entre dois pontos.
function Perna({ de, ate, material, raio = 0.045 }) {
  const { posicao, giro, comprimento } = useMemo(() => {
    const inicio = new THREE.Vector3(...de);
    const direcao = new THREE.Vector3(...ate).sub(inicio);
    const comprimento = direcao.length();
    return {
      posicao: inicio.clone().addScaledVector(direcao, 0.5),
      giro: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direcao.normalize()),
      comprimento,
    };
  }, [de, ate]);

  return (
    <mesh
      geometry={G.cilindro}
      material={material}
      position={posicao}
      quaternion={giro}
      scale={[raio * 2, comprimento, raio * 2]}
    />
  );
}

function Cavalete({ materiais: M }) {
  return (
    <>
      {PERNAS.map(([de, ate], i) => (
        <group key={i}>
          <Perna de={de} ate={ate} material={M.perna} />
          <mesh geometry={G.esfera} material={M.pe} position={[ate[0], 0.04, ate[2]]} scale={[0.13, 0.08, 0.13]} />
        </group>
      ))}
      <mesh geometry={G.arred} material={M.canto} position={[0, TOPO - 0.3, -0.07]} scale={[0.16, 0.14, 0.08]} />
    </>
  );
}

// O quadro branco: painel, moldura, cantoneiras e a bandeja com pincéis e apagador.
function Painel({ materiais: M, fundo }) {
  return (
    <>
      <mesh geometry={G.arred} material={M.painel} position={[0, C, 0]} scale={[W, H, 0.06]} />
      <mesh geometry={G.plano} position={[0, C, 0.032]} scale={[W - 0.14, H - 0.14, 1]}>
        <meshStandardMaterial map={fundo} roughness={0.55} />
      </mesh>

      <mesh geometry={G.arred} material={M.moldura} position={[0, TOPO, 0]} scale={[W + 0.04, 0.1, 0.11]} />
      <mesh geometry={G.arred} material={M.moldura} position={[0, BASE, 0]} scale={[W + 0.04, 0.1, 0.11]} />
      <mesh geometry={G.arred} material={M.moldura} position={[-W / 2, C, 0]} scale={[0.1, H + 0.04, 0.11]} />
      <mesh geometry={G.arred} material={M.moldura} position={[W / 2, C, 0]} scale={[0.1, H + 0.04, 0.11]} />
      {CANTOS.map(([sx, sy], i) => (
        <mesh
          key={i}
          geometry={G.arred}
          material={M.canto}
          position={[sx * (W / 2 - 0.02), C + sy * (H / 2 - 0.02), 0.005]}
          scale={[0.19, 0.19, 0.14]}
        />
      ))}

      <mesh geometry={G.arred} material={M.bandeja} position={[0, BASE - 0.07, 0.08]} scale={[W * 0.62, 0.05, 0.16]} />
      {M.pinceis.map((material, i) => (
        <mesh
          key={i}
          geometry={G.capsula}
          material={material}
          position={[-0.42 + i * 0.13, BASE - 0.02, 0.1]}
          rotation-z={Math.PI / 2 + (i - 1) * 0.06}
          scale={[0.045, 0.07, 0.045]}
        />
      ))}
      <mesh geometry={G.arred} material={M.apagador} position={[0.42, BASE - 0.01, 0.1]} scale={[0.2, 0.07, 0.09]} />
    </>
  );
}

function Fita({ x, y, z, giro, material }) {
  return <mesh geometry={G.arredFino} material={material} position={[x, y, z]} rotation-z={giro} scale={[0.2, 0.06, 0.008]} />;
}

function Nota({ textura, posicao, tamanho, giro = 0, inclinacao = 0, recortada = false }) {
  return (
    <mesh geometry={G.plano} position={posicao} rotation={[inclinacao, 0, giro]} scale={[tamanho[0], tamanho[1], 1]}>
      <meshStandardMaterial map={textura} roughness={0.9} metalness={0} transparent={recortada} alphaTest={recortada ? 0.5 : 0} />
    </mesh>
  );
}

// Papel rasgado, folha pautada e post-it: cada um só aparece quando há dado para ele.
function Anotacoes({ texturas, materiais: M }) {
  return (
    <>
      {texturas.rasgado && (
        <>
          <Nota textura={texturas.rasgado} posicao={[-0.72, C + 0.31, Z_NOTA]} tamanho={[0.62, 0.654]} giro={0.035} recortada />
          <Fita x={-0.98} y={C + 0.6} z={Z_NOTA + 0.012} giro={0.62} material={M.fitas.papel} />
          <Fita x={-0.46} y={C + 0.61} z={Z_NOTA + 0.012} giro={-0.6} material={M.fitas.papel} />
        </>
      )}
      {texturas.pautada && (
        <>
          <Nota textura={texturas.pautada} posicao={[-0.04, C - 0.2, Z_NOTA + 0.004]} tamanho={[0.94, 0.752]} giro={-0.018} />
          <Fita x={-0.5} y={C + 0.14} z={Z_NOTA + 0.014} giro={0.55} material={M.fitas.folha} />
          <Fita x={0.42} y={C - 0.56} z={Z_NOTA + 0.014} giro={0.55} material={M.fitas.folha} />
        </>
      )}
      {texturas.postit && (
        <Nota textura={texturas.postit} posicao={[0.7, C + 0.3, Z_NOTA + 0.008]} tamanho={[0.64, 0.64]} giro={-0.075} inclinacao={-0.04} />
      )}
    </>
  );
}

// Conta as vezes que a fonte manuscrita terminou de carregar, para redesenhar as anotações.
function useFonteManuscrita() {
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    Promise.all([document.fonts.load('700 60px "Caveat"'), document.fonts.load('600 40px "Caveat"')])
      .then(() => ativo && setVersao((n) => n + 1))
      // Sem a fonte, as anotações ficam com a letra reserva.
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  return versao;
}

function useTexturas(resumo) {
  const fonte = useFonteManuscrita();
  const fundo = useMemo(() => texturaQuadroBranco(), [fonte]);
  const anotacoes = useMemo(
    () => ({
      rasgado: texturaPapelRasgado(resumo),
      pautada: texturaFolhaPautada(resumo),
      postit: texturaPostIt(resumo),
    }),
    [resumo, fonte],
  );

  useEffect(() => () => fundo.dispose(), [fundo]);
  useEffect(() => () => Object.values(anotacoes).forEach((textura) => textura?.dispose()), [anotacoes]);

  return { fundo, anotacoes };
}

/*
 * Quadro da equipe: quadro branco em cavalete, estilo massinha, na borda do
 * tapete. As anotações mostram a visão geral da equipe (useResumo). O losango
 * dourado avisa que dá para clicar; no hover o quadro acende, ganha um anel no
 * chão e uma etiqueta; o clique abre o painel (CardQuadro). Com o painel aberto,
 * os técnicos saem da frente (posicao.js). Tudo o que anima é mutado em useFrame.
 */
export default function Quadro({ area }) {
  const abrirQuadro = useEquipe((s) => s.abrirQuadro);
  const aberto = useEquipe((s) => s.painel === 'quadro');
  const retrato = useThree((s) => s.size.width / s.size.height < 1);
  const [posicao, setPosicao] = useState(() => ({ ...QUADRO }));
  const [emHover, setEmHover] = useState(false);

  const resumo = useResumo();
  const texturas = useTexturas(resumo);
  const M = useMemo(criarMateriais, []);
  useEffect(() => () => descartarMateriais(M), [M]);
  useEffect(() => {
    setPosicao(posicionarQuadro(area, retrato));
    return removerQuadro;
  }, [area, retrato]);

  const grupo = useRef(null);
  const losango = useRef(null);
  const anel = useRef(null);
  const luz = useRef(null);
  const brilho = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    // Com movimento reduzido o quadro acende, mas nada pulsa nem flutua.
    const t = MOVIMENTO.reduzido ? 0 : state.clock.elapsedTime;
    atualizarCorredor(dt, aberto);

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
    losango.current.position.y = TOPO + 0.45 + Math.sin(t * 2.2) * 0.08;
    if (!MOVIMENTO.reduzido) losango.current.rotation.y += dt * (1.2 + b * 3);
    losango.current.scale.setScalar(0.3 + b * 0.08);
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
    abrirQuadro();
  };

  return (
    <group position={[posicao.x, 0, posicao.z]} rotation-y={posicao.rot}>
      <pointLight ref={luz} color="#FFB938" intensity={0} distance={4} decay={1.6} position={[0, 0.6, 1.2]} />
      <mesh ref={anel} geometry={G.anel} material={M.anel} rotation-x={-Math.PI / 2} position-y={0.03} />

      {/* Os eventos ficam no grupo: o clique vale em qualquer peça do quadro. */}
      <group ref={grupo} onPointerOver={onPointerOver} onPointerOut={sairDoHover} onClick={onClick}>
        <Cavalete materiais={M} />
        <Painel materiais={M} fundo={texturas.fundo} />
        <Anotacoes texturas={texturas.anotacoes} materiais={M} />
      </group>

      {/* Losango dourado: indica que dá para clicar. */}
      <mesh ref={losango} geometry={G.losango} material={M.ouro} position={[0, TOPO + 0.45, 0.05]} />

      {emHover && !aberto && (
        <Html position={[0, TOPO + 0.95, 0]} center distanceFactor={10} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={styles.etiqueta}>Quadro da equipe · ver visão geral</div>
        </Html>
      )}
    </group>
  );
}
