import type { Palette } from './engineScene';
import type { Finish } from './engineParts';

const FINISHES: Finish[] = ['alu', 'cast', 'paint', 'steel', 'exhaust', 'plastic', 'rubber', 'gasket', 'bore', 'coil'];

/**
 * The engine's colours, read from the design tokens (tokens.css) so the 3D scene uses the same
 * values as the page. Coil packs share the plastic finish.
 */
export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string): string => css.getPropertyValue(name).trim();
  const finishes = Object.fromEntries(
    FINISHES.map((f) => [f, token(`--model-${f === 'coil' ? 'plastic' : f}`)]),
  ) as Record<Finish, string>;
  return { ink: token('--color-ink'), cyan: token('--color-cyan'), edge: token('--model-edge'), finishes };
}
