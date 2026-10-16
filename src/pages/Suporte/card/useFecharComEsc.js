import { useEffect } from 'react';

// Esc fecha o painel enquanto ele está aberto.
export default function useFecharComEsc(aberto, fechar) {
  useEffect(() => {
    if (!aberto) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') fechar();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aberto, fechar]);
}
