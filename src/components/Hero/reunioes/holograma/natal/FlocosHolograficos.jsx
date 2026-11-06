/*
 * Flocos de neve no feixe do holograma (docs/tema-natal.md, 4.7): o Natal no
 * "idioma" do holograma, sem objeto sólido. 8 flocos de 6 pontas em ciano
 * descem de y 2,4 a 0,2 dentro do cone, girando devagar. Um Points só, com o
 * movimento no shader (como as partículas do Projetor). Usa o `tempo` do
 * Palco, que já para com movimento reduzido.
 */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COR_HOLO } from '../holoMaterial.js';

const FLOCOS = 8;
const TOPO = 2.4;
const CHAO = 0.2;
const VELOCIDADE = 0.15; // m/s

const VERTICE = /* glsl */ `
uniform float uTempo;
uniform float uEscala;
attribute vec4 aSemente;
varying float vAlfa;
varying float vGiro;
void main() {
  float t = fract(aSemente.z + uTempo * ${(VELOCIDADE / (TOPO - CHAO)).toFixed(5)});
  float ang = aSemente.x * 6.28318 + sin(uTempo * 0.35 + aSemente.z * 6.28318) * 0.3;
  float raio = 0.2 + aSemente.y * 0.55;
  vec3 p = vec3(cos(ang) * raio, ${TOPO.toFixed(2)} - t * ${(TOPO - CHAO).toFixed(2)}, sin(ang) * raio);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vAlfa = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.85, 1.0, t));
  vGiro = uTempo * (0.25 + aSemente.w * 0.3) + aSemente.z * 6.28318;
  gl_PointSize = uEscala * (0.07 + aSemente.w * 0.05) / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENTO = /* glsl */ `
uniform sampler2D uMapa;
uniform vec3 uCor;
uniform float uEnergia;
varying float vAlfa;
varying float vGiro;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float s = sin(vGiro);
  float k = cos(vGiro);
  vec2 uv = vec2(k * c.x - s * c.y, s * c.x + k * c.y) + 0.5;
  float a = texture2D(uMapa, uv).a * vAlfa * 0.5 * uEnergia;
  gl_FragColor = vec4(uCor, a);
  #include <colorspace_fragment>
}
`;

// Floco de 6 pontas com raminhos, branco em fundo transparente (vale o alfa).
function texturaFloco() {
  const lado = 64;
  const tela = document.createElement('canvas');
  tela.width = lado;
  tela.height = lado;
  const ctx = tela.getContext('2d');
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.translate(lado / 2, lado / 2);
  const r = lado * 0.42;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    [0.45, 0.72].forEach((f) => {
      ctx.moveTo(0, -r * f);
      ctx.lineTo(-r * 0.22, -r * (f + 0.18));
      ctx.moveTo(0, -r * f);
      ctx.lineTo(r * 0.22, -r * (f + 0.18));
    });
    ctx.stroke();
  }
  return new THREE.CanvasTexture(tela);
}

// Sementes fixas (razão áurea): os flocos se espalham pelo feixe e pelo ciclo.
function sementes() {
  const dados = new Float32Array(FLOCOS * 4);
  for (let i = 0; i < FLOCOS; i++) {
    dados.set([(i * 0.618 + 0.1) % 1, (i * 0.382 + 0.25) % 1, i / FLOCOS, (i * 0.731 + 0.4) % 1], i * 4);
  }
  return dados;
}

/**
 * @param {object} props
 * @param {{ current: number }} props.tempo  relógio do Palco (parado com movimento reduzido)
 * @param {{ current: number }} props.energia  energia do projetor (1 com alguém em cena)
 */
export default function FlocosHolograficos({ tempo, energia }) {
  const altura = useThree((s) => s.size.height);
  const dpr = useThree((s) => s.viewport.dpr);
  const fov = useThree((s) => s.camera.fov);

  const geometria = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLOCOS * 3), 3));
    g.setAttribute('aSemente', new THREE.BufferAttribute(sementes(), 4));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTempo: { value: 0 },
          uEscala: { value: 1 },
          uEnergia: { value: 1 },
          uCor: { value: new THREE.Color(COR_HOLO) },
          uMapa: { value: texturaFloco() },
        },
        vertexShader: VERTICE,
        fragmentShader: FRAGMENTO,
      }),
    [],
  );
  useEffect(
    () => () => {
      material.uniforms.uMapa.value.dispose();
      material.dispose();
      geometria.dispose();
    },
    [material, geometria],
  );

  // Pixels por metro a 1 m da câmera: o tamanho do floco fica em metros.
  material.uniforms.uEscala.value = (altura * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad((fov ?? 28) / 2)));

  useFrame(() => {
    material.uniforms.uTempo.value = tempo.current;
    material.uniforms.uEnergia.value = energia.current;
  });

  return <points geometry={geometria} material={material} frustumCulled={false} renderOrder={7} />;
}
