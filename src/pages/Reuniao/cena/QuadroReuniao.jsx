/*
 * Quadro da reunião: lousa num cavalete de madeira clara, de frente para a
 * câmera, com "reunião de hoje", o título escrito à mão (Caveat, encolhe até
 * caber em 3 linhas), um sublinhado e o horário embaixo. Lê a reunião da página.
 */
import '@fontsource/caveat/latin-600.css';
import '@fontsource/caveat/latin-700.css';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { detalheDoQuadro, useReuniao } from '../store.js';
import { G, fosco, textura, useDescartar } from './comum.js';
import { QUADRO_REUNIAO } from './planta.js';

const MAO = '"Caveat", "Segoe Print", "Comic Sans MS", cursive';

function quebrarLinhas(ctx, texto, largura) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/)) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

const desenharQuadro = (titulo, detalhe) => (ctx, w, h) => {
  ctx.fillStyle = '#F6F6F2';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#8A93A6';
  ctx.beginPath();
  ctx.ellipse(w * 0.72, h * 0.8, 180, 18, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#9AA3B5';
  ctx.font = `600 40px ${MAO}`;
  ctx.textAlign = 'left';
  ctx.fillText('reunião de hoje', 56, 76);

  // Título: a maior fonte que caiba em até 3 linhas.
  let tamanho = 120;
  let linhas;
  do {
    ctx.font = `700 ${tamanho}px ${MAO}`;
    linhas = quebrarLinhas(ctx, titulo || '—', w - 112);
    tamanho -= 6;
  } while ((linhas.length > 3 || linhas.length * tamanho * 1.02 > h * 0.6) && tamanho > 40);
  ctx.fillStyle = '#1F2433';
  const altLinha = tamanho + 6;
  linhas.forEach((linha, i) => ctx.fillText(linha, 56, 100 + altLinha * (i + 0.9)));

  // Sublinhado à mão, até o fim da última linha.
  const yS = 100 + altLinha * (linhas.length + 0.9) - altLinha * 0.72;
  ctx.strokeStyle = '#2E8C93';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(56, yS);
  ctx.quadraticCurveTo(w * 0.35, yS + 12, Math.min(w - 60, 56 + ctx.measureText(linhas.at(-1)).width), yS - 2);
  ctx.stroke();

  if (detalhe) {
    ctx.fillStyle = '#5B6274';
    ctx.font = `600 46px ${MAO}`;
    ctx.fillText(detalhe, 56, h - 56);
  }
};

// Uma perna do cavalete: cilindro unitário esticado entre dois pontos.
function perna(de, ate) {
  const a = new THREE.Vector3(...de);
  const b = new THREE.Vector3(...ate);
  const d = b.clone().sub(a);
  return {
    pos: a.clone().add(b).multiplyScalar(0.5),
    quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()),
    comp: d.length(),
  };
}

// Lousa (largura, altura) e altura do centro dela.
const W = 2.1;
const H = 1.32;
const C = 1.78;
const PERNAS = [
  perna([-0.55, C - H / 2 + 0.05, 0], [-0.9, 0.02, 0.45]),
  perna([0.55, C - H / 2 + 0.05, 0], [0.9, 0.02, 0.45]),
  perna([0, C + H / 2 - 0.3, -0.08], [0, 0.02, -0.85]),
];

const criarMateriais = () => ({
  madeiraClara: fosco('#D3A26B'),
  apagador: fosco('#5BC2C7', 0.6),
  pincel: fosco('#2E5BA8', 0.6),
});

// Redesenha quando a fonte à mão termina de carregar (antes dela, o canvas usa a de reserva).
function useFonteCarregada() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let vivo = true;
    Promise.all([document.fonts?.load?.(`700 60px "Caveat"`), document.fonts?.load?.(`600 40px "Caveat"`)])
      .then(() => vivo && setVersao((n) => n + 1))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return versao;
}

export default function QuadroReuniao() {
  const titulo = useReuniao((s) => s.reuniao?.titulo ?? '');
  const detalhe = useReuniao((s) => detalheDoQuadro(s.reuniao));
  const fonte = useFonteCarregada();
  const M = useMemo(criarMateriais, []);
  useDescartar(M);

  // fonte entra nas dependências para redesenhar com a Caveat carregada.
  const tex = useMemo(() => textura(1024, 640, desenharQuadro(titulo, detalhe)), [titulo, detalhe, fonte]);
  useEffect(() => () => tex.dispose(), [tex]);

  return (
    <group position={[QUADRO_REUNIAO.x, 0, QUADRO_REUNIAO.z]} rotation-y={QUADRO_REUNIAO.rot}>
      {PERNAS.map((p, i) => (
        <mesh key={i} geometry={G.cil} material={M.madeiraClara} position={p.pos} quaternion={p.quat} scale={[0.08, p.comp, 0.08]} />
      ))}
      <mesh geometry={G.arred} material={M.madeiraClara} position={[0, C + H / 2 + 0.25, -0.02]} scale={[0.1, 0.5, 0.08]} />
      {/* Moldura de madeira e a lousa. */}
      <mesh geometry={G.arred} material={M.madeiraClara} position-y={C} scale={[W + 0.12, H + 0.12, 0.07]} />
      <mesh geometry={G.plano} position={[0, C, 0.037]} scale={[W, H, 1]}>
        <meshStandardMaterial map={tex} roughness={0.55} />
      </mesh>
      {/* Bandeja com apagador e pincel. */}
      <mesh geometry={G.arred} material={M.madeiraClara} position={[0, C - H / 2 - 0.08, 0.08]} scale={[W * 0.7, 0.05, 0.14]} />
      <mesh geometry={G.arred} material={M.apagador} position={[-0.55, C - H / 2 - 0.03, 0.09]} scale={[0.26, 0.07, 0.1]} />
      <mesh geometry={G.cil} material={M.pincel} position={[0.1, C - H / 2 - 0.035, 0.09]} rotation-z={Math.PI / 2} scale={[0.04, 0.2, 0.04]} />
    </group>
  );
}
