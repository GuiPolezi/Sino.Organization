import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MEDIA } from '../../../utils/media.js';
import Boneco from '../boneco/Boneco.jsx';
import { AREA, MOVIMENTO, useEquipe } from '../store.js';
import CameraRig from './CameraRig.jsx';
import Cenario from './Cenario.jsx';
import EstacoesTrabalho from './EstacoesTrabalho.jsx';
import styles from './Cena.module.css';

const AREA_PAISAGEM = { rx: 6.2, rz: 3.4 };
const AREA_RETRATO = { rx: 3.3, rz: 4.4 };

// Ajusta a área de caminhada ao formato da tela.
function AreaResponsiva({ onChange }) {
  const { size } = useThree();
  const retrato = size.width / size.height < 1;

  useEffect(() => {
    Object.assign(AREA, retrato ? AREA_RETRATO : AREA_PAISAGEM);
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

export default function Cena() {
  const tecnicos = useEquipe((s) => s.tecnicos);
  const selecionar = useEquipe((s) => s.selecionar);
  const [area, setArea] = useState(() => ({ ...AREA }));
  useMovimentoReduzido();

  return (
    <Canvas
      className={styles.cena}
      dpr={[1, 2]}
      camera={{ position: [0, 6.2, 14], fov: 32, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
      onPointerMissed={() => selecionar(null)}
    >
      <AreaResponsiva onChange={setArea} />
      <CameraRig />

      <hemisphereLight args={['#FFF7F0', '#B9B2C9', 1.35]} />
      <directionalLight position={[5, 9, 6]} intensity={1.5} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} color="#C9D6FF" />

      <Cenario area={area} />
      <EstacoesTrabalho />

      {tecnicos.map((tecnico) => (
        <Boneco key={tecnico.id} tecnico={tecnico} />
      ))}
    </Canvas>
  );
}
