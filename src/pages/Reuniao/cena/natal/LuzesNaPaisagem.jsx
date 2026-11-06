/*
 * Luzinhas em três árvores da paisagem (entardecer e noite): só aparecem dentro
 * do vidro (natural() e a camada da natureza). Cada conjunto balança junto com a
 * sua árvore, com a mesma conta de Paisagem.jsx, para não descolar da copa.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Luzinhas from '../../../../tema/natal/pecas/Luzinhas.jsx';
import { CAMADA_NATUREZA, natural } from '../comum.js';
import { LUZES_PAISAGEM } from './pontos.js';

const RAIO = 0.03;

function LuzesDaArvore({ arvore }) {
  const grupo = useRef(null);
  // Igual ao vento de Paisagem.jsx (que balança mesmo com movimento reduzido).
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    grupo.current.rotation.z = Math.sin(t * 0.9 + arvore.fase) * 0.035 + Math.sin(t * 2.3 + arvore.fase) * 0.012;
  });
  return (
    <group position={[arvore.x, -0.05, arvore.z]}>
      <group ref={grupo}>
        <Luzinhas pontos={arvore.pontos} raio={RAIO} camada={CAMADA_NATUREZA} prepararMaterial={natural} />
      </group>
    </group>
  );
}

export default function LuzesNaPaisagem() {
  return (
    <group name="natal-luzes-paisagem">
      {LUZES_PAISAGEM.map((arvore) => (
        <LuzesDaArvore key={arvore.indice} arvore={arvore} />
      ))}
    </group>
  );
}
