import { useEffect, type RefObject } from 'react';
import { DEFAULT_DITHER_OPTIONS, DitherEngine, type FrameSheet } from './DitherEngine';

export interface DitherRefs {
  hero: RefObject<HTMLElement | null>;
  heroCanvas: RefObject<HTMLCanvasElement | null>;
  ash: RefObject<HTMLCanvasElement | null>;
}

/**
 * Mounts the dither engine on the hero and the two canvases after hydration. The engine holds
 * all animation state in its own instance; nothing here goes through React state. Respects
 * `prefers-reduced-motion` by freezing both fields to a single frame.
 */
export function useDitherEngine(refs: DitherRefs, sheet: FrameSheet): void {
  useEffect(() => {
    const hero = refs.hero.current;
    const heroCanvas = refs.heroCanvas.current;
    const ashCanvas = refs.ash.current;
    if (!hero || !heroCanvas || !ashCanvas) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const engine = new DitherEngine({ hero, heroCanvas, ashCanvas }, sheet, {
      ...DEFAULT_DITHER_OPTIONS,
      reducedMotion,
    });
    engine.start();
    return () => engine.destroy();
  }, [refs.hero, refs.heroCanvas, refs.ash, sheet]);
}
