/*
 * Estúdio das ilustrações dos cards da home (só no dev; ver App.jsx). Desenha uma
 * composição por vez, em fundo transparente:
 *
 *   /estudio-home?cena=dev&natal=1
 *
 * Quando tudo já foi desenhado alguns quadros (fontes do quadro carregadas,
 * texturas prontas), marca window.__estudioPronto = true. O script
 * scripts/gerar-ilustracoes-home.mjs lê o canvas e gera os WebP.
 *
 * O `natal` só vale com o servidor do script, que troca o NATAL_ATIVO pela
 * consulta; num `npm run dev` comum, um pedido que não bate com o tema vira
 * window.__estudioErro.
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { NATAL_ATIVO } from '../tema/natal.js';
import { CENAS } from './cenas.jsx';

// Tamanho do canvas (px CSS); com dpr 2 a imagem sai com o dobro, e o script reduz.
const LARGURA = 1200;
const ALTURA = 800;
const DPR = 2;
// ?dpr=1 desenha com metade da resolução: prévia mais rápida no Chrome sem GPU.
const dprDaConsulta = (consulta) => Number(consulta.get('dpr')) || DPR;
// Câmera: um pouco acima, olhando de frente (cada cena gira o que precisa para o três-quartos).
const FOV = 24;
const ELEVACAO = THREE.MathUtils.degToRad(25);
// O que sobra em volta da composição no enquadramento (NDC, 1 = borda).
const OCUPACAO = 0.92;
// Quadros desenhados depois do enquadramento (e das fontes) antes de avisar que está pronto.
const QUADROS_ATE_PRONTO = 10;
const QUADRO_DO_ENQUADRAMENTO = 6;
// Tudo fica parado depois do enquadramento: a sombra só precisa ser desenhada umas poucas vezes.
const QUADROS_DA_SOMBRA = 3;

const GL = {
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
  toneMapping: THREE.NeutralToneMapping,
};

// A caixa do que aparece: só malhas visíveis e não totalmente transparentes.
function caixaVisivel(raiz) {
  const caixa = new THREE.Box3();
  const parte = new THREE.Box3();
  raiz.updateWorldMatrix(true, true);
  raiz.traverseVisible((objeto) => {
    if (!objeto.isMesh || !objeto.geometry) return;
    const materiais = [objeto.material].flat();
    if (materiais.every((m) => m.transparent && m.opacity < 0.05)) return;
    if (!objeto.geometry.boundingBox) objeto.geometry.computeBoundingBox();
    parte.copy(objeto.geometry.boundingBox).applyMatrix4(objeto.matrixWorld);
    caixa.union(parte);
  });
  return caixa;
}

const CANTOS = [0, 1, 2, 3, 4, 5, 6, 7];
const ponto = new THREE.Vector3();

// Maior coordenada (em NDC) dos cantos da caixa vistos da câmera.
function alcanceNaTela(camera, caixa) {
  let maior = 0;
  for (const i of CANTOS) {
    ponto.set(i & 1 ? caixa.max.x : caixa.min.x, i & 2 ? caixa.max.y : caixa.min.y, i & 4 ? caixa.max.z : caixa.min.z);
    ponto.project(camera);
    maior = Math.max(maior, Math.abs(ponto.x), Math.abs(ponto.y));
  }
  return maior;
}

// Afasta ou aproxima a câmera (na direção fixa) até a caixa ocupar OCUPACAO da tela.
function enquadrar(camera, caixa) {
  const centro = caixa.getCenter(new THREE.Vector3());
  const direcao = new THREE.Vector3(0, Math.sin(ELEVACAO), Math.cos(ELEVACAO));
  let perto = 0.5;
  let longe = 200;
  for (let i = 0; i < 40; i++) {
    const distancia = (perto + longe) / 2;
    camera.position.copy(centro).addScaledVector(direcao, distancia);
    camera.lookAt(centro);
    camera.updateMatrixWorld();
    if (alcanceNaTela(camera, caixa) > OCUPACAO) perto = distancia;
    else longe = distancia;
  }
  camera.position.copy(centro).addScaledVector(direcao, longe);
  camera.lookAt(centro);
  camera.near = Math.max(0.05, longe / 50);
  camera.far = longe * 4;
  camera.updateProjectionMatrix();
}

function Estudio({ Cena }) {
  const conteudo = useRef(null);
  const camera = useThree((s) => s.camera);
  const quadros = useRef(0);
  const fontes = useRef(false);
  const [escalaChao, setEscalaChao] = useState(null);

  useLayoutEffect(() => {
    document.fonts.ready.then(() => {
      fontes.current = true;
    });
  }, []);

  useFrame(() => {
    quadros.current += 1;
    const n = quadros.current;
    if (n === QUADRO_DO_ENQUADRAMENTO) {
      // Leva o centro do chão da composição para a origem: as sombras de contato
      // do drei só saíram no lugar certo com o plano delas na origem.
      const antes = caixaVisivel(conteudo.current).getCenter(new THREE.Vector3());
      conteudo.current.position.set(-antes.x, 0, -antes.z);
      const caixa = caixaVisivel(conteudo.current);
      enquadrar(camera, caixa);
      const tamanho = caixa.getSize(new THREE.Vector3());
      setEscalaChao(Math.max(tamanho.x, tamanho.z) + 3);
    }
    if (!fontes.current && n > QUADRO_DO_ENQUADRAMENTO) quadros.current = QUADRO_DO_ENQUADRAMENTO + 1;
    if (n === QUADRO_DO_ENQUADRAMENTO + QUADROS_ATE_PRONTO) window.__estudioPronto = true;
  });

  return (
    <>
      <hemisphereLight args={['#FFF7F0', '#B9B2C9', 1.35]} />
      <directionalLight position={[5, 9, 6]} intensity={1.5} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#C9D6FF" />
      <group ref={conteudo}>
        <Cena />
      </group>
      {escalaChao && (
        <ContactShadows
          scale={escalaChao}
          frames={QUADROS_DA_SOMBRA}
          resolution={1024}
          blur={2.4}
          opacity={0.5}
          far={2.6}
          color="#3C4433"
        />
      )}
    </>
  );
}

export default function EstudioHome() {
  const consulta = useMemo(() => new URLSearchParams(window.location.search), []);
  const nome = consulta.get('cena') ?? 'dev';
  const natalPedido = consulta.get('natal') !== '0';
  const Cena = Object.hasOwn(CENAS, nome) ? CENAS[nome] : null;

  useLayoutEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    window.__estudioPronto = false;
    window.__estudioErro = null;
    if (!Cena) window.__estudioErro = `cena desconhecida: ${nome} (use ${Object.keys(CENAS).join(', ')})`;
    else if (natalPedido !== NATAL_ATIVO) {
      window.__estudioErro = `natal=${natalPedido ? 1 : 0} pedido, mas NATAL_ATIVO é ${NATAL_ATIVO}: use o servidor do script`;
    }
  }, [Cena, nome, natalPedido]);

  if (!Cena) return null;
  return (
    <div style={{ position: 'fixed', left: 0, top: 0, width: LARGURA, height: ALTURA }}>
      <Canvas dpr={dprDaConsulta(consulta)} gl={GL} camera={{ fov: FOV, near: 0.1, far: 200, position: [0, 6, 16] }}>
        <Estudio Cena={Cena} />
      </Canvas>
    </div>
  );
}
