/*
 * O gorro de Natal de um boneco (docs/tema-natal.md, 5.7). Vai dentro do grupo
 * da cabeça da Figura e acompanha o giro, o balanço e o aceno do retrato.
 * Geometrias e materiais são compartilhados; só os pivôs do pompom, do sino e
 * do rabo balançam, num useFrame barato. Com movimento reduzido, ficam parados.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { movimentoReduzido } from '../movimento.js';
import { faseDe, gorroDe } from './catalogo.js';
import { encaixeDe } from './encaixe.js';
import { materialGorro } from './materiaisGorro.js';
import { BALANCO, montarGorro } from './montagem.js';

// Pêndulo (2.4): sin(t·1,3 + fase)·amplitude, e um pouco de vaivém no outro eixo.
const VELOCIDADE = { z: 1.3, x: 1.05 };

function No({ no, pivos }) {
  // Os pivôs ficam num Map (nó → objeto) para o useFrame girar.
  const registrar = no.balanco
    ? (objeto) => {
        if (objeto) pivos.set(no, objeto);
        else pivos.delete(no);
      }
    : undefined;
  const filhos = no.filhos.map((filho, i) => <No key={i} no={filho} pivos={pivos} />);
  if (no.geometria) {
    return (
      <mesh
        geometry={no.geometria}
        material={materialGorro(no.material)}
        position={no.position}
        rotation={no.rotation}
        scale={no.scale}
      >
        {filhos}
      </mesh>
    );
  }
  return (
    <group ref={registrar} position={no.position} rotation={no.rotation} scale={no.scale}>
      {filhos}
    </group>
  );
}

/**
 * @param {object} props
 * @param {string} props.id
 * @param {{ cabelo: { estilo: string }, acessorio?: string }} props.aparencia
 */
export default function Gorro({ id, aparencia }) {
  const raiz = useMemo(() => montarGorro(gorroDe(id), encaixeDe(aparencia)), [id, aparencia]);
  const fase = useMemo(() => faseDe(id), [id]);
  const pivos = useRef(new Map()).current;

  useFrame(({ clock }) => {
    const parado = movimentoReduzido();
    const t = parado ? 0 : clock.elapsedTime;
    const forca = parado ? 0 : 1;
    pivos.forEach((objeto, no) => {
      const amplitude = BALANCO[no.balanco] * forca;
      objeto.rotation.z = no.rotation[2] + Math.sin(t * VELOCIDADE.z + fase) * amplitude;
      objeto.rotation.x = no.rotation[0] + Math.sin(t * VELOCIDADE.x + fase * 1.7) * amplitude * 0.6;
    });
  });

  return <No no={raiz} pivos={pivos} />;
}
