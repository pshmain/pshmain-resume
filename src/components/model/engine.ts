/**
 * The inline-six on the cover, as numbers: its main dimensions, the crank's phasing and firing
 * order, and how far each subassembly travels in the exploded view. No Three.js here, so the
 * page can read it without the 3D chunk; the shapes themselves are built in engineParts.ts.
 *
 * World units. The crankshaft runs along x with cylinder 1 at the front (-x) and the flywheel at
 * the back (+x); y is up; the exhaust is on the +z side, the intake on -z. Six cylinders because
 * the résumé has six skill layers: one cylinder per layer.
 */

export const CYLINDERS = 6;
export const PITCH = 0.56;
export const cylinderX = (i: number): number => (i - (CYLINDERS - 1) / 2) * PITCH;
/** The block runs this far either side of centre (x). */
export const BLOCK_HALF = cylinderX(CYLINDERS - 1) + 0.32;

/* ---- Bottom end and bores ---- */
export const BORE_R = 0.2;
export const DECK_Y = 0.92;
export const SLEEVE_BOTTOM = 0.3;
export const THROW = 0.14; // crank radius: half the stroke
export const ROD = 0.56; // centre to centre
export const PISTON_R = 0.185;
export const PIN_TO_CROWN = 0.12;
/** Top of the coil packs, where the cylinder balloons' leaders start. */
export const COIL_TOP = 1.57;

const DEG = Math.PI / 180;
/** Crank throw angles. Cylinders 1 and 6, 2 and 5, 3 and 4 share a throw: the inline-six crank. */
export const PHASE = [0, 240, 120, 120, 240, 0].map((a) => a * DEG);
/** Where in the 720deg four-stroke cycle each cylinder fires: firing order 1-5-3-6-2-4. */
export const FIRE_AT = [0, 480, 240, 600, 120, 360].map((a) => a * DEG);

/** Height of the piston pin above the crank axis at crank angle phi (0 = top dead centre). */
export function pinHeight(phi: number): number {
  const s = THROW * Math.sin(phi);
  return THROW * Math.cos(phi) + Math.sqrt(ROD * ROD - s * s);
}

export type Vec = [number, number, number];

/** Subassemblies: each moves as one in the exploded view. */
export type Unit =
  | 'coils'
  | 'cover'
  | 'head'
  | 'intake'
  | 'exhaust'
  | 'block'
  | 'pistons'
  | 'crank'
  | 'flywheel'
  | 'pulley'
  | 'front'
  | 'timing'
  | 'pan';

/** The units that turn with the crankshaft. */
export const ROTATING: Unit[] = ['crank', 'flywheel', 'pulley'];

/** What a piece stands for: a cylinder (its skill layer), a section of the page, or nothing. */
export type Key = `cyl${number}` | 'block' | 'head' | 'crank' | null;

/** How far each unit travels in the exploded view (x, y, z). */
export const EXPLODE: Record<Unit, Vec> = {
  coils: [0, 1.8, 0],
  cover: [0, 1.38, 0],
  head: [0, 0.92, 0],
  intake: [0, 0.45, -0.7],
  exhaust: [0, 0.08, 0.7],
  block: [0, 0, 0],
  pistons: [0, 0.78, 0],
  crank: [0, -0.72, 0],
  flywheel: [0.5, -0.72, 0],
  pulley: [-0.62, 0, 0],
  front: [-0.62, 0, 0],
  timing: [-0.32, 0, 0],
  pan: [0, -1.38, 0],
};
