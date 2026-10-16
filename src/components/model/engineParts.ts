/**
 * The engine's shapes, built from Three.js primitives: extruded profiles with rounded edges,
 * lathed (turned) parts, and tubes along curves. Part of the lazy 3D chunk. Each STEP builds
 * one subassembly, so the scene can yield to the page between them and never block it for long.
 *
 * Pieces carry their unit (what moves together in the exploded view), their key (what they
 * stand for, engine.ts) and their finish (the scene's material). Static pieces of one unit, key
 * and finish are merged by the scene into one mesh; repeated small hardware (bolts, ring-gear
 * teeth) is instanced. Coordinates as in engine.ts.
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Path,
  Quaternion,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  BLOCK_HALF,
  BORE_R,
  CYLINDERS,
  DECK_Y,
  PHASE,
  PIN_TO_CROWN,
  PISTON_R,
  ROD,
  SLEEVE_BOTTOM,
  THROW,
  cylinderX,
  type Key,
  type Unit,
  type Vec,
} from './engine';

/** A surface finish; the scene maps each to a material. Coil and piston finishes are per cylinder. */
export type Finish =
  | 'alu'
  | 'cast'
  | 'paint'
  | 'steel'
  | 'exhaust'
  | 'plastic'
  | 'rubber'
  | 'gasket'
  | 'bore'
  | 'coil';

export interface Piece {
  unit: Unit;
  key: Key;
  finish: Finish;
  geometry: BufferGeometry;
}

/** Many copies of one small shape (bolt heads, ring-gear teeth): one draw call each. */
export interface Repeat {
  unit: Unit;
  finish: Finish;
  geometry: BufferGeometry;
  at: Matrix4[];
}

export interface Parts {
  pieces: Piece[];
  repeats: Repeat[];
}

/* ---- Shape helpers ---- */
const V2 = (x: number, y: number): Vector2 => new Vector2(x, y);
const V3 = (p: Vec): Vector3 => new Vector3(...p);

function outline(points: [number, number][], holes: Path[] = []): Shape {
  const shape = new Shape(points.map(([x, y]) => V2(x, y)));
  shape.holes.push(...holes);
  return shape;
}

function hole(x: number, y: number, r: number): Path {
  const p = new Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

/** Points along an arc, for building outlines. */
function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 12): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const a = from + ((to - from) * k) / steps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  });
}

/** A rounded rectangle outline. */
function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): [number, number][] {
  const q = Math.PI / 2;
  return [
    ...arc(x1 - r, y0 + r, r, -q, 0, 4),
    ...arc(x1 - r, y1 - r, r, 0, q, 4),
    ...arc(x0 + r, y1 - r, r, q, 2 * q, 4),
    ...arc(x0 + r, y0 + r, r, 2 * q, 3 * q, 4),
  ];
}

/** Extrude a profile drawn in the (z, y) plane along x, from x0 to x1, edges rounded by `bevel`. */
function alongX(shape: Shape, x0: number, x1: number, bevel = 0.02): BufferGeometry {
  const depth = Math.max(0.002, x1 - x0 - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.rotateY(-Math.PI / 2); // the profile's x becomes z; the extrusion runs down x
  g.translate(x1 - (bevel > 0 ? bevel : 0), 0, 0);
  return g;
}

/** Extrude a profile drawn in the (x, y) plane along z, from z0 to z1. */
function alongZ(shape: Shape, z0: number, z1: number, bevel = 0.02): BufferGeometry {
  const depth = Math.max(0.002, z1 - z0 - bevel * 2);
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  g.translate(0, 0, z0 + (bevel > 0 ? bevel : 0));
  return g;
}

/** A turned part: a profile of [radius, position along the axis], revolved about an axis. */
function lathe(profile: [number, number][], axis: 'x' | 'y' | 'z', center: Vec, segments = 24): BufferGeometry {
  const g = new LatheGeometry(
    profile.map(([r, h]) => V2(Math.max(r, 0.0001), h)),
    segments,
  );
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  else if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(...center);
  return g;
}

/** A plain cylinder along an axis. */
function rod(axis: 'x' | 'y' | 'z', center: Vec, r: number, len: number, segments = 20, open = false): BufferGeometry {
  const g = new CylinderGeometry(r, r, len, segments, 1, open);
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  else if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(...center);
  return g;
}

/** A box with rounded edges, from its corners. */
function block(min: Vec, max: Vec, radius: number): BufferGeometry {
  const [w, h, d] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const r = Math.min(radius, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.001));
  g.translate((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  return g;
}

/** A tube along a smooth curve through points. */
function pipe(points: Vec[], r: number, tubular = 20, closed = false): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(V3), closed, 'centripetal');
  return new TubeGeometry(curve, tubular, r, 12, closed);
}

