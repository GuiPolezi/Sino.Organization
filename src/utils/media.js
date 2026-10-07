// Mantidas em sincronia com as media queries dos CSS Modules.
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  horizontalScroll:
    '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
  // Painéis empilhados (sem track horizontal), ainda com animações.
  verticalMotion:
    '(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)',
  hover: '(hover: hover) and (pointer: fine)',
};

export const matches = (query) => window.matchMedia(query).matches;
