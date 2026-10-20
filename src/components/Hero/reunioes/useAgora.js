import { useEffect, useMemo, useState } from 'react';
import { msAteProximaMudanca } from './periodos.js';

const UM_MINUTO = 60_000;
const MAX_ESPERA = 60 * UM_MINUTO; // revalida ao menos a cada hora

// "Agora" que se atualiza sozinho quando algum status muda (início, fim ou
// meia-noite), sem recarregar a página. Também ao voltar a aba visível.
export function useAgora(reunioes) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const ms = msAteProximaMudanca(reunioes, new Date(agora));
    // Sem próxima mudança conhecida: confere a cada minuto.
    const espera = ms == null ? UM_MINUTO : Math.min(Math.max(ms + 50, 250), MAX_ESPERA);
    const timer = window.setTimeout(() => setAgora(Date.now()), espera);
    return () => window.clearTimeout(timer);
  }, [reunioes, agora]);

  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') setAgora(Date.now());
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, []);

  return useMemo(() => new Date(agora), [agora]);
}
