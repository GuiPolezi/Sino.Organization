/*
 * Cenário de reunião (estilo massinha), no lugar do tapete neutro das páginas
 * de equipe (Suporte/cena/Cena.jsx):
 *   • o tapete elíptico e as sombras de contato
 *   • a parede de vidro em arco, com o logo, e a paisagem viva atrás dela
 *   • a mesa, com cadeiras e pufes CONFORME O NÚMERO DE MEMBROS (lugares.js)
 *   • a luminária de pé, que acende no entardecer e à noite
 *   • céu, natureza, luzes e bichos CONFORME A HORA DA REUNIÃO (temaHorario.js)
 * O quadro com o título entra pela cena como o quadro da equipe (QuadroReuniao).
 */
import { useLayoutEffect, useMemo } from 'react';
import { ContactShadows } from '@react-three/drei';
import { PALETA } from '../../Suporte/cena/paleta.js';
import { useEquipe } from '../../Suporte/store.js';
import { useReuniao } from '../store.js';
import { G, HabilitarCamada } from './comum.js';
import { configurarLugares } from './lugares.js';
import Mobilia from './Mobilia.jsx';
import Paisagem from './Paisagem.jsx';
import ParedeVidro from './ParedeVidro.jsx';
import { TAPETE, montarLugares } from './planta.js';

const GIRO_CHAO = -Math.PI / 2;
const BORDA = 0.28;
// Referência estável: o ContactShadows recria os render targets quando ela muda.
const ESCALA_SOMBRA = [18, 14];

export default function CenarioReuniao() {
  const membros = useEquipe((s) => s.tecnicos.length);
  const tema = useReuniao((s) => s.tema);
  const plano = useMemo(() => montarLugares(membros), [membros]);

  // Ativa os lugares antes do primeiro frame (os bonecos leem as estações no useFrame).
  useLayoutEffect(() => {
    configurarLugares(membros);
  }, [membros]);

  return (
    <group name="cenario-reuniao">
      <HabilitarCamada />
      <mesh geometry={G.disco} rotation-x={GIRO_CHAO} position-y={-0.02} scale={[TAPETE.rx + BORDA, TAPETE.rz + BORDA, 1]}>
        <meshStandardMaterial color={PALETA.olivaEscuro} roughness={1} />
      </mesh>
      <mesh geometry={G.disco} rotation-x={GIRO_CHAO} position-y={-0.01} scale={[TAPETE.rx, TAPETE.rz, 1]}>
        <meshStandardMaterial color={PALETA.creme} roughness={1} />
      </mesh>

      <Paisagem tema={tema} />
      <ParedeVidro />
      <Mobilia plano={plano} luminariaAcesa={tema.luminaria} />

      {/* Fica em y = 0 (como em Suporte/cena/Cenario.jsx): deslocado, o desfoque sai vazio. */}
      <ContactShadows scale={ESCALA_SOMBRA} resolution={512} blur={2.2} opacity={0.45} far={2.6} color={PALETA.olivaEscuro} />
    </group>
  );
}

// Luzes da sala conforme o período do dia: hemisférica e duas direcionais.
export function LuzesReuniao() {
  const { luz } = useReuniao((s) => s.tema);
  return (
    <>
      <hemisphereLight args={[luz.ceu, luz.chao, luz.hemi]} />
      <directionalLight position={[8, 14, 9]} intensity={luz.solInt} color={luz.sol} />
      <directionalLight position={[-9, 6, -6]} intensity={luz.fundo} color="#C9D6FF" />
    </>
  );
}
