import { memo, useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MEDIA } from '../../../utils/media.js';
import Boneco from '../boneco/Boneco.jsx';
import Retratista from '../boneco/Retratos.jsx';
import { AREA, CENA, MOVIMENTO, useEquipe } from '../store.js';
import CameraRig from './CameraRig.jsx';
import CenarioPadrao from './Cenario.jsx';
import styles from './Cena.module.css';

// Ajusta a área de caminhada ao formato da tela.
function AreaResponsiva({ onChange }) {
  const { size } = useThree();
  const retrato = size.width / size.height < 1;

  useEffect(() => {
    Object.assign(AREA, retrato ? CENA.areaRetrato : CENA.areaPaisagem);
    onChange({ ...AREA });
  }, [retrato, onChange]);

  return null;
}

// Mantém MOVIMENTO em dia com prefers-reduced-motion, sem custo por frame.
function useMovimentoReduzido() {
  useEffect(() => {
    const consulta = window.matchMedia(MEDIA.reducedMotion);
    const atualizar = () => {
      MOVIMENTO.reduzido = consulta.matches;
    };

    atualizar();
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);
}

const GL = { antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping };

// Luz de estúdio das páginas de equipe.
function LuzesPadrao() {
  return (
    <>
      <hemisphereLight args={['#FFF7F0', '#B9B2C9', 1.35]} />
      <directionalLight position={[5, 9, 6]} intensity={1.5} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#C9D6FF" />
    </>
  );
}

/**
 * A cena é memoizada: o painel e o card abrem e fecham sem a árvore 3D inteira
 * (os bonecos, com dezenas de meshes cada) passar pelo reconciliador de novo.
 *
 * @param {object} props
 * @param {import('react').ComponentType | null} props.Estacoes  as estações de trabalho no tapete (null: nenhuma)
 * @param {import('react').ComponentType<{ area: { rx: number, rz: number } }>} props.Quadro
 *   o quadro da equipe, com o que a página escreve nele
 * @param {import('react').ComponentType<{ area: { rx: number, rz: number } }>} [props.Cenario]
 *   chão e fundo (o tapete neutro por padrão)
 * @param {import('react').ComponentType} [props.Luzes] luzes da cena (a de estúdio por padrão)
 * @param {object} [props.gl] opções do renderizador somadas às padrão (ex.: stencil)
 *   Todas as props devem ser estáveis (definidas fora do componente), ou a memo não serve.
 */
function Cena({ Estacoes, Quadro, Cenario = CenarioPadrao, Luzes = LuzesPadrao, gl }) {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionar = useEquipe((s) => s.selecionar);
  const [area, setArea] = useState(() => ({ ...AREA }));
  const opcoesGl = useMemo(() => (gl ? { ...GL, ...gl } : GL), [gl]);
  useMovimentoReduzido();

  return (
    <Canvas
      className={styles.cena}
      dpr={[1, 2]}
      camera={{ position: [0, 6.2 * CENA.recuo, 14 * CENA.recuo], fov: 32, near: 0.1, far: 100 }}
      gl={opcoesGl}
      onPointerMissed={() => selecionar(null)}
    >
      <AreaResponsiva onChange={setArea} />
      <CameraRig />

      <Luzes />

      <Cenario area={area} />
      {Estacoes && <Estacoes />}
      <Quadro area={area} />

      {tecnicos.map((tecnico) => (
        <Boneco key={tecnico.id} tecnico={tecnico} />
      ))}
      <Retratista />
    </Canvas>
  );
}

export default memo(Cena);
