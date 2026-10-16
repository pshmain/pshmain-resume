import type { CSSProperties } from 'react';

/* Inline custom properties that order staggered motion (src/styles/motion.css). */

/** Position in the cover sheet's entrance; each step waits one --stagger longer. */
export const enterStep = (n: number): CSSProperties => ({ '--enter-step': n }) as CSSProperties;

/** Position within a group of scroll-in reveals. */
export const revealStep = (n: number): CSSProperties => ({ '--reveal-step': n }) as CSSProperties;

/** Position in a drawing's stroke sequence; each line starts one --draw-step later. */
export const drawStep = (n: number): CSSProperties => ({ '--draw-i': n }) as CSSProperties;