const xs = Array.from({ length: CYLINDERS }, (_, i) => cylinderX(i));
const H = BLOCK_HALF;

/** A hex bolt head, for instancing; its axis is y. */
export const boltHead = (): BufferGeometry => new CylinderGeometry(0.024, 0.024, 0.02, 6);

/** Place a y-axis shape at a point, its axis turned to `dir`. */
function at(point: Vec, dir: Vec = [0, 1, 0]): Matrix4 {
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), V3(dir).normalize());
  return new Matrix4().compose(V3(point), q, new Vector3(1, 1, 1));
}

/* ---- The subassemblies ---- */

function buildBlockCasting(out: Parts): void {
  const p = (key: Key, finish: Finish, geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'block', key, finish, geometry });
  };
  // The block's cross-section: a deck, the water-jacket walls, and the crankcase skirt below.
  const section = outline([
    [-0.4, DECK_Y],
    [-0.42, DECK_Y - 0.07],
    [-0.42, 0.4],
    [-0.47, 0.2],
    [-0.47, -0.2],
    [0.47, -0.2],
    [0.47, 0.2],
    [0.42, 0.4],
    [0.42, DECK_Y - 0.07],
    [0.4, DECK_Y],
  ]);
  p('block', 'alu', alongX(section, -H, H, 0.025));
  // Each cylinder's barrel shows through the water jacket on both sides.
  for (const x of xs)
    for (const side of [-1, 1]) p('block', 'alu', rod('y', [x, 0.64, side * 0.245], 0.215, 0.44, 20));
  for (const side of [-1, 1]) {
    // Ribs between the bores on the water jacket, and at each main bearing on the skirt.
    for (let k = 1; k < CYLINDERS; k++) {
      const x = (xs[k - 1]! + xs[k]!) / 2;
      const z = side * 0.42;
      p('block', 'alu', block([x - 0.025, 0.42, Math.min(z, z + side * 0.03)], [x + 0.025, DECK_Y - 0.09, Math.max(z, z + side * 0.03)], 0.01));
    }
    for (let k = 0; k <= CYLINDERS; k++) {
      const x = k === 0 ? -H + 0.06 : k === CYLINDERS ? H - 0.06 : (xs[k - 1]! + xs[k]!) / 2;
      const z = side * 0.47;
      p('block', 'alu', block([x - 0.03, -0.18, Math.min(z, z + side * 0.03)], [x + 0.03, 0.18, Math.max(z, z + side * 0.03)], 0.01));
    }
    // Engine mounts: a cast bracket and its rubber isolator.
    for (const mx of [-0.62, 0.62]) {
      const bracket = outline([
        [mx - 0.12, 0.0],
        [mx + 0.12, 0.0],
        [mx + 0.08, 0.2],
        [mx - 0.08, 0.2],
      ]);
      p('block', 'cast', side > 0 ? alongZ(bracket, 0.47, 0.56, 0.012) : alongZ(bracket, -0.56, -0.47, 0.012));
      out.pieces.push({ unit: 'block', key: null, finish: 'rubber', geometry: rod('z', [mx, 0.08, side * 0.6], 0.07, 0.08, 24) });
    }
  }
}

