/*
 * Enfeites que entram na área de caminhada viram círculos em OBSTACULOS, com a
 * marca 'natal'. definirEstacoes e aplicarPlanta preservam marcas alheias, então
 * os círculos ficam até o componente sair.
 */
import { useLayoutEffect, useRef } from 'react';
import { OBSTACULOS } from '../../pages/Suporte/boneco/estacoes.js';

export const MARCA_NATAL = 'natal';

/** Tira de OBSTACULOS estes círculos (os outros ficam). */
export function tirarObstaculos(objetos) {
  objetos.forEach((obstaculo) => {
    const i = OBSTACULOS.indexOf(obstaculo);
    if (i !== -1) OBSTACULOS.splice(i, 1);
  });
}

/**
 * Leva os círculos de `lista` para OBSTACULOS. Reaproveita os objetos já postos,
 * atualizados no lugar (como o quadro faz em posicao.js), põe os que faltam e
 * tira os que sobraram.
 * @param {object[]} atuais o que esta função devolveu da última vez ([] na 1ª)
 * @param {{ x: number, z: number, r: number }[]} lista
 * @returns {{ x: number, z: number, r: number, estacao: string }[]} os círculos em uso agora
 */
export function sincronizarObstaculos(atuais, lista) {
  tirarObstaculos(atuais.slice(lista.length));
  return lista.map(({ x, z, r }, i) => {
    const obstaculo = Object.assign(atuais[i] ?? {}, { x, z, r, estacao: MARCA_NATAL });
    if (!OBSTACULOS.includes(obstaculo)) OBSTACULOS.push(obstaculo);
    return obstaculo;
  });
}

/**
 * Mantém os círculos em OBSTACULOS enquanto o componente estiver montado. Pode
 * receber uma lista nova a cada render: só sincroniza quando os números mudam.
 * @param {{ x: number, z: number, r: number }[]} lista
 */
export function useObstaculosNatal(lista) {
  const postos = useRef([]);
  const chave = lista.map(({ x, z, r }) => `${x},${z},${r}`).join(';');
  // A lista só importa pelos números, que estão na chave.
  useLayoutEffect(() => {
    postos.current = sincronizarObstaculos(postos.current, lista);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(
    () => () => {
      tirarObstaculos(postos.current);
      postos.current = [];
    },
    [],
  );
}
