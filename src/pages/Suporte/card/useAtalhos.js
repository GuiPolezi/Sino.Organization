import { useEffect } from 'react';
import { useEquipe } from '../store.js';

// Teclado enquanto há alguém selecionado: Esc fecha o card, ← → navega pela equipe.
export default function useAtalhos() {
  useEffect(() => {
    const onKeyDown = (event) => {
      const { selecionado, selecionar, navegar } = useEquipe.getState();
      if (!selecionado) return;
      if (event.key === 'Escape') selecionar(null);
      if (event.key === 'ArrowRight') navegar(1);
      if (event.key === 'ArrowLeft') navegar(-1);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
