/*
 * Camada do brilho (lâmpadas e halos). Fora da camada 0 eles não viram mancha
 * nas sombras de contato nem pegam clique. A câmera precisa enxergá-la. Vários
 * enfeites pedem isso ao mesmo tempo, então cada câmera conta os pedidos e só
 * desliga a camada quando o último sai.
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export const CAMADA_BRILHO = 2;

const pedidos = new WeakMap();

/**
 * Faz a câmera da cena enxergar CAMADA_BRILHO enquanto o componente estiver montado.
 * @param {boolean} [ativo] com false não pede nada (para o hook ser chamado sempre)
 */
export function useHabilitarBrilho(ativo = true) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (!ativo) return undefined;
    pedidos.set(camera, (pedidos.get(camera) ?? 0) + 1);
    camera.layers.enable(CAMADA_BRILHO);
    return () => {
      const restantes = pedidos.get(camera) - 1;
      pedidos.set(camera, restantes);
      if (restantes === 0) camera.layers.disable(CAMADA_BRILHO);
    };
  }, [camera, ativo]);
}

// Versão componente, com o mesmo padrão de HabilitarCamada (Reuniao/cena/comum.js).
export function HabilitarBrilho() {
  useHabilitarBrilho();
  return null;
}

/**
 * Põe o objeto (e tudo dentro) só na camada do brilho.
 * @template {import('three').Object3D} T
 * @param {T} objeto
 * @returns {T}
 */
export function naCamadaBrilho(objeto) {
  objeto.traverse((filho) => filho.layers.set(CAMADA_BRILHO));
  return objeto;
}
