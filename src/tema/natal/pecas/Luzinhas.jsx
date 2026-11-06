/*
 * Luzinhas: lâmpadas instanciadas (uma InstancedMesh) e os halos delas (um
 * Points aditivo). A cor de cada lâmpada é posta na criação; o pisca é feito no
 * shader, com um tempo compartilhado por todas e a fase de cada lâmpada num
 * atributo (aFase), sem reenviar buffer a cada frame. Ficam na CAMADA_BRILHO.
 */
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { novaTextura } from '../../../pages/Suporte/quadro/texturas.js';
import { CAMADA_BRILHO, useHabilitarBrilho } from '../camadas.js';
import { movimentoReduzido } from '../movimento.js';
import { corNatal, coresLuzinhas } from '../paleta.js';

// Uniforms de todas as lâmpadas: o tempo e "parado" (movimento reduzido: acesas em 0,9).
const PISCA = { uTempo: { value: 0 }, uFixo: { value: 0 } };
// Halo: diâmetro em múltiplos do raio da lâmpada.
const TAMANHO_HALO = 6;

/*
 * Brilho 0,75 + 0,25·sin(t·v + fase), com v entre 0,6 e 1,4 rad/s tirado da fase.
 * A função é a mesma para lâmpadas e halos: o three reaproveita o programa.
 */
function piscar(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTempo = PISCA.uTempo;
    shader.uniforms.uFixo = PISCA.uFixo;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aFase;\nuniform float uTempo;\nuniform float uFixo;\nvarying float vBrilho;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat vel = 0.6 + 0.8 * fract(aFase * 1.618);\nvBrilho = mix(0.75 + 0.25 * sin(uTempo * vel + aFase), 0.9, uFixo);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBrilho;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vBrilho;');
  };
  return material;
}

// Brilho radial dos halos: criado no 1º uso e compartilhado (nunca descartado).
let texturaHalo = null;
const halo = () =>
  (texturaHalo ??= novaTextura(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }));

const xyz = (p) => (Array.isArray(p) ? p : [p.x, p.y, p.z]);
// Fase estável (0..2π) a partir da posição: lâmpadas vizinhas não piscam juntas.
const faseDe = ([x, y, z]) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return (s - Math.floor(s)) * Math.PI * 2;
};

function montarLampadas(lista, cores, raio, preparar) {
  const geometria = new THREE.SphereGeometry(raio, 8, 6);
  geometria.setAttribute('aFase', new THREE.InstancedBufferAttribute(Float32Array.from(lista, faseDe), 1));
  const material = preparar(piscar(new THREE.MeshBasicMaterial({ toneMapped: false })));
  const malha = new THREE.InstancedMesh(geometria, material, lista.length);
  const matriz = new THREE.Matrix4();
  const cor = new THREE.Color();
  lista.forEach(([x, y, z], i) => {
    malha.setMatrixAt(i, matriz.makeTranslation(x, y, z));
    malha.setColorAt(i, cor.set(corNatal(cores[i % cores.length])));
  });
  malha.instanceMatrix.needsUpdate = true;
  malha.instanceColor.needsUpdate = true;
  malha.computeBoundingSphere();
  return malha;
}

function montarHalos(lista, cores, raio, preparar) {
  const cor = new THREE.Color();
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(lista.flat(), 3));
  geometria.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(lista.flatMap((_, i) => cor.set(corNatal(cores[i % cores.length])).toArray()), 3),
  );
  geometria.setAttribute('aFase', new THREE.Float32BufferAttribute(lista.map(faseDe), 1));
  const material = new THREE.PointsMaterial({
    size: raio * TAMANHO_HALO,
    map: halo(),
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return new THREE.Points(geometria, preparar(piscar(material)));
}

const semPreparo = (material) => material;

/**
 * @param {object} props
 * @param {Array<[number, number, number] | { x: number, y: number, z: number }>} props.pontos centro de cada lâmpada (local)
 * @param {string[]} [props.cores] chave da paleta ou hex por lâmpada (repete se for mais curta); padrão 70/15/15
 * @param {number} [props.raio] raio da lâmpada (m); o halo tem 6× isso de diâmetro
 * @param {boolean} [props.halo] false: só as lâmpadas
 * @param {number} [props.camada] camada das lâmpadas e halos (padrão CAMADA_BRILHO)
 * @param {(m: THREE.Material) => THREE.Material} [props.prepararMaterial] ajusta os materiais (ex.: natural()). Passe uma função estável.
 */
export default function Luzinhas({
  pontos,
  cores,
  raio = 0.022,
  halo: comHalo = true,
  camada = CAMADA_BRILHO,
  prepararMaterial = semPreparo,
  ...props
}) {
  useHabilitarBrilho(camada === CAMADA_BRILHO);
  const lista = pontos.map(xyz);
  // Recria só quando os números mudam, não a cada lista nova do pai.
  const chave = `${lista.flat().map((v) => v.toFixed(4))}|${cores ?? ''}|${raio}|${comHalo}|${camada}`;

  const pecas = useMemo(() => {
    if (lista.length === 0) return [];
    const usadas = cores?.length ? cores : coresLuzinhas(lista.length);
    const objetos = [montarLampadas(lista, usadas, raio, prepararMaterial)];
    if (comHalo) objetos.push(montarHalos(lista, usadas, raio, prepararMaterial));
    objetos.forEach((objeto) => objeto.layers.set(camada));
    return objetos;
  }, [chave, prepararMaterial]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () =>
      pecas.forEach((objeto) => {
        objeto.geometry.dispose();
        objeto.material.dispose();
        objeto.dispose?.();
      }),
    [pecas],
  );

  useFrame(({ clock }) => {
    PISCA.uTempo.value = clock.elapsedTime;
    PISCA.uFixo.value = movimentoReduzido() ? 1 : 0;
  });

  return (
    <group {...props}>
      {pecas.map((objeto) => (
        <primitive key={objeto.uuid} object={objeto} />
      ))}
    </group>
  );
}
