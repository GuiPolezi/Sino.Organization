/*
 * Neve de spray no vidro: nos cantos de baixo dos trechos das pontas, um arco
 * de neve com flocos de estêncil. Uma textura só (o canto da direita usa o
 * desenho espelhado) e os oito planos numa geometria: um draw call. Fica no
 * vidro, na camada 0, sem a máscara da paisagem.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { corNatal } from '../../../../tema/natal/paleta.js';
import { textura } from '../comum.js';
import { NEVE, PLANOS_NEVE } from './pontos.js';

// Floco de 6 pontas, com um "v" em cada ponta, como um estêncil de vitrine.
function floco(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.moveTo(-r * 0.22, -r * 0.72);
    ctx.lineTo(0, -r * 0.52);
    ctx.lineTo(r * 0.22, -r * 0.72);
    ctx.stroke();
  }
  ctx.restore();
}

// Canto de baixo à esquerda: o monte de neve sobe pela lateral e desce até o trilho.
function desenharNeve(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.18);
  ctx.bezierCurveTo(w * 0.08, h * 0.42, w * 0.3, h * 0.6, w * 0.52, h * 0.78);
  ctx.bezierCurveTo(w * 0.66, h * 0.88, w * 0.82, h * 0.92, w, h * 0.95);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // Borda borrifada: pontinhos soltos acima do monte.
  for (let i = 0; i < 140; i++) {
    const u = (i * 0.618) % 1;
    const x = u * w;
    const borda = h * (0.18 + 0.77 * Math.min(1, u * 1.35) ** 0.8);
    ctx.globalAlpha = 0.35 + ((i * 7) % 10) / 20;
    ctx.beginPath();
    ctx.arc(x, borda - ((i * 37) % 26) - 4, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  [[0.34, 0.3, 30], [0.62, 0.42, 22], [0.82, 0.2, 26], [0.18, 0.08, 16]].forEach(([fx, fy, r]) => floco(ctx, fx * w, fy * h, r));
  ctx.globalAlpha = 1;
}

// Um plano por canto, já no lugar; o espelhado troca o u da UV.
function montarPlanos() {
  const planos = PLANOS_NEVE.map(({ centro, rot, espelhado }) => {
    const plano = new THREE.PlaneGeometry(NEVE.largura, NEVE.altura);
    if (espelhado) {
      const uv = plano.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    }
    return plano.rotateY(rot).translate(...centro);
  });
  const unica = mergeGeometries(planos);
  planos.forEach((plano) => plano.dispose());
  return unica;
}

export default function NeveNoVidro() {
  const pecas = useMemo(() => {
    const mapa = textura(512, 342, desenharNeve);
    const material = new THREE.MeshBasicMaterial({
      color: corNatal('neve'),
      map: mapa,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    return { geometria: montarPlanos(), mapa, material };
  }, []);
  useEffect(
    () => () => {
      pecas.geometria.dispose();
      pecas.mapa.dispose();
      pecas.material.dispose();
    },
    [pecas],
  );
  return <mesh name="natal-neve-vidro" geometry={pecas.geometria} material={pecas.material} />;
}
