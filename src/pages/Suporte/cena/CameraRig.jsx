import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { QUADRO } from '../quadro/posicao.js';
import { posicoes, useEquipe } from '../store.js';

// Mesma largura em que o card vira bottom sheet (CardTecnico.module.css).
const LARGURA_ESTREITA = 760;
const { clamp } = THREE.MathUtils;

// Câmera de "diorama" que se aproxima suavemente do técnico selecionado ou do quadro da equipe.
export default function CameraRig() {
  const { camera, size } = useThree();
  const olhar = useRef(new THREE.Vector3(0, 0.5, 0));
  const alvoPos = useRef(new THREE.Vector3());
  const alvoOlhar = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const aspecto = size.width / size.height;
    const estreito = size.width < LARGURA_ESTREITA;
    // Afasta a câmera em telas altas, para a área inteira continuar visível.
    const recuo = aspecto < 1 ? clamp(0.95 / aspecto, 1, 2) : clamp(1.55 / aspecto, 1, 2.1);
    const { selecionado, painel } = useEquipe.getState();
    const pos = selecionado ? posicoes.get(selecionado) : null;

    if (painel === 'quadro') {
      // No desktop o quadro fica à esquerda do painel. No mobile a câmera recua, para o
      // quadro caber na largura, e olha para baixo dele, para ele subir acima do bottom sheet.
      const dx = estreito ? 0 : 0.45;
      alvoPos.current.set(QUADRO.x + dx, estreito ? 6.2 : 5.2, QUADRO.z + (estreito ? 10 : 7.2));
      alvoOlhar.current.set(QUADRO.x + dx, estreito ? -0.4 : 1.6, QUADRO.z);
    } else if (pos) {
      // No desktop o boneco fica à esquerda do card; no mobile, acima do bottom sheet
      // (hoje baixo: só nome e cargo. Quando o card crescer, o boneco precisa subir).
      const dx = estreito ? 0 : 1.35;
      alvoPos.current.set(pos.x + dx, estreito ? 3.2 : 2.7, pos.z + (estreito ? 11 : 7.2));
      alvoOlhar.current.set(pos.x + dx, estreito ? 0.7 : 1.0, pos.z);
    } else {
      alvoPos.current.set(0, 6.2 * recuo, 14 * recuo);
      alvoOlhar.current.set(0, 0.4, 0.3);
    }

    const k = 1 - Math.exp(-3.2 * dt);
    camera.position.lerp(alvoPos.current, k);
    olhar.current.lerp(alvoOlhar.current, k);
    camera.lookAt(olhar.current);
  });

  return null;
}
