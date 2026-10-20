/*
 * Paisagem viva atrás do vidro: céu e morros pintados num cilindro, chão de
 * grama, nuvens passando, árvores balançando, flores, pássaros e borboletas (de
 * dia) e vaga-lumes (à noite). Cores e bichos seguem o período do dia (tema).
 * Tudo usa o material `natural` (só aparece dentro do vidro) e fica na camada 1.
 * As animações mutam os objetos no useFrame, sem setState por frame.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { G, fosco, natural, rnd, textura, useCamada, useDescartar } from './comum.js';
import { ESCALA_ARCO, NATUREZA, TAPETE, noArco } from './planta.js';

// Cor da natureza ajustada ao horário: escurece e puxa para o tom do céu.
const tingir = (hex, tema) => {
  const n = tema.natureza;
  return new THREE.Color(hex).multiplyScalar(n.brilho).lerp(new THREE.Color(n.tom), n.forca).getStyle();
};

const BASE = {
  grama: '#8CCB66',
  tronco: '#8A5A36',
  copa: ['#4FA35A', '#5DB565', '#3F8F4E'],
  flor: ['#FFD84B', '#FF8FA3', '#FFFFFF'],
};

function pintarCeu(ctx, w, h, tema) {
  const ceu = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  ceu.addColorStop(0, tema.ceu[0]);
  ceu.addColorStop(0.55, tema.ceu[1]);
  ceu.addColorStop(1, tema.ceu[2]);
  ctx.fillStyle = ceu;
  ctx.fillRect(0, 0, w, h * 0.62);

  if (tema.estrelas) {
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 260; i++) {
      ctx.globalAlpha = 0.35 + ((i * 7) % 10) / 15;
      ctx.beginPath();
      ctx.arc((i * 397.13) % w, (i * 151.7) % (h * 0.5), 1 + (i % 3) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Sol ou lua, com halo.
  const { astro } = tema;
  const sx = w * astro.x;
  const sy = h * astro.y;
  const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 170);
  halo.addColorStop(0, `${astro.halo}0.95)`);
  halo.addColorStop(0.25, `${astro.halo}0.55)`);
  halo.addColorStop(1, `${astro.halo}0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(sx, sy, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = astro.cor;
  ctx.beginPath();
  ctx.arc(sx, sy, astro.tipo === 'lua' ? 34 : 42, 0, Math.PI * 2);
  ctx.fill();
  if (astro.tipo === 'lua') {
    ctx.fillStyle = 'rgba(160,165,190,0.35)';
    [[-10, -8, 8], [12, 6, 6], [-4, 14, 5]].forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(sx + dx, sy + dy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function pintarTerra(ctx, w, h, tema) {
  const T = (hex) => tingir(hex, tema);
  // Morros, do mais longe ao mais perto.
  const morro = (base, amp, freq, fase, cor) => {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const u = (x / w) * Math.PI * 2 * freq;
      ctx.lineTo(x, base - amp * (0.6 * Math.sin(u + fase) + 0.4 * Math.sin(u * 2.3 + fase * 1.7)));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  };
  morro(h * 0.56, h * 0.05, 3, 0.4, T('#A9CFC2')); // serra azulada ao longe
  morro(h * 0.6, h * 0.045, 4, 1.8, T('#86BF8C'));
  morro(h * 0.65, h * 0.04, 5, 3.1, T('#6FB06A'));

  // Copas distantes.
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = T(i % 3 ? '#4E9A55' : '#3F8A4B');
    ctx.beginPath();
    ctx.arc(((i * 137.5) % 1) * w + ((i * 97) % w), h * (0.6 + ((i * 53) % 7) / 100), 10 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Campo com florzinhas amarelas e um caminho de terra.
  const campo = ctx.createLinearGradient(0, h * 0.66, 0, h);
  campo.addColorStop(0, T('#9BD06A'));
  campo.addColorStop(1, T('#7DBE57'));
  ctx.fillStyle = campo;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);
  for (let i = 0; i < 900; i++) {
    const y = h * 0.7 + ((i * 89.3) % (h * 0.3));
    ctx.fillStyle = T(i % 5 ? '#F6D84B' : '#FFF3A0');
    ctx.beginPath();
    ctx.arc((i * 211.37) % w, y, 2 + (y / h) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = T('#D9C08A');
  ctx.beginPath();
  ctx.moveTo(w * 0.47, h * 0.68);
  ctx.quadraticCurveTo(w * 0.52, h * 0.82, w * 0.44, h);
  ctx.lineTo(w * 0.56, h);
  ctx.quadraticCurveTo(w * 0.57, h * 0.8, w * 0.49, h * 0.68);
  ctx.fill();
}

const pintarPaisagem = (tema) => (ctx, w, h) => {
  pintarCeu(ctx, w, h, tema);
  pintarTerra(ctx, w, h, tema);
};

const criarMateriais = () => ({
  fundo: natural(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
  grama: natural(fosco(BASE.grama, 0.95)),
  nuvem: natural(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, emissive: '#FFFFFF', emissiveIntensity: 0.25 })),
  tronco: natural(fosco(BASE.tronco)),
  copa: BASE.copa.map((cor) => natural(fosco(cor, 0.9))),
  passaro: natural(fosco('#3B3F4A')),
  borboleta: ['#FF9F43', '#FFD23F', '#9B8CFF'].map((cor) => natural(fosco(cor, 0.7))),
  flor: BASE.flor.map((cor) => natural(fosco(cor, 0.7))),
  vagalume: natural(new THREE.MeshBasicMaterial({ color: '#FFF27A', toneMapped: false })),
});

// Posições sorteadas uma vez (sempre as mesmas: rnd é determinístico).
const NUVENS = Array.from({ length: 7 }, (_, i) => ({
  a: 20 + i * 24 + rnd(i) * 10,
  y: 1.75 + rnd(i, 2) * 0.55,
  vel: 0.9 + rnd(i, 3) * 0.8,
  esc: 0.7 + rnd(i, 4) * 0.5,
  bolas: Array.from({ length: 5 }, (_, k) => {
    const curva = Math.sin((k / 4) * Math.PI);
    return [(k - 2) * 0.32 + rnd(i * 9 + k) * 0.1, curva * 0.18, rnd(k, i) * 0.2, 0.32 + curva * 0.18];
  }),
}));
const ARVORES = Array.from({ length: 13 }, (_, i) => ({
  ...noArco(14 + i * 12.5 + rnd(i, 5) * 5, 0.9 + rnd(i, 6) * 1.0),
  alt: 1.0 + rnd(i, 7) * 0.8,
  fase: rnd(i, 8) * 6,
  cor: i % 3,
}));
const FLORES = Array.from({ length: 60 }, (_, i) => ({
  ...noArco(12 + rnd(i, 9) * 156, 0.25 + rnd(i, 10) * 1.6),
  cor: i % 3,
  s: 0.05 + rnd(i, 11) * 0.04,
}));
const VAGALUMES = Array.from({ length: 28 }, (_, i) => ({
  a: 14 + rnd(i, 12) * 152,
  extra: 0.3 + rnd(i, 13) * 1.8,
  y: 0.25 + rnd(i, 14) * 1.3,
  fase: rnd(i, 15) * 6,
}));
const TRES = [0, 1, 2];

const { afastamento: AF, altura: H } = NATUREZA;
const SX = TAPETE.rx * ESCALA_ARCO + AF;
const SZ = TAPETE.rz * ESCALA_ARCO + AF;

export default function Paisagem({ tema }) {
  const grupo = useRef(null);
  useCamada(grupo);

  const M = useMemo(criarMateriais, []);
  useDescartar(M);

  // Céu e morros: pintados de novo só quando o período do dia muda.
  const fundoTex = useMemo(() => textura(2048, 640, pintarPaisagem(tema)), [tema]);
  useEffect(() => () => fundoTex.dispose(), [fundoTex]);

  useEffect(() => {
    M.fundo.map = fundoTex;
    M.fundo.needsUpdate = true;
    M.grama.color.set(tingir(BASE.grama, tema));
    M.tronco.color.set(tingir(BASE.tronco, tema));
    M.copa.forEach((m, i) => m.color.set(tingir(BASE.copa[i], tema)));
    M.flor.forEach((m, i) => m.color.set(tingir(BASE.flor[i], tema)));
    M.nuvem.color.set(tema.nuvem);
    M.nuvem.emissive.set(tema.nuvem);
    M.nuvem.emissiveIntensity = tema.periodo === 'noite' ? 0.08 : 0.25;
  }, [tema, fundoTex, M]);

  // Cilindro elíptico aberto atrás do arco e o anel de grama entre o vidro e ele.
  const fundoGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, H, 96, 1, true, Math.PI / 2 + 0.08, Math.PI - 0.16), []);
  const gramaGeo = useMemo(() => new THREE.RingGeometry(0.68, 1.02, 96, 1, 0, Math.PI), []);
  useEffect(() => () => [fundoGeo, gramaGeo].forEach((g) => g.dispose()), [fundoGeo, gramaGeo]);

  const nuvens = useRef([]);
  const arvores = useRef([]);
  const passaros = useRef([]);
  const borboletas = useRef([]);
  const vagalumes = useRef([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Nuvens atravessam o arco devagar e voltam do outro lado.
    NUVENS.forEach((n, i) => {
      const g = nuvens.current[i];
      if (!g) return;
      const p = noArco(175 - ((n.a + t * n.vel) % 170), AF - 0.25);
      g.position.set(p.x, n.y + Math.sin(t * 0.4 + i) * 0.04, p.z);
      g.lookAt(0, n.y, 0);
    });
    // Árvores balançam com o vento (uns 2°).
    ARVORES.forEach((a, i) => {
      const g = arvores.current[i];
      if (g) g.rotation.z = Math.sin(t * 0.9 + a.fase) * 0.035 + Math.sin(t * 2.3 + a.fase) * 0.012;
    });
    // Pássaros voam em arco batendo as asas.
    passaros.current.forEach((g, i) => {
      if (!g) return;
      const ciclo = 26 + i * 7;
      const u = ((t + i * 9) % ciclo) / ciclo;
      const extra = 1.1 + i * 0.35;
      const p = noArco(170 - u * 160, extra);
      const adiante = noArco(169 - u * 160, extra);
      g.position.set(p.x, 2.05 + i * 0.12 + Math.sin(t * 1.7 + i) * 0.08, p.z);
      g.lookAt(adiante.x, g.position.y, adiante.z);
      const asa = Math.sin(t * 13 + i) * 0.7;
      g.children[0].rotation.z = asa;
      g.children[1].rotation.z = -asa;
    });
    // Borboletas em zigue-zague perto do chão.
    borboletas.current.forEach((g, i) => {
      if (!g) return;
      const p = noArco(40 + i * 50 + Math.sin(t * 0.3 + i) * 18, 0.6 + Math.sin(t * 0.7 + i * 2) * 0.3);
      g.position.set(p.x, 0.55 + Math.sin(t * 2.1 + i) * 0.18, p.z);
      g.rotation.y = t * 0.6 + i;
      const asa = Math.abs(Math.sin(t * 16 + i)) * 1.1;
      g.children[0].rotation.z = asa;
      g.children[1].rotation.z = -asa;
    });
    // Vaga-lumes flutuam e piscam.
    vagalumes.current.forEach((m, i) => {
      if (!m) return;
      const v = VAGALUMES[i];
      const p = noArco(v.a + Math.sin(t * 0.2 + v.fase) * 4, v.extra + Math.sin(t * 0.5 + v.fase) * 0.2);
      m.position.set(p.x, v.y + Math.sin(t * 0.9 + v.fase) * 0.15, p.z);
      m.scale.setScalar(0.035 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 2.2 + v.fase * 3))));
    });
  });

  return (
    <group ref={grupo} name="paisagem">
      <mesh geometry={fundoGeo} material={M.fundo} position-y={H / 2 - 1.0} scale={[SX, 1, SZ]} renderOrder={1} />
      <mesh geometry={gramaGeo} material={M.grama} rotation-x={-Math.PI / 2} position-y={-0.03} scale={[SX, SZ, 1]} renderOrder={1} />

      {NUVENS.map((n, i) => (
        <group key={i} ref={(g) => {
            nuvens.current[i] = g;
          }} scale={n.esc}>
          {n.bolas.map(([x, y, z, r], k) => (
            <mesh key={k} geometry={G.esfera} material={M.nuvem} position={[x, y, z]} scale={[r * 2, r * 1.6, r * 1.6]} renderOrder={1} />
          ))}
        </group>
      ))}

      {ARVORES.map((a, i) => (
        <group key={i} position={[a.x, -0.05, a.z]}>
          <group ref={(g) => {
            arvores.current[i] = g;
          }} scale={a.alt}>
            <mesh geometry={G.cil} material={M.tronco} position-y={0.35} scale={[0.14, 0.7, 0.14]} renderOrder={1} />
            <mesh geometry={G.esfera} material={M.copa[a.cor]} position-y={0.95} scale={[0.85, 0.75, 0.85]} renderOrder={1} />
            <mesh geometry={G.esfera} material={M.copa[(a.cor + 1) % 3]} position={[0.22, 1.25, 0.05]} scale={[0.6, 0.55, 0.6]} renderOrder={1} />
            <mesh geometry={G.esfera} material={M.copa[(a.cor + 2) % 3]} position={[-0.2, 1.18, -0.05]} scale={[0.55, 0.5, 0.55]} renderOrder={1} />
          </group>
        </group>
      ))}

      {FLORES.map((f, i) => (
        <mesh key={i} geometry={G.esfera} material={M.flor[f.cor]} position={[f.x, f.s, f.z]} scale={f.s * 2} renderOrder={1} />
      ))}

      {tema.vagalumes &&
        VAGALUMES.map((_, i) => (
          <mesh key={i} ref={(m) => {
            vagalumes.current[i] = m;
          }} geometry={G.esfera} material={M.vagalume} scale={0.001} renderOrder={1} />
        ))}

      {tema.bichos &&
        TRES.map((i) => (
          <group key={i} ref={(g) => {
            passaros.current[i] = g;
          }}>
            <group>
              <mesh geometry={G.arred} material={M.passaro} position-x={-0.11} scale={[0.22, 0.025, 0.08]} renderOrder={1} />
            </group>
            <group>
              <mesh geometry={G.arred} material={M.passaro} position-x={0.11} scale={[0.22, 0.025, 0.08]} renderOrder={1} />
            </group>
          </group>
        ))}
      {tema.bichos &&
        TRES.map((i) => (
          <group key={i} ref={(g) => {
            borboletas.current[i] = g;
          }}>
            <group>
              <mesh geometry={G.esfera} material={M.borboleta[i]} position-x={-0.07} scale={[0.14, 0.02, 0.1]} renderOrder={1} />
            </group>
            <group>
              <mesh geometry={G.esfera} material={M.borboleta[i]} position-x={0.07} scale={[0.14, 0.02, 0.1]} renderOrder={1} />
            </group>
          </group>
        ))}
    </group>
  );
}
