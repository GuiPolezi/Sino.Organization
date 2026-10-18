import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

/**
 * Largura do elemento em px inteiros, acompanhando as mudanças de tamanho.
 * Zero até a primeira medida.
 * @param {import('react').RefObject<HTMLElement>} ref
 */
export function useLargura(ref) {
  const [largura, setLargura] = useState(0);

  useLayoutEffect(() => {
    const elemento = ref.current;
    const medir = () => setLargura(Math.floor(elemento.clientWidth));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [ref]);

  return largura;
}

/**
 * Função que mede a largura de um texto na fonte do elemento, no peso e no
 * tamanho dados. Muda (e as contas que dependem dela refazem) quando as fontes
 * da página terminam de carregar, porque até lá a medida é da fonte reserva.
 * Null até a primeira medida.
 * @param {import('react').RefObject<HTMLElement>} ref
 */
export function useMedirTexto(ref, { peso = 700, tamanho = 11 } = {}) {
  const [familia, setFamilia] = useState(null);
  // Com as fontes já carregadas (o normal depois da primeira abertura), nasce pronto: nada é remedido.
  const [fontesProntas, setFontesProntas] = useState(() => document.fonts?.status === 'loaded');

  useLayoutEffect(() => {
    setFamilia(getComputedStyle(ref.current).fontFamily);
  }, [ref]);

  useEffect(() => {
    if (fontesProntas) return undefined;
    let ativo = true;
    document.fonts?.ready.then(() => ativo && setFontesProntas(true));
    return () => {
      ativo = false;
    };
  }, [fontesProntas]);

  // fontesProntas entra nas dependências: com a fonte carregada, as medidas mudam e a função também.
  return useMemo(() => {
    if (!familia) return null;
    const contexto = document.createElement('canvas').getContext('2d');
    contexto.font = `${peso} ${tamanho}px ${familia}`;
    const medidas = new Map();
    const medir = (texto) => {
      if (!medidas.has(texto)) medidas.set(texto, contexto.measureText(texto).width);
      return medidas.get(texto);
    };
    return medir;
  }, [familia, peso, tamanho, fontesProntas]);
}

/**
 * Vira true na primeira vez que o elemento aparece na tela (dentro do painel
 * rolável, que o IntersectionObserver já leva em conta) e fica assim.
 * @param {import('react').RefObject<HTMLElement>} ref
 */
export function useRevelar(ref) {
  const [visto, setVisto] = useState(false);

  useEffect(() => {
    if (visto) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisto(true);
      return undefined;
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) setVisto(true);
      },
      { threshold: 0.3 },
    );
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, [ref, visto]);

  return visto;
}