function buildBlockHardware(out: Parts): void {
  const p = (key: Key, finish: Finish, geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'block', key, finish, geometry });
  };
  // Freeze plugs on the exhaust side.
  for (const x of [-1.12, 0, 1.12]) p('block', 'steel', rod('z', [x, 0.66, 0.425], 0.055, 0.02, 24));
  // The rear adapter plate, its bolt holes, and the bores (seen in X-ray).
  const plate = outline(roundRect(-0.58, -0.62, 0.58, 0.98, 0.08), [
    hole(-0.48, 0.86, 0.025),
    hole(0.48, 0.86, 0.025),
    hole(-0.5, -0.5, 0.025),
    hole(0.5, -0.5, 0.025),
  ]);
  p('block', 'cast', alongX(plate, H, H + 0.05, 0.01));
  xs.forEach((x, i) => p(`cyl${i}`, 'bore', rod('y', [x, (DECK_Y + SLEEVE_BOTTOM) / 2, 0], BORE_R, DECK_Y - SLEEVE_BOTTOM, 24, true)));

  // Oil filter on the exhaust side, its boss, and the starter motor.
  p(null, 'cast', rod('z', [0.95, -0.02, 0.5], 0.09, 0.06, 24));
  p(
    null,
    'paint',
    lathe(
      [
        [0, 0.53],
        [0.1, 0.53],
        [0.11, 0.55],
        [0.11, 0.74],
        [0.1, 0.77],
        [0.05, 0.79],
        [0, 0.79],
      ],
      'z',
      [0.95, -0.02, 0],
      28,
    ),
  );
  p(null, 'cast', lathe([[0, 1.22], [0.1, 1.22], [0.11, 1.26], [0.11, 1.62], [0.1, 1.66], [0, 1.66]], 'x', [0, -0.05, -0.6], 28));
  p(null, 'steel', rod('x', [1.45, 0.08, -0.6], 0.05, 0.3, 20));
}

function buildHead(out: Parts): void {
  const section = outline([
    [-0.38, DECK_Y + 0.02],
    [0.38, DECK_Y + 0.02],
    [0.38, 1.16],
    [0.33, 1.22],
    [-0.33, 1.22],
    [-0.38, 1.16],
  ]);
  out.pieces.push({ unit: 'head', key: 'head', finish: 'alu', geometry: alongX(section, -H, H, 0.015) });
  out.pieces.push({
    unit: 'head',
    key: 'head',
    finish: 'gasket',
    geometry: block([-H, DECK_Y, -0.41], [H, DECK_Y + 0.02, 0.41], 0.004),
  });
}

function buildCover(out: Parts): void {
  const p = (finish: Finish, geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'cover', key: 'head', finish, geometry });
  };
  p('paint', block([-H + 0.1, 1.23, -0.31], [H - 0.1, 1.42, 0.31], 0.06));
  p('paint', block([-H + 0.2, 1.38, -0.13], [H - 0.2, 1.47, 0.13], 0.03));
  for (const z of [-0.22, 0.22]) p('paint', block([-H + 0.26, 1.4, z - 0.018], [H - 0.26, 1.445, z + 0.018], 0.012));
  // Oil filler cap, with a grip, at the front end of the spine.
  p(
    'plastic',
    lathe(
      [
        [0, 1.4],
        [0.055, 1.4],
        [0.055, 1.44],
        [0.064, 1.445],
        [0.064, 1.48],
        [0.05, 1.49],
        [0, 1.49],
      ],
      'y',
      [-H + 0.18, 0, 0],
      24,
    ),
  );
  // Cover bolts around the flange.
  const bolts: Matrix4[] = [];
  for (const x of [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5]) for (const z of [-0.28, 0.28]) bolts.push(at([x, 1.425, z]));
  out.repeats.push({ unit: 'cover', finish: 'steel', geometry: boltHead(), at: bolts });
}

function buildCoils(out: Parts): void {
  xs.forEach((x, i) => {
    const body = block([x - 0.065, 1.46, -0.12], [x + 0.065, 1.57, 0.12], 0.025);
    const plug = block([x - 0.035, 1.49, -0.17], [x + 0.035, 1.55, -0.11], 0.012);
    out.pieces.push({ unit: 'coils', key: `cyl${i}`, finish: 'coil', geometry: body });
    out.pieces.push({ unit: 'coils', key: `cyl${i}`, finish: 'coil', geometry: plug });
  });
}

function buildTiming(out: Parts): void {
  // The timing cover: round over the cam drive at the top, narrowing to the crank at the bottom.
  const shape = outline([
    ...arc(0, 0.98, 0.33, Math.PI, 0, 16),
    ...arc(0, 0.04, 0.3, 0, -Math.PI, 16),
  ]);
  out.pieces.push({ unit: 'timing', key: null, finish: 'cast', geometry: alongX(shape, -H - 0.14, -H, 0.025) });
  // The water pump's housing, between the cam drive and the crank.
  out.pieces.push({ unit: 'timing', key: null, finish: 'cast', geometry: rod('x', [-H - 0.2, 0.6, 0], 0.08, 0.14, 24) });
}

/** Pulley centres in the (y, z) plane on the front face, and their radii. */
const PULLEYS = {
  crank: { y: 0, z: 0, r: 0.21 },
  pump: { y: 0.6, z: 0, r: 0.12 },
  alternator: { y: 0.55, z: 0.5, r: 0.07 },
  tensioner: { y: 0.24, z: 0.3, r: 0.06 },
};
const BELT_X = -H - 0.3;

