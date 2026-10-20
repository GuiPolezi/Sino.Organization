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
      filaRetratos.get().pendentes.forEach((id) => id in urls && filaRetratos.entregar(id, urls[id]));
    };
    devolver(useRetratos.getState());
    pedir();
    // Só reage quando a fila da home muda de verdade, não a cada retrato entregue.
    let pendentes = filaRetratos.get().pendentes;
    const sairFila = filaRetratos.assinar(() => {
      const atuais = filaRetratos.get().pendentes;
      if (atuais === pendentes) return;
      pendentes = atuais;
      pedir();
    });
    // E só devolve quando chegou retrato novo (urls mudou).
    const sairRetratos = useRetratos.subscribe((estado, anterior) => {
      if (estado.urls !== anterior.urls) devolver(estado);
    });
    return () => {
      sairFila();
      sairRetratos();
    };
  }, []);
}

// Ao desmontar, o R3F descarta o renderizador e perde o contexto WebGL.
// Sob demanda: só desenha quando há uma pose esperando a foto (antes, 60 fps sem parar).
export default function RetratistaReunioes() {
  usePonte();
  return (
    <div style={ESTUDIO}>
      <Canvas dpr={1} frameloop="demand" gl={GL}>
        <Retratista />
      </Canvas>
    </div>
  );
}
