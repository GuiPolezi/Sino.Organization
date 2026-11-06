/*
 * Natal da sala de reunião (docs/tema-natal.md, 4.6): árvore no canto esquerdo
 * do fundo (com os presentes e o obstáculo), festão e neve de spray no vidro,
 * guirlanda no eixo da sala, centro de mesa, laço no quadro e, no entardecer e
 * à noite, luzinhas nas árvores da paisagem. Posições em pontos.js.
 */
import { materialNatal } from '../../../../tema/natal/materiais.js';
import { useObstaculosNatal } from '../../../../tema/natal/obstaculos.js';
import ArvoreNatal from '../../../../tema/natal/pecas/ArvoreNatal.jsx';
import Guirlanda from '../../../../tema/natal/pecas/Guirlanda.jsx';
import Laco from '../../../../tema/natal/pecas/Laco.jsx';
import Presente from '../../../../tema/natal/pecas/Presente.jsx';
import { G } from '../comum.js';
import { MESA } from '../planta.js';
import CentroDeMesa from './CentroDeMesa.jsx';
import FestaoVidro from './FestaoVidro.jsx';
import LuzesNaPaisagem from './LuzesNaPaisagem.jsx';
import NeveNoVidro from './NeveNoVidro.jsx';
import {
  ARVORE_REUNIAO,
  CENTRO_MESA,
  GUIRLANDA_REUNIAO,
  LACO_QUADRO,
  OBSTACULOS_NATAL_REUNIAO,
  PRESENTES_REUNIAO,
} from './pontos.js';

const NOTURNOS = new Set(['entardecer', 'noite']);

// Guirlanda pendurada por uma fita vermelha até o trilho de cima do vidro.
function GuirlandaComFita() {
  const { x, y, z, diametro, topoFita } = GUIRLANDA_REUNIAO;
  const baseFita = y + diametro / 2 - 0.04;
  const comprimento = topoFita - baseFita;
  return (
    <group position={[x, 0, z]}>
      <mesh
        geometry={G.caixa}
        material={materialNatal('vermelho')}
        position={[0, baseFita + comprimento / 2, -0.03]}
        scale={[0.035, comprimento, 0.008]}
      />
      <Guirlanda diametro={diametro} position-y={y} />
    </group>
  );
}

function LacoDoQuadro() {
  const { quadro, posicao, escala } = LACO_QUADRO;
  return (
    <group position={[quadro.x, 0, quadro.z]} rotation-y={quadro.rot}>
      <Laco escala={escala} position={posicao} />
    </group>
  );
}

/**
 * @param {object} props
 * @param {{ periodo: string, luminaria: boolean }} props.tema período do dia (temaHorario.js)
 */
export default function NatalReuniao({ tema }) {
  useObstaculosNatal(OBSTACULOS_NATAL_REUNIAO);
  const { rot } = ARVORE_REUNIAO;

  return (
    <group name="natal-reuniao">
      <ArvoreNatal
        position={[ARVORE_REUNIAO.x, 0, ARVORE_REUNIAO.z]}
        rotation-y={rot}
        escala={ARVORE_REUNIAO.escala}
        luzAcesa={tema.luminaria ? 1 : 0.5}
      />
      {PRESENTES_REUNIAO.map(({ modelo, x: px, z: pz, giro }) => (
        <Presente key={modelo} modelo={modelo} position={[px, 0, pz]} rotation-y={rot + giro} />
      ))}
      <FestaoVidro />
      <NeveNoVidro />
      <GuirlandaComFita />
      <group position={[MESA.x, 0, MESA.z]}>
        <CentroDeMesa position={[CENTRO_MESA.x, CENTRO_MESA.altura, CENTRO_MESA.z]} rotation-y={0.4} />
      </group>
      <LacoDoQuadro />
      {NOTURNOS.has(tema.periodo) && <LuzesNaPaisagem />}
    </group>
  );
}