/** A grooved belt pulley's profile, along its axis from x0. */
function grooved(r: number, x0: number, width: number, hub: number): [number, number][] {
  const grooves = 4;
  const step = width / (grooves * 2);
  const rim: [number, number][] = [];
  for (let k = 0; k <= grooves * 2; k++) rim.push([k % 2 === 0 ? r : r - 0.014, x0 + k * step]);
  return [[0, x0 - 0.02], [hub, x0 - 0.02], [hub, x0], [r - 0.01, x0], ...rim, [r - 0.01, x0 + width], [hub, x0 + width], [hub, x0 + width + 0.03], [0, x0 + width + 0.03]];
}

function buildFront(out: Parts): void {
  const p = (finish: Finish, geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'front', key: null, finish, geometry });
  };
  const { pump, alternator, tensioner } = PULLEYS;
  p('steel', lathe(grooved(pump.r, -0.04, 0.08, 0.04), 'x', [BELT_X, pump.y, pump.z]));
  p('steel', lathe(grooved(alternator.r, -0.04, 0.08, 0.025), 'x', [BELT_X, alternator.y, alternator.z]));
  p(
    'steel',
    lathe(
      [
        [0, -0.04],
        [tensioner.r, -0.04],
        [tensioner.r, 0.04],
        [0, 0.04],
      ],
      'x',
      [BELT_X, tensioner.y, tensioner.z],
    ),
  );
  // The alternator: a finned body behind its pulley.
  const fins: [number, number][] = [[0, 0.06]];
  for (let k = 0; k < 6; k++) fins.push([k % 2 ? 0.14 : 0.15, 0.06 + k * 0.04]);
  fins.push([0.13, 0.28], [0, 0.28]);
  p('alu', lathe(fins, 'x', [BELT_X, alternator.y, alternator.z], 28));
  // The serpentine belt around the outside of the pulleys.
  const around: [number, number][] = [];
  for (const { y, z, r } of Object.values(PULLEYS))
    for (let k = 0; k < 24; k++) {
      const a = (Math.PI * 2 * k) / 24;
      around.push([y + (r + 0.012) * Math.cos(a), z + (r + 0.012) * Math.sin(a)]);
    }
  const path = hull2(around).map(([y, z]) => [BELT_X, y, z] as Vec);
  p('rubber', pipe(path, 0.014, 64, true));
}

function buildPulley(out: Parts): void {
  // The harmonic balancer on the crank snout: it turns with the crank.
  out.pieces.push({
    unit: 'pulley',
    key: 'crank',
    finish: 'steel',
    geometry: lathe(grooved(PULLEYS.crank.r, -0.05, 0.1, 0.07), 'x', [BELT_X, 0, 0], 28),
  });
}

function buildIntake(out: Parts): void {
  const p = (finish: Finish, geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'intake', key: null, finish, geometry });
  };
  const plenum: Vec = [0, 1.36, -0.74];
  p(
    'alu',
    lathe(
      [
        [0, -1.5],
        [0.08, -1.49],
        [0.125, -1.45],
        [0.13, -1.38],
        [0.13, 1.32],
        [0.12, 1.38],
        [0.07, 1.42],
        [0, 1.43],
      ],
      'x',
      plenum,
    ),
  );
  xs.forEach((x) => {
    p('alu', pipe([[x, 1.07, -0.4], [x, 1.06, -0.52], [x, 1.12, -0.64], [x, 1.26, -0.7]], 0.048, 14));
    p('alu', block([x - 0.085, 0.99, -0.44], [x + 0.085, 1.15, -0.385], 0.015));
  });
  // Throttle body at the front, with its flange and cable wheel.
  p(
    'alu',
    lathe(
      [
        [0.06, -1.86],
        [0.1, -1.86],
        [0.1, -1.6],
        [0.135, -1.6],
        [0.135, -1.56],
        [0.115, -1.56],
        [0.115, -1.48],
        [0.06, -1.48],
      ],
      'x',
      [0, plenum[1], plenum[2]],
    ),
  );
  p('steel', rod('z', [-1.72, plenum[1], plenum[2] - 0.11], 0.05, 0.02, 24));
}

