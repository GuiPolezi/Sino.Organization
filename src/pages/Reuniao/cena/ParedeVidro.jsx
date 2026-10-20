/*
 * Parede de vidro: uma só, contínua, em arco no fundo do tapete. Cada trecho
 * reto tem a máscara da paisagem (stencil), o vidro levemente azulado, os
 * reflexos diagonais (recortados pela própria máscara), a moldura e, num deles,
 * o logo da empresa.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { G, MAT_MASCARA, fosco, natural, textura, useCamada, useDescartar } from './comum.js';
import { LOGO, PAINEIS, VIDRO } from './planta.js';

function desenharLogo(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (LOGO.texto) {
    ctx.fillStyle = LOGO.cor;
    ctx.font = '800 120px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOGO.texto, w / 2, h / 2);
    return;
  }
  // Quadrado arredondado vazado, com volume leve de massinha.
  const anel = (cor, dx, dy) => {
    ctx.save();
    ctx.translate(w / 2 + dx, h / 2 + dy);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.roundRect(-190, -190, 380, 380, 110);
    ctx.roundRect(-95, -95, 190, 190, 48);
    ctx.fill('evenodd');
    ctx.restore();
  };
  anel('rgba(0,0,0,0.18)', 10, 14);
  anel(LOGO.cor, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.translate(w / 2, h / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(-170, -175, 300, 40, 20);
  ctx.fill();
  ctx.restore();
}

// Logo desenhado; com LOGO.imagem, a imagem substitui o desenho quando carregar.
function useTexturaLogo() {
  const tex = useMemo(() => textura(512, 512, desenharLogo), []);
  useEffect(() => {
    if (!LOGO.imagem) return undefined;
    let vivo = true;
    new THREE.TextureLoader().setCrossOrigin('anonymous').load(LOGO.imagem, (carregada) => {
      if (!vivo) return;
      const { image } = carregada;
      const canvas = tex.image;
      const ctx = canvas.getContext('2d');
      const r = Math.min(canvas.width / image.width, canvas.height / image.height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, (canvas.width - image.width * r) / 2, (canvas.height - image.height * r) / 2, image.width * r, image.height * r);
      tex.needsUpdate = true;
      carregada.dispose();
    });
    return () => {
      vivo = false;
    };
  }, [tex]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

const criarMateriais = () => ({
  moldura: fosco('#4E6470', 0.6),
  vidro: new THREE.MeshStandardMaterial({
    color: '#D3F1FF',
    transparent: true,
    opacity: 0.2,
    roughness: 0.1,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  // Os reflexos também usam a máscara: nunca passam da borda do vidro.
  reflexo: natural(
    new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  ),
});

const REFLEXOS = [
  [-0.22, 0.28],
  [0.18, 0.12],
];

function Trecho({ p, M, logo }) {
  const W = p.largura;
  const H = VIDRO.altura;
  const E = VIDRO.espessuraMoldura;
  const mascara = useRef(null);
  useCamada(mascara);

  return (
    <group position={[p.x, 0, p.z]} rotation-y={p.rot}>
      {/* Máscara invisível: a natureza aparece só aqui dentro. */}
      <group ref={mascara}>
        <mesh geometry={G.plano} material={MAT_MASCARA} position-y={H / 2} scale={[W + 0.02, H - E, 1]} renderOrder={-10} />
      </group>
      {/* Trilhos de baixo e de cima, contínuos de um trecho ao outro. */}
      <mesh geometry={G.caixa} material={M.moldura} position-y={E / 2 + 0.02} scale={[W + 0.06, E + 0.04, 0.12]} />
      <mesh geometry={G.caixa} material={M.moldura} position-y={H - E / 2} scale={[W + 0.06, E, 0.12]} />
      {/* Montante na junção da esquerda e, no último trecho, na ponta direita. */}
      <mesh geometry={G.arred} material={M.moldura} position={[-W / 2, H / 2, 0]} scale={[p.primeiro ? E + 0.04 : E, H, 0.13]} />
      {p.ultimo && <mesh geometry={G.arred} material={M.moldura} position={[W / 2, H / 2, 0]} scale={[E + 0.04, H, 0.13]} />}
      {/* Vidro e reflexos. */}
      <mesh geometry={G.plano} material={M.vidro} position-y={H / 2} scale={[W, H - E, 1]} />
      {REFLEXOS.map(([f, l], i) => (
        <mesh
          key={i}
          geometry={G.plano}
          material={M.reflexo}
          position={[f * W + (p.indice % 2) * 0.15, H / 2 + 0.1, 0.012]}
          rotation-z={-0.55}
          scale={[l, H * 0.9, 1]}
        />
      ))}
      {p.indice === LOGO.trecho && (
        <mesh geometry={G.plano} position={[LOGO.x, LOGO.y, 0.03]} rotation-z={LOGO.giro} scale={LOGO.tamanho}>
          <meshBasicMaterial map={logo} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export default function ParedeVidro() {
  const M = useMemo(criarMateriais, []);
  useDescartar(M);
  const logo = useTexturaLogo();

  return (
    <group name="parede-de-vidro">
      {PAINEIS.map((p) => (
        <Trecho key={p.indice} p={p} M={M} logo={logo} />
      ))}
    </group>
  );
}
