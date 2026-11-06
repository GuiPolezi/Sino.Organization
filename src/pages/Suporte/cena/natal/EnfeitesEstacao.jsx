/*
 * Natal de mesa (docs/tema-natal.md, 4.3), no espaço local da estação: um
 * ouropel com luzinhas no topo do monitor (a cor muda pelo índice) e, no canto
 * esquerdo da mesa, um enfeite pequeno que reveza: bengala na caneca,
 * bico-de-papagaio, nada (respiro) ou mini árvore.
 */
import BicoDePapagaio from '../../../../tema/natal/pecas/BicoDePapagaio.jsx';
import Festao from '../../../../tema/natal/pecas/Festao.jsx';
import Bengala from './Bengala.jsx';
import MiniArvore from './MiniArvore.jsx';

const CORES_OUROPEL = ['vermelho', 'ouro', 'pinheiroClaro', 'prata'];

// Pelo topo do monitor (topo em y 1,345, frente em z −0,135; a tela vai até 1,32),
// com a pontinha caindo 0,08 na lateral direita.
const OUROPEL = [
  [-0.34, 1.33, -0.128],
  [-0.2, 1.352, -0.13],
  [0, 1.355, -0.13],
  [0.2, 1.352, -0.13],
  [0.335, 1.335, -0.128],
  [0.372, 1.3, -0.128],
  [0.368, 1.265, -0.126],
];

// O enfeite do canto, conforme indice % 4 (os índices 0 e 2 têm caneca).
const CANTO = [
  // Dentro da caneca (−0,6; 0,83; 0,12), com o pé abaixo da borda e encostada nela.
  () => <Bengala position={[-0.585, 0.8, 0.12]} rotation={[0.08, 0.9, -0.14]} />,
  () => <BicoDePapagaio position={[-0.58, 0.77, 0.08]} rotation-y={0.4} />,
  () => null,
  () => <MiniArvore position={[-0.58, 0.77, 0.06]} rotation-y={0.3} />,
];

/** @param {{ indice: number }} props */
export default function EnfeitesEstacao({ indice }) {
  const Canto = CANTO[indice % CANTO.length];
  return (
    <group name="natal-estacao">
      <Festao
        pontos={OUROPEL}
        cor={CORES_OUROPEL[indice % CORES_OUROPEL.length]}
        raio={0.018}
        luzes={7}
        raioLuz={0.013}
        bolinhas={0}
      />
      <Canto />
    </group>
  );
}