function buildExhaust(out: Parts): void {
  const p = (geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'exhaust', key: null, finish: 'exhaust', geometry });
  };
  p(block([-H + 0.1, 0.98, 0.38], [H - 0.1, 1.14, 0.425], 0.012));
  // Short, thick runners that turn down and back into a log collector along the block.
  xs.forEach((x) => p(pipe([[x, 1.06, 0.42], [x, 1.01, 0.53], [x + 0.08, 0.86, 0.6], [x + 0.2, 0.74, 0.62]], 0.055, 14)));
  p(pipe([[-1.3, 0.72, 0.62], [1.3, 0.72, 0.62], [1.62, 0.62, 0.66], [1.78, 0.3, 0.7], [1.82, -0.3, 0.71]], 0.08, 28));
  p(lathe([[0, -1.38], [0.07, -1.38], [0.085, -1.33], [0, -1.33]], 'x', [0, 0.72, 0.62], 24));
  p(lathe([[0.06, -0.36], [0.12, -0.36], [0.12, -0.32], [0.06, -0.32]], 'y', [1.82, 0, 0.71], 28));
}

function buildPan(out: Parts): void {
  // The pan in side view: deep sump at the front, shallow at the back.
  const side = outline([
    [-H + 0.06, -0.21],
    [H - 0.06, -0.21],
    [H - 0.06, -0.36],
    [H - 0.22, -0.44],
    [0.95, -0.44],
    [0.7, -0.64],
    [-H + 0.24, -0.66],
    [-H + 0.1, -0.56],
  ]);
  out.pieces.push({ unit: 'pan', key: null, finish: 'cast', geometry: alongZ(side, -0.34, 0.34, 0.045) });
  out.pieces.push({ unit: 'pan', key: null, finish: 'cast', geometry: block([-H - 0.02, -0.235, -0.48], [H + 0.02, -0.2, 0.48], 0.01) });
  out.pieces.push({ unit: 'pan', key: null, finish: 'steel', geometry: lathe([[0, -0.7], [0.035, -0.7], [0.035, -0.66], [0, -0.66]], 'y', [-0.5, 0, 0], 6) });
  const bolts: Matrix4[] = [];
  for (let k = 0; k <= 8; k++) for (const z of [-0.44, 0.44]) bolts.push(at([-H + 0.1 + (k * (2 * H - 0.2)) / 8, -0.2, z]));
  out.repeats.push({ unit: 'pan', finish: 'steel', geometry: boltHead(), at: bolts });
}

function buildFlywheel(out: Parts): void {
  const x0 = H + 0.08;
  out.pieces.push({
    unit: 'flywheel',
    key: 'crank',
    finish: 'steel',
    geometry: lathe(
      [
        [0, x0],
        [0.1, x0],
        [0.1, x0 + 0.04],
        [0.44, x0 + 0.06],
        [0.5, x0 + 0.02],
        [0.53, x0 + 0.02],
        [0.53, x0 + 0.13],
        [0.47, x0 + 0.13],
        [0.42, x0 + 0.1],
        [0.12, x0 + 0.1],
        [0.08, x0 + 0.14],
        [0, x0 + 0.14],
      ],
      'x',
      [0, 0, 0],
      40,
    ),
  });
  // The ring gear's teeth around the rim, and the bolts on the hub.
  const teeth: Matrix4[] = [];
  const count = 72;
  for (let k = 0; k < count; k++) {
    const a = (Math.PI * 2 * k) / count;
    const m = new Matrix4().makeRotationX(a).setPosition(x0 + 0.075, 0.545 * Math.cos(a), 0.545 * Math.sin(a));
    teeth.push(m);
  }
  const tooth = new CylinderGeometry(0.014, 0.022, 0.03, 4);
  tooth.scale(2.4, 1, 1); // long across the rim, as a ring gear's teeth are
  out.repeats.push({ unit: 'flywheel', finish: 'steel', geometry: tooth, at: teeth });
  const bolts: Matrix4[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI * 2 * k) / 6;
    bolts.push(at([x0 + 0.15, 0.065 * Math.cos(a), 0.065 * Math.sin(a)], [1, 0, 0]));
  }
  out.repeats.push({ unit: 'flywheel', finish: 'steel', geometry: boltHead(), at: bolts });
}

/** One crank web: an arm around the crankpin and a fan-shaped counterweight opposite it. */
function webShape(): Shape {
  return outline([
    ...arc(0, THROW, 0.085, 0, Math.PI, 10),
    [-0.09, 0.02],
    ...arc(0, 0, 0.23, Math.PI + 0.35, 2 * Math.PI - 0.35, 14),
    [0.09, 0.02],
  ]);
}

