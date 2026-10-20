import * as THREE from 'three';

// Ciano-esverdeado do holograma: casa com o fundo azul-acinzentado do card.
export const COR_HOLO = '#5fe8d6';

/** Uniforms de um boneco, compartilhados por todos os materiais dele. */
export function criarUniformes() {
  return {
    uTempo: { value: 0 },
    // 0 = invisível, 1 = inteiro; o corte sobe da base ao topo.
    uProgresso: { value: 0 },
    uBase: { value: 0 },
    uAltura: { value: 2.1 },
    uGlitch: { value: 0 },
    uBrilho: { value: 1 },
    uCorHolo: { value: new THREE.Color(COR_HOLO) },
  };
}

export const RUIDO_GLSL = /* glsl */ `
float holoHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float holoRuido(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(holoHash(i), holoHash(i + vec2(1.0, 0.0)), f.x),
             mix(holoHash(i + vec2(0.0, 1.0)), holoHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const VERTICE_TOPO = /* glsl */ `
uniform float uTempo;
uniform float uGlitch;
varying vec3 vHoloPos;
${RUIDO_GLSL}
`;

// Posição no mundo + deslocamento horizontal em faixas (glitch das transições).
const VERTICE_FIM = /* glsl */ `
#include <project_vertex>
vec4 holoMundo = modelMatrix * vec4(transformed, 1.0);
float holoQuadro = floor(uTempo * 24.0);
float holoFaixa = floor(holoMundo.y * 16.0);
float holoSorteio = step(0.6, holoHash(vec2(holoFaixa * 1.7, holoQuadro)));
holoMundo.x += (holoHash(vec2(holoFaixa, holoQuadro)) - 0.5) * holoSorteio * uGlitch * 0.18;
vHoloPos = holoMundo.xyz;
if (uGlitch > 0.001) gl_Position = projectionMatrix * viewMatrix * holoMundo;
`;

const FRAGMENTO_TOPO = /* glsl */ `
uniform float uTempo;
uniform float uProgresso;
uniform float uBase;
uniform float uAltura;
uniform float uGlitch;
uniform float uBrilho;
uniform vec3 uCorHolo;
varying vec3 vHoloPos;
${RUIDO_GLSL}
`;

// Materializa: o que está acima do corte (com borda irregular) não aparece.
const FRAGMENTO_CORTE = /* glsl */ `
#include <clipping_planes_fragment>
float holoH = (vHoloPos.y - uBase) / uAltura;
float holoCorte = uProgresso * 1.24 - 0.12
  + (holoRuido(vec2(atan(vHoloPos.z, vHoloPos.x) * 3.0, vHoloPos.y * 14.0)) - 0.5) * 0.07;
if (holoH > holoCorte) discard;
`;

// Tratamento de holograma por cima da cor do boneco: mantém as cores, puxa um
// pouco para o ciano, soma fresnel, scanlines, faixa de varredura e a borda do corte.
const FRAGMENTO_FIM = /* glsl */ `
#include <opaque_fragment>
vec3 holoV = normalize(vViewPosition);
float holoFresnel = pow(1.0 - clamp(abs(dot(normal, holoV)), 0.0, 1.0), 2.8);
float holoLinha = 0.5 + 0.5 * sin(vHoloPos.y * 210.0 - uTempo * 2.6);
float holoPosVarre = uBase - 0.3 + fract(uTempo * 0.16) * (uAltura + 0.6);
float holoVarre = exp(-pow((vHoloPos.y - holoPosVarre) * 10.0, 2.0));
float holoBorda = smoothstep(0.06, 0.0, holoCorte - holoH) * step(holoCorte, 1.08);

vec3 holoCor = gl_FragColor.rgb;
holoCor = mix(holoCor, holoCor * vec3(0.88, 1.0, 1.06), 0.6);
holoCor += uCorHolo * (holoFresnel * 0.7 + holoVarre * 0.2 + holoBorda * 1.6);
holoCor *= mix(0.86, 1.05, holoLinha) * uBrilho;
// Aberração cromática leve, só com glitch (sem glitch, nem calcula o ruído).
if (uGlitch > 0.001) {
  float holoSplit = (holoRuido(vec2(vHoloPos.y * 30.0, uTempo * 20.0)) - 0.5) * uGlitch;
  holoCor.r *= 1.0 + holoSplit * 0.9;
  holoCor.b *= 1.0 - holoSplit * 0.9;
}

float holoAlfa = mix(0.78, 0.95, holoLinha);
holoAlfa = clamp(max(holoAlfa, holoFresnel * 1.1) + holoBorda, 0.0, 1.0);
gl_FragColor = vec4(holoCor, gl_FragColor.a * holoAlfa);
`;

/**
 * Cópia de um material do boneco com o shader de holograma. O original fica
 * intocado (é compartilhado com as outras cenas). Quem chama descarta a cópia.
 */
export function holografar(original, uniformes) {
  const material = original.isMeshBasicMaterial
    ? new THREE.MeshStandardMaterial({
        color: original.color,
        emissive: original.color,
        roughness: 1,
        transparent: original.transparent,
        opacity: original.opacity,
      })
    : original.clone();
  material.transparent = true;
  material.depthWrite = original.depthWrite;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = VERTICE_TOPO + shader.vertexShader.replace('#include <project_vertex>', VERTICE_FIM);
    shader.fragmentShader =
      FRAGMENTO_TOPO +
      shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', FRAGMENTO_CORTE)
        .replace('#include <opaque_fragment>', FRAGMENTO_FIM);
  };
  material.customProgramCacheKey = () => 'holo-boneco-1';
  return material;
}

/**
 * Passe só de profundidade do boneco: o mesmo corte e o mesmo glitch do
 * holograma, mas sem luz nem cor (antes usava o shader PBR inteiro só para
 * gravar profundidade). Quem chama descarta.
 */
export function materialProfundidade(uniformes) {
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false,
    polygonOffset: true,
    // Um fio atrás da superfície: a cor da mesma peça passa no teste sem z-fighting.
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 2,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformes);
    shader.vertexShader = VERTICE_TOPO + shader.vertexShader.replace('#include <project_vertex>', VERTICE_FIM);
    shader.fragmentShader =
      FRAGMENTO_TOPO + shader.fragmentShader.replace('#include <clipping_planes_fragment>', FRAGMENTO_CORTE);
  };
  material.customProgramCacheKey = () => 'holo-profundidade-1';
  return material;
}
