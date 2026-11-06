import { useEffect, useState } from 'react';

// A seção "acorda" quando está a até uma tela de distância, abaixo da viewport.
const NEAR_MARGIN = '0px 0px 100% 0px';
// Sem chegar perto, acorda quando o navegador ficar ocioso depois da entrada da
// home (a entrada do Hero leva ~2,7s; preparar antes disso a deixaria travada).
const IDLE_AFTER_MS = 4000;
const IDLE_TIMEOUT_MS = 2000;

/*
 * Fica `true` quando o elemento chega perto da tela ou, antes disso, quando o
 * navegador fica ocioso. Serve para adiar a montagem de animações pesadas que
 * não aparecem logo de cara.
 */
export function useNearOrIdle(ref) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready || !ref.current) return undefined;

    const start = () => setReady(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) start();
      },
      { rootMargin: NEAR_MARGIN },
    );
    observer.observe(ref.current);

    let idleId = null;
    const timer = setTimeout(() => {
      // Safari não tem requestIdleCallback: lá prepara direto, depois da espera.
      if (window.requestIdleCallback) {
        idleId = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
      } else {
        start();
      }
    }, IDLE_AFTER_MS);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
      if (idleId !== null) window.cancelIdleCallback(idleId);
    };
  }, [ref, ready]);

  return ready;
}
