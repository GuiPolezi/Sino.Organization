import { createContext } from 'react';

// Tween do scroll horizontal do track; `null` quando os painéis estão empilhados.
// Os painéis filhos usam como `containerAnimation` dos próprios ScrollTriggers.
export const TrackContext = createContext(null);
