// Mantidas em sincronia com as media queries dos CSS Modules.
export const MEDIA = {
  motion: '(prefers-reduced-motion: no-preference)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  hover: '(hover: hover) and (pointer: fine)',
};

export const matches = (query) => window.matchMedia(query).matches;
