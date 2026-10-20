import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { APARENCIAS_DEV } from '../../../pages/Desenvolvimento/aparencias.js';
import { registrarAparencias } from '../../../pages/Suporte/boneco/aparencia.js';
import Retratista, { useRetratos } from '../../../pages/Suporte/boneco/Retratos.jsx';
import { filaRetratos } from './RetratosReunioes.jsx';

// Na home cabem as duas equipes: suporte (já registrada) e desenvolvimento.
registrarAparencias(APARENCIAS_DEV);

// Canvas mínimo, fora da vista e sem eventos: só serve de estúdio ao Retratista.
const ESTUDIO = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: 8,
  height: 8,
  opacity: 0,
  pointerEvents: 'none',
  zIndex: -1,
  contain: 'strict',
};

const GL = {
  antialias: false,
  alpha: true,
  powerPreference: 'low-power',
  toneMapping: THREE.NeutralToneMapping,
};

// Liga a fila da home à do Retratista: pede o que falta e devolve o que ficou pronto.
function usePonte() {
  useEffect(() => {
    const pedir = () => filaRetratos.get().pendentes.forEach((id) => useRetratos.getState().pedir(id));
    const devolver = ({ urls }) => {
      filaRetratos.get().pendentes.forEach((id) => urls[id] && filaRetratos.entregar(id, urls[id]));
    };
    devolver(useRetratos.getState());
    pedir();
    const sairFila = filaRetratos.assinar(pedir);
    const sairRetratos = useRetratos.subscribe(devolver);
    return () => {
      sairFila();
      sairRetratos();
    };
  }, []);
}

// Ao desmontar, o R3F descarta o renderizador e perde o contexto WebGL.
export default function RetratistaReunioes() {
  usePonte();
  return (
    <div style={ESTUDIO}>
      <Canvas dpr={1} frameloop="always" gl={GL}>
        <Retratista />
      </Canvas>
    </div>
  );
}
