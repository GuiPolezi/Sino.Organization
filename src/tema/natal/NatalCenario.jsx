/*
 * A árvore e os presentes no tapete de /suporte, /desenvolvimento e
 * /compilacao (docs/tema-natal.md, 4.2). Lê a configuração da página
 * (cenario.js) e, quando a árvore entra na área de caminhada, a põe nos
 * obstáculos. Muda de lugar junto com o tapete (retrato e paisagem).
 */
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { arvoreNoTapete, cenaNatal } from './cenario.js';
import { useObstaculosNatal } from './obstaculos.js';
import ArvoreNatal from './pecas/ArvoreNatal.jsx';
import Presente from './pecas/Presente.jsx';

// Os presentes ficam em cima do algodão da saia.
const SOBRE_A_SAIA = 0.03;

/**
 * @param {{ area: { rx: number, rz: number } }} props área de caminhada atual
 */
export default function NatalCenario({ area }) {
  const retrato = useThree((s) => s.size.width / s.size.height < 1);
  const arvore = useMemo(() => arvoreNoTapete(cenaNatal().arvore, area, retrato), [area, retrato]);
  useObstaculosNatal(arvore.obstaculo ? [arvore.obstaculo] : []);

  return (
    <group name="natal:cenario">
      <ArvoreNatal position={[arvore.x, 0, arvore.z]} rotation-y={arvore.rot} escala={arvore.escala} />
      {arvore.presentes.map(({ modelo, x, z, rot }) => (
        <Presente key={modelo} modelo={modelo} position={[x, SOBRE_A_SAIA, z]} rotation-y={rot} />
      ))}
    </group>
  );
}