function buildCrank(out: Parts): void {
  const p = (geometry: BufferGeometry): void => {
    out.pieces.push({ unit: 'crank', key: 'crank', finish: 'steel', geometry });
  };
  // The main journals as one turned shaft, with the snout at the front and a flange at the back.
  p(
    lathe(
      [
        [0, -H - 0.36],
        [0.045, -H - 0.36],
        [0.045, -H - 0.1],
        [0.065, -H - 0.1],
        [0.065, H - 0.02],
        [0.13, H - 0.02],
        [0.13, H + 0.08],
        [0, H + 0.08],
      ],
      'x',
      [0, 0, 0],
      28,
    ),
  );
  const web = webShape();
  for (let i = 0; i < CYLINDERS; i++) {
    const turn = new Matrix4().makeRotationX(PHASE[i]!);
    for (const side of [-1, 1]) {
      const x = xs[i]! + side * 0.1;
      p(alongX(web, x - 0.025, x + 0.025, 0.008).applyMatrix4(turn));
    }
    p(rod('x', [xs[i]!, THROW, 0], 0.06, 0.15, 24).applyMatrix4(turn));
  }
}

/** The subassemblies in build order; the scene yields to the page between steps. */
export const STEPS: ((out: Parts) => void)[] = [
  buildBlockCasting,
  buildBlockHardware,
  buildHead,
  buildCover,
  buildCoils,
  buildTiming,
  buildFront,
  buildPulley,
  buildIntake,
  buildExhaust,
  buildPan,
  buildFlywheel,
  buildCrank,
];

/* ---- Moving parts: one geometry each, placed every frame ---- */

/** A piston, its origin at the wrist pin: a dished crown, three ring grooves, and the skirt. */
export function pistonGeometry(): BufferGeometry {
  const top = PIN_TO_CROWN;
  const r = PISTON_R;
  const g = 0.008;
  return lathe(
    [
      [0, top - 0.012],
      [r - 0.05, top - 0.004],
      [r - 0.008, top],
      [r, top - 0.008],
      [r, top - 0.025],
      [r - g, top - 0.025],
      [r - g, top - 0.035],
      [r, top - 0.035],
      [r, top - 0.05],
      [r - g, top - 0.05],
      [r - g, top - 0.06],
      [r, top - 0.06],
      [r, top - 0.075],
      [r - g, top - 0.075],
      [r - g, top - 0.088],
      [r, top - 0.088],
      [r - 0.004, -0.08],
      [r - 0.03, -0.08],
      [r - 0.03, 0.02],
      [0, 0.02],
    ],
    'y',
    [0, 0, 0],
    32,
  );
}

/** A connecting rod, its origin at the big end, running up y to the small end at ROD. */
export function rodGeometry(): BufferGeometry {
  const shape = outline(
    [
      [0.04, 0.07],
      [0.026, ROD - 0.045],
      ...arc(0, ROD, 0.048, -0.6, Math.PI + 0.6, 12),
      [-0.026, ROD - 0.045],
      [-0.04, 0.07],
      ...arc(0, 0, 0.088, (Math.PI * 2) / 3, Math.PI * 2 + Math.PI / 3, 18),
    ],
    [hole(0, ROD, 0.024), hole(0, 0, 0.058)],
  );
  return alongX(shape, -0.022, 0.022, 0.006);
}

/** The flash of a firing cylinder, a thin disc over the piston. */
export function flameGeometry(): BufferGeometry {
  return new CylinderGeometry(PISTON_R - 0.01, PISTON_R - 0.01, 0.02, 24);
}

/** Convex hull of points in a plane (for the belt's path). */
function hull2(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]): number =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Anchor points (engine coordinates, per unit) for the hardware callouts' leaders. */
export const CALLOUT_ANCHORS = {
  overview: { unit: 'head' as Unit, points: [[H, 1.22, 0.33], [H, 1.22, -0.33], [-H, 1.22, 0.33], [-H, 1.22, -0.33]] as Vec[] },
  education: { unit: 'block' as Unit, points: [[H, 0.5, 0.42], [H, 0.5, -0.42], [-H, 0.5, 0.42], [-H, 0.5, -0.42]] as Vec[] },
  career: { unit: 'flywheel' as Unit, points: [[H + 0.22, 0, 0]] as Vec[] },
};
