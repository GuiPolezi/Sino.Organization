import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COR_HOLO, RUIDO_GLSL } from './holoMaterial.js';

// Topo do disco do projetor (o boneco flutua acima dele).
export const TOPO_DISCO = 0.1;
const RAIO_DISCO = 0.74;
const ALTURA_CONE = 2.45;
const PARTICULAS = 70;

const aditivo = {
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
};

const VERT_UV = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vVista;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vVista = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

// Cone de luz: mais forte nas bordas (fresnel) e na base, com raias que sobem.
const FRAG_CONE = /* glsl */ `
uniform float uTempo;
uniform float uEnergia;
uniform vec3 uCor;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vVista;
${RUIDO_GLSL}
void main() {
  float borda = 1.0 - abs(dot(normalize(vNormalV), normalize(vVista)));
  float alt = vUv.y;
  float sumir = pow(1.0 - alt, 1.7) * smoothstep(0.0, 0.04, alt);
  float raias = 0.55 + 0.45 * holoRuido(vec2(vUv.x * 40.0, alt * 3.0 - uTempo * 0.5));
  float pulsos = 0.8 + 0.2 * sin(alt * 26.0 - uTempo * 2.2);
  float a = sumir * (0.1 + 0.55 * pow(borda, 1.6)) * raias * pulsos * uEnergia;
  gl_FragColor = vec4(uCor, a);
  #include <colorspace_fragment>
}
`;

// Face do disco: brilho no centro, anéis finos e marcas girando.
const FRAG_DISCO = /* glsl */ `
uniform float uTempo;
uniform float uEnergia;
uniform vec3 uCor;
varying vec2 vUv;
float faixa(float r, float centro, float largura) {
  return smoothstep(largura, 0.0, abs(r - centro));
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x) / 6.28318 + 0.5;
  float centro = pow(max(0.0, 1.0 - r), 2.2) * 0.55;
  float aneis = faixa(r, 0.96, 0.025) + faixa(r, 0.64, 0.012) * 0.6 + faixa(r, 0.36, 0.01) * 0.4;
  float marcas = step(0.55, fract(ang * 36.0 + uTempo * 0.15)) * faixa(r, 0.8, 0.045);
  float arcos = step(0.62, fract(ang * 3.0 - uTempo * 0.08)) * faixa(r, 0.88, 0.012);
  float a = (centro + aneis * 0.9 + marcas * 0.45 + arcos * 0.8) * uEnergia * step(r, 1.0);
  gl_FragColor = vec4(uCor, a);
  #include <colorspace_fragment>
}
`;

// Anel tracejado flutuando em volta do boneco.
const FRAG_ANEL = /* glsl */ `
uniform float uTempo;
uniform float uEnergia;
uniform float uTracos;
uniform float uSentido;
uniform vec3 uCor;
varying vec2 vUv;
void main() {
  float ang = vUv.x;
  float traco = smoothstep(0.0, 0.04, fract(ang * uTracos + uTempo * 0.06 * uSentido))
    * smoothstep(0.7, 0.62, fract(ang * uTracos + uTempo * 0.06 * uSentido));
  float a = (0.15 + 0.75 * traco) * uEnergia;
  gl_FragColor = vec4(uCor, a);
  #include <colorspace_fragment>
}
`;

// Partículas subindo em espiral pelo feixe; o movimento todo é no shader.
const VERT_PARTICULAS = /* glsl */ `
uniform float uTempo;
uniform float uEscala;
attribute vec4 aSemente;
varying float vAlfa;
void main() {
  float t = fract(aSemente.w + uTempo * aSemente.z);
  float ang = aSemente.x * 6.28318 + uTempo * 0.3 + t * 1.4;
  float raio = (0.15 + aSemente.y * 0.55) * (0.8 + 0.4 * t);
  vec3 p = vec3(cos(ang) * raio, ${TOPO_DISCO.toFixed(2)} + t * ${(ALTURA_CONE - 0.2).toFixed(2)}, sin(ang) * raio);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vAlfa = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.55, 1.0, t));
  gl_PointSize = uEscala * (0.5 + aSemente.y) / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG_PARTICULAS = /* glsl */ `
