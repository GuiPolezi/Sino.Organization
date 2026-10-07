import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MEDIA, matches } from '../utils/media.js';

gsap.registerPlugin(ScrollTrigger);

// Scroll suave dirigido pelo ticker do GSAP, para Lenis e ScrollTrigger
// compartilharem o mesmo frame.
export function useLenis() {
  useEffect(() => {
    if (matches(MEDIA.reducedMotion)) return undefined;

    const lenis = new Lenis();
    const onTick = (time) => lenis.raf(time * 1000);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);
}
