/*
 * Natal no quadro da equipe (docs/tema-natal.md, 4.4), dentro do grupo do
 * quadro: cresce no hover e o clique abre o painel, mas não acende em dourado.
 * Festão com duas barrigas no topo da moldura, laço na cantoneira de cima à
 * esquerda e o cartão "Boas Festas!" no canto de baixo à direita, preso com fita.
 */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { corNatal } from '../../../../tema/natal/paleta.js';
import Festao from '../../../../tema/natal/pecas/Festao.jsx';
import Laco from '../../../../tema/natal/pecas/Laco.jsx';
import { MAO, escreverCabendo, novaTextura } from '../texturas.js';

// Medidas do Quadro.jsx: altura do centro, topo da moldura e frente do painel.
const C = 1.9;
const TOPO = 2.675;
const Z_NOTA = 0.04;
const FITA_PAPEL = '#E2C07E';

// Três apoios (pontas e meio) com uma barriga de 0,07 entre cada par.
const APOIO_Y = TOPO + 0.03;
const BARRIGA = 0.07;
const FESTAO = Array.from({ length: 9 }, (_, k) => {
  const u = (k % 4) / 4;
  const x = -1.18 + k * 0.295;
  return [x, APOIO_Y - BARRIGA * Math.sin(u * Math.PI), 0.07];
});

const CARTAO = { x: 0.82, y: C - 0.42, z: Z_NOTA + 0.012, largura: 0.46, altura: 0.3, giro: 0.06 };

function desenharCartao(ctx, w, h) {
  ctx.fillStyle = corNatal('creme');
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(200,66,59,0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Raminho de azevinho no canto de baixo à esquerda.
  ctx.fillStyle = corNatal('pinheiro');
  [[-0.5, 70, 262], [0.6, 112, 262]].forEach(([giro, x, y]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(giro);
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = corNatal('vermelho');
  [[86, 250], [100, 246], [93, 236]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = corNatal('vermelho');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  escreverCabendo(ctx, 'Boas Festas!', w / 2 + 12, h * 0.44, w - 90, 700, 96);
}

// Redesenha quando a Caveat termina de carregar (antes dela, sai a letra reserva).
function useTexturaCartao() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    let ativo = true;
    document.fonts
      .load(`700 96px ${MAO}`)
      .then(() => ativo && setVersao((n) => n + 1))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  const textura = useMemo(() => novaTextura(512, 334, desenharCartao), [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => textura.dispose(), [textura]);
  return textura;
}

// A fita adesiva do quadro (a Fita de Quadro.jsx), criada no 1º uso e compartilhada.
let fita = null;
const pecasFita = () =>
  (fita ??= {
    geometria: new RoundedBoxGeometry(1, 1, 1, 2, 0.08),
    material: new THREE.MeshStandardMaterial({ color: FITA_PAPEL, roughness: 0.7, transparent: true, opacity: 0.88 }),
  });

function Cartao() {
  const textura = useTexturaCartao();
  const { geometria, material } = pecasFita();
  const { x, y, z, largura, altura, giro } = CARTAO;
  return (
    <group position={[x, y, z]} rotation-z={giro}>
      <mesh scale={[largura, altura, 1]}>
        <planeGeometry />
        <meshStandardMaterial map={textura} roughness={0.9} metalness={0} />
      </mesh>
      <mesh geometry={geometria} material={material} position={[0.02, altura / 2 - 0.01, 0.006]} rotation-z={-0.12} scale={[0.2, 0.06, 0.008]} />
    </group>
  );
}

export default function EnfeiteQuadro() {
  return (
    <group name="natal-quadro">
      <Festao pontos={FESTAO} luzes={9} bolinhas={6} />
      <Laco escala={0.22} pontas={0.18} position={[-1.18, 2.66, 0.09]} />
      <Cartao />
    </group>
  );
}