uniform vec3 uCor;
uniform float uEnergia;
varying float vAlfa;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlfa * uEnergia;
  gl_FragColor = vec4(mix(uCor, vec3(1.0), 0.45), a);
  #include <colorspace_fragment>
}
`;

function useShader(props) {
  const material = useMemo(() => new THREE.ShaderMaterial(props), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => material.dispose(), [material]);
  return material;
}

const ANEIS = [
  { y: 0.42, raio: 0.98, tracos: 3, sentido: 1, inclina: 0.05 },
  { y: 1.95, raio: 0.66, tracos: 5, sentido: -1, inclina: -0.07 },
];

/**
 * O projetor: base física, face luminosa, cone de luz, anéis e partículas.
 * `energia` (ref) vem do palco: cai sem ninguém e dá um pico ao materializar.
 */
export default function Projetor({ tempo, energia }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const altura = useThree((s) => s.size.height);

  const geometrias = useMemo(() => {
    const sementes = new Float32Array(PARTICULAS * 4);
    for (let i = 0; i < sementes.length; i++) sementes[i] = Math.random();
    // Velocidade de subida: um ciclo a cada 4 a 9 s.
    for (let i = 0; i < PARTICULAS; i++) sementes[i * 4 + 2] = 0.11 + sementes[i * 4 + 2] * 0.14;
    const particulas = new THREE.BufferGeometry();
    particulas.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICULAS * 3), 3));
    particulas.setAttribute('aSemente', new THREE.BufferAttribute(sementes, 4));
    return {
      base: new THREE.CylinderGeometry(RAIO_DISCO, RAIO_DISCO + 0.06, TOPO_DISCO, 64),
      aro: new THREE.TorusGeometry(RAIO_DISCO + 0.005, 0.012, 8, 96),
      face: new THREE.CircleGeometry(RAIO_DISCO - 0.02, 64),
      cone: new THREE.CylinderGeometry(RAIO_DISCO * 1.12, RAIO_DISCO * 0.86, ALTURA_CONE, 64, 1, true),
      anel: new THREE.RingGeometry(1, 1.022, 128, 1),
      chao: new THREE.CircleGeometry(1.7, 48),
      particulas,
    };
  }, []);
  useEffect(() => () => Object.values(geometrias).forEach((g) => g.dispose()), [geometrias]);

  // RingGeometry: uv.x passa a ser o ângulo (0..1) para os traços.
  useMemo(() => {
    const { anel } = geometrias;
    const pos = anel.attributes.position;
    const uv = anel.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setX(i, Math.atan2(pos.getY(i), pos.getX(i)) / (Math.PI * 2) + 0.5);
    }
    uv.needsUpdate = true;
  }, [geometrias]);

  const cor = useMemo(() => new THREE.Color(COR_HOLO), []);
  const comum = useMemo(() => ({ uTempo: { value: 0 }, uEnergia: { value: 1 }, uCor: { value: cor } }), [cor]);

  const cone = useShader({ ...aditivo, side: THREE.DoubleSide, uniforms: comum, vertexShader: VERT_UV, fragmentShader: FRAG_CONE });
  const disco = useShader({ ...aditivo, uniforms: comum, vertexShader: VERT_UV, fragmentShader: FRAG_DISCO });
  const particulas = useShader({
    ...aditivo,
    uniforms: { ...comum, uEscala: { value: 1 } },
    vertexShader: VERT_PARTICULAS,
    fragmentShader: FRAG_PARTICULAS,
  });
  const chao = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        ...aditivo,
        color: cor,
        alphaMap: texturaRadial(),
        opacity: 0.35,
      }),
    [cor],
  );
  useEffect(() => () => {
    chao.alphaMap?.dispose();
    chao.dispose();
  }, [chao]);
  const aro = useMemo(() => new THREE.MeshBasicMaterial({ ...aditivo, color: cor, opacity: 0.9 }), [cor]);
  useEffect(() => () => aro.dispose(), [aro]);
  const base = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5b6f76', roughness: 0.55, metalness: 0.25 }),
    [],
  );
  useEffect(() => () => base.dispose(), [base]);

  // Tamanho das partículas em px por unidade de profundidade.
  particulas.uniforms.uEscala.value = 0.028 * altura * dpr;

  useFrame(() => {
    comum.uTempo.value = tempo.current;
    comum.uEnergia.value = energia.current;
    chao.opacity = 0.3 * energia.current;
    aro.opacity = 0.9 * energia.current;
  });

  return (
    <group>
      <mesh geometry={geometrias.chao} material={chao} rotation-x={-Math.PI / 2} position-y={0.002} renderOrder={1} />
      <mesh geometry={geometrias.base} material={base} position-y={TOPO_DISCO / 2} />
      <mesh geometry={geometrias.aro} material={aro} rotation-x={-Math.PI / 2} position-y={TOPO_DISCO} renderOrder={2} />
      <mesh geometry={geometrias.face} material={disco} rotation-x={-Math.PI / 2} position-y={TOPO_DISCO + 0.003} renderOrder={2} />
      <mesh geometry={geometrias.cone} material={cone} position-y={TOPO_DISCO + ALTURA_CONE / 2} renderOrder={4} />
      {ANEIS.map((anel, i) => (
        <Anel key={i} anel={anel} geometria={geometrias.anel} comum={comum} />
      ))}
      <points geometry={geometrias.particulas} material={particulas} frustumCulled={false} renderOrder={6} />
    </group>
  );
}

function Anel({ anel, geometria, comum }) {
  const material = useShader({
    ...aditivo,
    side: THREE.DoubleSide,
    uniforms: { ...comum, uTracos: { value: anel.tracos }, uSentido: { value: anel.sentido } },
    vertexShader: VERT_UV,
    fragmentShader: FRAG_ANEL,
  });
  return (
    <mesh
      geometry={geometria}
      material={material}
      position-y={anel.y}
      rotation={[-Math.PI / 2 + anel.inclina, 0, 0]}
      scale={anel.raio}
      renderOrder={5}
    />
  );
}

// Gradiente radial (centro opaco, borda transparente) para o brilho no chão.
function texturaRadial() {
  const lado = 64;
  const tela = document.createElement('canvas');
  tela.width = lado;
  tela.height = lado;
  const contexto = tela.getContext('2d');
  const gradiente = contexto.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  gradiente.addColorStop(0, '#ffffff');
  gradiente.addColorStop(0.45, '#7a7a7a');
  gradiente.addColorStop(1, '#000000');
  contexto.fillStyle = gradiente;
  contexto.fillRect(0, 0, lado, lado);
  return new THREE.CanvasTexture(tela);
}
