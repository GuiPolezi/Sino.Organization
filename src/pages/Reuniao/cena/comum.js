/*
 * Peças comuns do cenário de reunião: geometrias compartilhadas, materiais e a
 * técnica da paisagem só dentro do vidro.
 *
 * Stencil: cada trecho da parede desenha uma máscara invisível (MAT_MASCARA) e
 * os materiais da natureza (natural) só pintam onde há máscara. Assim o fundo
 * da página continua liso fora das janelas. O <Canvas> precisa de stencil: true.
 *
 * Camada 1: a natureza e as máscaras ficam nela. As sombras de contato só veem
 * a camada 0 (nada da natureza vira sombra no tapete) e os cliques também.
 */
import { useEffect, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const CAMADA_NATUREZA = 1;
const MASCARA = 1; // valor gravado no stencil

// Geometrias unitárias, escaladas por peça (criadas uma vez para a página).
export const G = {
  caixa: new THREE.BoxGeometry(1, 1, 1),
  arred: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
  cone: new THREE.CylinderGeometry(0.32, 0.5, 1, 20),
  esfera: new THREE.SphereGeometry(0.5, 24, 16),
  plano: new THREE.PlaneGeometry(1, 1),
  disco: new THREE.CircleGeometry(1, 96),
};

export const fosco = (color, roughness = 0.82) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });

// Material da natureza: só aparece onde a máscara dos vidros marcou o stencil.
export const natural = (material) =>
  Object.assign(material, {
    stencilWrite: true,
    stencilRef: MASCARA,
    stencilFunc: THREE.EqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp,
  });

export const MAT_MASCARA = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  stencilWrite: true,
  stencilRef: MASCARA,
  stencilFunc: THREE.AlwaysStencilFunc,
  stencilZPass: THREE.ReplaceStencilOp,
});

// Textura desenhada num canvas 2D.
export function textura(largura, altura, desenhar) {
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  desenhar(canvas.getContext('2d'), largura, altura);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Libera os materiais (e listas deles) de um objeto ao desmontar.
export function useDescartar(materiais) {
  useEffect(
    () => () =>
      Object.values(materiais)
        .flat()
        .forEach((material) => material?.dispose?.()),
    [materiais],
  );
}

// Põe o grupo (e tudo dentro) só na camada da natureza. Sem dependências: roda a
// cada render, porque bichos e vaga-lumes entram e saem com o horário.
export function useCamada(ref) {
  useLayoutEffect(() => {
    ref.current?.traverse((objeto) => objeto.layers.set(CAMADA_NATUREZA));
  });
}

// A câmera precisa enxergar a camada da natureza.
export function HabilitarCamada() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.layers.enable(CAMADA_NATUREZA);
    return () => camera.layers.disable(CAMADA_NATUREZA);
  }, [camera]);
  return null;
}

// Número pseudo-aleatório estável (0..1) a partir de um índice: a paisagem é sempre a mesma.
export const rnd = (i, k = 1) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
