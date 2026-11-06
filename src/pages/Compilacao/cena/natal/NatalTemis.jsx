/*
 * O Natal da Têmis (docs/tema-natal.md, 4.5), montado dentro do grupo da
 * estátua (cresce junto no hover, mas não acende em dourado): o gorro de Papai
 * Noel caindo para a esquerda, longe do braço erguido e da folha, e o festão
 * rente ao tampo do pedestal, sem bolinhas na frente para a placa ficar livre.
 */
import { useMemo } from 'react';
import { materialNatal } from '../../../../tema/natal/materiais.js';
import Festao from '../../../../tema/natal/pecas/Festao.jsx';
import { abaFofa, coneCurvo, pompom } from './gorroTemis.js';

// Espaço da estátua, antes da escala de 1,3 (EstatuaTemis.jsx): a cabeça fica em y 2,33.
const GORRO = {
  aba: { y: 2.47, inclinacao: -0.12, raio: 0.205, tubo: 0.045 },
  cone: { raio: 0.19, altura: 0.34, curva: 1.6, dir: [-1, 0], y: 0.012 },
  pompom: 0.055,
};

// Festão do pedestal: retângulo arredondado 1,28 × 1,12 em y 0,36 (o tampo vai de 0,34 a 0,42).
const FESTAO = { meioX: 0.64, meioZ: 0.56, canto: 0.12, y: 0.36, frente: 0.42 };

let G = null;
const geometrias = () => {
  if (G) return G;
  const { raio, altura, curva, dir } = GORRO.cone;
  const cone = coneCurvo(raio, altura, curva, dir);
  G = {
    cone: cone.geometria,
    ponta: cone.ponta.clone().addScaledVector(cone.tangente, GORRO.pompom * 0.45),
    aba: abaFofa(GORRO.aba.raio, GORRO.aba.tubo),
    pompom: pompom(GORRO.pompom),
  };
  return G;
};

// Um canto do retângulo: arco de 90° em 3 pontos, de a0 até a0 + 90°.
const canto = (cx, cz, a0) =>
  [0, 0.5, 1].map((f) => {
    const a = a0 + (f * Math.PI) / 2;
    return [cx + Math.cos(a) * FESTAO.canto, FESTAO.y, cz - Math.sin(a) * FESTAO.canto];
  });

// Em volta do tampo pelos lados e pelo fundo (de frente-direita a frente-esquerda) e o trecho da frente.
function trechosDoFestao() {
  const { meioX: a, meioZ: b, canto: c, y, frente } = FESTAO;
  const volta = [
    [frente, y, b],
    ...canto(a - c, b - c, -Math.PI / 2),
    [a, y, 0],
    ...canto(a - c, -(b - c), 0),
    [0, y, -b],
    ...canto(-(a - c), -(b - c), Math.PI / 2),
    [-a, y, 0],
    ...canto(-(a - c), b - c, Math.PI),
    [-frente, y, b],
  ];
  const frenteReta = [
    [-frente - 0.03, y, b],
    [0, y, b],
    [frente + 0.03, y, b],
  ];
  return { volta, frenteReta };
}

function Gorro() {
  const g = geometrias();
  const { aba, cone } = GORRO;
  return (
    <group position-y={aba.y} rotation-x={aba.inclinacao}>
      <mesh geometry={g.aba} material={materialNatal('creme', 'pelucia')} />
      <group position-y={cone.y}>
        <mesh geometry={g.cone} material={materialNatal('vermelho')} />
        <mesh geometry={g.pompom} material={materialNatal('creme', 'pelucia')} position={g.ponta} />
      </group>
    </group>
  );
}

export default function NatalTemis() {
  const { volta, frenteReta } = useMemo(trechosDoFestao, []);
  return (
    <group name="natal:temis">
      <Gorro />
      <Festao pontos={volta} luzes={9} bolinhas={14} coresBolinhas={['vermelho']} />
      <Festao pontos={frenteReta} luzes={3} bolinhas={0} />
    </group>
  );
}
