/**
 * The cover sheet's 3D model, in Three.js: an inline-six engine (engine.ts holds its numbers,
 * engineParts.ts its shapes). Loaded on demand by EngineModel (a dynamic import), so none of
 * this is in the first bundle and the page renders without it.
 *
 * Each cylinder stands for a skill layer. Running a configuration (a project) turns the crank
 * and fires only the cylinders whose layers that project used. The block (education), the head
 * (the headline numbers) and the crankshaft (career) stand for sections of the page.
 *
 * Built for a fast, steady page:
 * - The engine is built in steps that yield to the page, so no task blocks input for long.
 * - Static pieces are merged into one mesh per unit, meaning and finish; repeated hardware is
 *   instanced. Shaders compile before the first frame.
 * - Pointer picking tests a few invisible primitives, never the detailed meshes.
 * - It renders only while something moves, pauses off screen, and lowers its resolution if
 *   frames run slow. Everything is disposed on unmount.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  DoubleSide,
  EdgesGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BLOCK_HALF,
  COIL_TOP,
  CYLINDERS,
  EXPLODE,
  FIRE_AT,
  PHASE,
  PIN_TO_CROWN,
  ROTATING,
  THROW,
  cylinderX,
  pinHeight,
  type Key,
  type Unit,
  type Vec,
} from './engine';
import {
  CALLOUT_ANCHORS,
  STEPS,
  flameGeometry,
  pistonGeometry,
  rodGeometry,
  type Finish,
  type Parts,
} from './engineParts';
import type { Part, SectionId } from './parts';

export type View = 'iso' | 'front' | 'top' | 'right';
/** Shaded; X-ray (the block, head, cover and pan see-through); wireframe (edges only). */
export type Display = 'shaded' | 'xray' | 'wireframe';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface Frame {
  width: number;
  height: number;
  /** Left edge of the callout column, or null when there is no room for one. */
  column: number | null;
  /** Top of each cylinder's coil pack, where its balloon's leader starts. */
  cylinders: ScreenPoint[];
  /** Where each section's callout leader starts. */
  sections: Record<SectionId, ScreenPoint>;
  /** Screen directions of the world axes (unit length), for the triad. */
  axes: { x: ScreenPoint; y: ScreenPoint; z: ScreenPoint };
}

export interface Palette {
  ink: string;
  cyan: string;
  /** Edge lines over shaded surfaces. */
  edge: string;
  finishes: Record<Finish, string>;
}

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  /** For each project, whether it used each cylinder's layer. */
  usage: boolean[][];
  palette: Palette;
  reducedMotion: boolean;
  /** Pixels kept clear on the right for the callout column (0 for none), read on every fit. */
  calloutRoom: () => number;
  onFrame: (frame: Frame) => void;
  onHover: (part: Part | null) => void;
  onPick: (part: Part) => void;
  /** Stop building early (the component unmounted); the promise then rejects. */
  cancelled?: () => boolean;
}

export interface SceneHandle {
  setView: (view: View) => void;
  setExploded: (exploded: boolean) => void;
  setDisplay: (display: Display) => void;
  /** The part in focus: it lights cyan and the rest dims. A project runs the engine. */
  setEmphasis: (part: Part | null) => void;
  rotateBy: (azimuth: number, polar: number) => void;
  intro: () => void;
  resize: () => void;
  setVisible: (visible: boolean) => void;
  /** The framed extents in CSS pixels: what the poster image shows. */
  posterBox: () => { x: number; y: number; width: number; height: number };
  dispose: () => void;
}

/* ---- Camera ---- */
const RADIUS = 20;
const ISO_POLAR = Math.PI / 2 - Math.atan(1 / Math.SQRT2); // 54.74deg from vertical: true isometric
const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);
const VIEWS: Record<View, { azimuth: number; polar: number }> = {
  iso: { azimuth: Math.PI / 4, polar: ISO_POLAR },
  front: { azimuth: 0, polar: Math.PI / 2 },
  top: { azimuth: 0, polar: 0.0001 },
  right: { azimuth: Math.PI / 2, polar: Math.PI / 2 },
};
const ROOM_TOP = 44; // px above the engine for the cylinder balloons (--model-room-top)
const ROOM_BOTTOM = 8; // (--model-room-bottom)

/* ---- Motion ---- */
const VIEW_MS = 650;
const KEY_MS = 220; // one arrow-key step
const EXPLODE_MS = 850;
const XRAY_MS = 260;
const INTRO_DELAY_MS = 900;
const INTRO_TURN = 0.7; // radians of camera swing
const INTRO_MS = 2400;
const INTRO_REVS = 2; // the crank turns over once the page has settled
const RUN_MS = 3600;
const RUN_REVS = 4; // two four-stroke cycles: every used cylinder fires twice
const FLASH = (70 * Math.PI) / 180; // crank angle a firing flash lasts
const IDLE_FRAMES = 6;
const SLICE_MS = 10; // longest stretch of building work before handing the page back
const ORBIT_SPEED = 0.45; // turns per viewport height dragged
const SPIN_DAMPING = 0.9; // share of the coasting speed kept each frame

/* ---- Look ---- */
const EDGE_ANGLE = 35; // degrees between faces for an edge line: none on rounded edges' facets
const LINE_PX = 1;
const LINE_PX_HOT = 1.6;
const XRAY_OPACITY = 0.16;
/** Units whose surfaces turn see-through in X-ray: the shell around the moving parts. */
const SHELL: Unit[] = ['block', 'head', 'cover', 'timing', 'pan'];
/** Blinn-Phong: how bright and how tight each finish's highlight is. Cheap to compile and to
    draw, with no environment map to build, which keeps the scene light on phones. */
const SURFACE: Record<Finish, { specular: number; shininess: number }> = {
  alu: { specular: 0.38, shininess: 42 },
  cast: { specular: 0.18, shininess: 14 },
  paint: { specular: 0.45, shininess: 70 },
  steel: { specular: 0.7, shininess: 110 },
  exhaust: { specular: 0.28, shininess: 24 },
  plastic: { specular: 0.2, shininess: 30 },
  rubber: { specular: 0.05, shininess: 6 },
  gasket: { specular: 0.1, shininess: 10 },
  bore: { specular: 0.6, shininess: 90 },
  coil: { specular: 0.22, shininess: 34 },
};

/* ---- Performance ---- */
const DPR_MAX_FINE = 2;
const DPR_MAX_COARSE = 1.75;
const DPR_MIN = 1;
const SLOW_FRAME_MS = 40; // average frame interval while moving (under 25 fps) that lowers the resolution a step

const SECTION_OF = { block: 'education', head: 'overview', crank: 'career' } as const satisfies Record<
  Exclude<Key, `cyl${number}` | null>,
  SectionId
>;

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number): number => 1 - (1 - t) ** 3;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hand the main thread back to the page between building steps. */
function yieldToPage(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield ? scheduler.yield() : new Promise((resolve) => setTimeout(resolve, 0));
}

interface Tween {
  /** Camera tweens stop when the visitor grabs the model; layout tweens (explode) finish. */
  kind: 'camera' | 'layout';
  start: number;
  duration: number;
  step: (k: number) => void;
  /** Ease-in-out unless given (keyboard steps ease out, so a held key turns smoothly). */
  ease?: (t: number) => number;
}

/** Shortest signed angle from a to b. */
function angleTo(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const cylIndex = (key: Key): number => (key?.startsWith('cyl') ? Number(key.slice(3)) : -1);

function partOf(key: Key): Part | null {
  if (!key) return null;
  if (key.startsWith('cyl')) return { kind: 'layer', index: Number(key.slice(3)) };
  return { kind: 'section', id: SECTION_OF[key as keyof typeof SECTION_OF] };
}

/** A visible piece: its mesh, its outline, and what it stands for. */
interface Solid {
  mesh: Mesh;
  lines: LineSegments2 | null;
  key: Key;
  base: Material;
  /** Lit version of base; per-cylinder materials light themselves (null). */
  hot: Material | null;
}

export async function createEngineScene(opts: SceneOptions): Promise<SceneHandle> {
  const { canvas, palette, reducedMotion, usage } = opts;
  const ink = new Color(palette.ink);
  const cyan = new Color(palette.cyan);
  const edge = new Color(palette.edge);
  const flash = cyan.clone().lerp(new Color(0xffffff), 0.35);
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  /** Unmounted mid-build: free what exists so far, and stop. */
  const check = (): void => {
    if (!opts.cancelled?.()) return;
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    renderer.dispose();
    throw new Error('cancelled');
  };

  // User Timing marks for each phase (DevTools > Performance shows them as engine:*).
  const phase = (name: string, from: string): void => {
    performance.mark(`engine:${name}`);
    performance.measure(`engine:${name}`, `engine:${from}`, `engine:${name}`);
  };
  performance.mark('engine:start');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let dprCap = Math.min(window.devicePixelRatio || 1, coarse ? DPR_MAX_COARSE : DPR_MAX_FINE);
  renderer.setPixelRatio(dprCap);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new Scene();
  // A sky-and-ground fill, a key light from above the front, and a soft fill and rim behind.
  scene.add(new HemisphereLight(0xe4edfa, 0x1c2c44, 1.15));
  const key = new DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 7, 5);
  const fill = new DirectionalLight(0xc9dcff, 0.55);
  fill.position.set(-5, 2, -4);
  const rim = new DirectionalLight(0xffffff, 0.45);
  rim.position.set(-2, -3, 6);
  scene.add(key, fill, rim);
  phase('context', 'start');
  await yieldToPage();

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const target = new Vector3(0, 0, 0);
  const spherical = new Spherical(RADIUS, VIEWS.iso.polar, VIEWS.iso.azimuth);
  camera.position.setFromSpherical(spherical).add(target);
  camera.lookAt(target);

  /* ---- Materials ---- */
  const lineNormal = new LineMaterial({ color: edge.getHex(), linewidth: LINE_PX, transparent: true, opacity: 0.7 });
  const lineHot = new LineMaterial({ color: cyan.getHex(), linewidth: LINE_PX_HOT });
  const lineDim = new LineMaterial({ color: edge.getHex(), linewidth: LINE_PX, transparent: true, opacity: 0.2 });
  const lineMaterials = [lineNormal, lineHot, lineDim];
  for (const m of lineMaterials) {
    m.toneMapped = false;
    materials.push(m);
  }

  const own = <T extends Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const surface = (finish: Finish): MeshPhongMaterial =>
    own(
      new MeshPhongMaterial({
        color: new Color(palette.finishes[finish]),
        specular: new Color().setScalar(SURFACE[finish].specular),
        shininess: SURFACE[finish].shininess,
        side: DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    );
  /** Shell surfaces stay in the transparent pass so X-ray never recompiles a shader. */
  const shellMaterials: MeshPhongMaterial[] = [];
  const finishMats = new Map<string, MeshPhongMaterial>();
  function finishMat(finish: Finish, shell: boolean): MeshPhongMaterial {
    const id = `${finish}|${shell}`;
    let m = finishMats.get(id);
    if (!m) {
      m = surface(finish);
      if (shell) {
        m.transparent = true;
        shellMaterials.push(m);
      }
      finishMats.set(id, m);
    }
    return m;
  }
  const hotMats = new Map<Material, MeshPhongMaterial>();
  function hotOf(base: MeshPhongMaterial): MeshPhongMaterial {
    let m = hotMats.get(base);
    if (!m) {
      m = own(base.clone());
      m.emissive.copy(cyan);
      m.emissiveIntensity = 0.38;
      if (base.transparent) shellMaterials.push(m);
      hotMats.set(base, m);
    }
    return m;
  }
  // Per cylinder, so a firing cylinder can light on its own: the coil pack and the piston.
  const coilMats = Array.from({ length: CYLINDERS }, () => surface('coil'));
  const pistonMats = Array.from({ length: CYLINDERS }, () => surface('alu'));
  const flameMats = Array.from({ length: CYLINDERS }, () =>
    own(new MeshBasicMaterial({ color: flash, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
  );
  // Wireframe hides surfaces by swapping this in: hiding the mesh would hide its outline too.
  const hidden = own(new MeshBasicMaterial({ visible: false }));

  /* ---- Units ---- */
  const assembly = new Group();
  scene.add(assembly);
  const units = {} as Record<Unit, Group>;
  for (const unit of Object.keys(EXPLODE) as Unit[]) {
    units[unit] = new Group();
    assembly.add(units[unit]);
  }

  const keep = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  function outline(geometry: BufferGeometry): LineSegments2 {
    const edges = new EdgesGeometry(geometry, EDGE_ANGLE);
    const lines = keep(new LineSegmentsGeometry().setPositions(edges.attributes.position!.array as Float32Array));
    edges.dispose();
    return new LineSegments2(lines, lineNormal);
  }

  const solids: Solid[] = [];
  function addSolid(parent: Object3D, mesh: Mesh, key: Key, hot: Material | null, lines: LineSegments2 | null): Mesh {
    if (lines) mesh.add(lines);
    parent.add(mesh);
    solids.push({ mesh, lines, key, base: mesh.material as Material, hot });
    return mesh;
  }

  /* ---- Build, a subassembly at a time ---- */
  const parts: Parts = { pieces: [], repeats: [] };
  for (const step of STEPS) {
    step(parts);
    await yieldToPage();
    check();
  }

  phase('shapes', 'context');

  // Merge static pieces by unit, meaning and finish, outlining each piece on the way. The work
  // is time-sliced, so no task runs long even on a slow phone.
  let slice = performance.now();
  const breathe = async (): Promise<void> => {
    if (performance.now() - slice < SLICE_MS) return;
    await yieldToPage();
    check();
    slice = performance.now();
  };
  const buckets = new Map<string, { unit: Unit; key: Key; finish: Finish; list: BufferGeometry[]; lines: Float32Array[] }>();
  for (const piece of parts.pieces) {
    const id = `${piece.unit}|${piece.key}|${piece.finish}`;
    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = { unit: piece.unit, key: piece.key, finish: piece.finish, list: [], lines: [] };
      buckets.set(id, bucket);
    }
    // One layout for all: no index, no UVs (nothing is textured).
    const flat = piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry;
    if (flat !== piece.geometry) piece.geometry.dispose();
    flat.deleteAttribute('uv');
    const edges = new EdgesGeometry(flat, EDGE_ANGLE);
    bucket.lines.push(edges.attributes.position!.array as Float32Array);
    edges.dispose();
    bucket.list.push(flat);
    await breathe();
  }
  for (const { unit, key, finish, list, lines } of buckets.values()) {
    const merged = keep(mergeGeometries(list, false)!);
    for (const g of list) g.dispose();
    const all = new Float32Array(lines.reduce((n, l) => n + l.length, 0));
    lines.reduce((at, l) => (all.set(l, at), at + l.length), 0);
    const outlines = new LineSegments2(keep(new LineSegmentsGeometry().setPositions(all)), lineNormal);
    const c = cylIndex(key);
    const material = finish === 'coil' ? coilMats[c]! : finishMat(finish, SHELL.includes(unit));
    addSolid(units[unit], new Mesh(merged, material), key, finish === 'coil' ? null : hotOf(material), outlines);
    await breathe();
  }
  for (const repeat of parts.repeats) {
    const material = finishMat(repeat.finish, SHELL.includes(repeat.unit));
    const mesh = new InstancedMesh(keep(repeat.geometry), material, repeat.at.length);
    repeat.at.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.computeBoundingSphere();
    addSolid(units[repeat.unit], mesh, null, hotOf(material), null);
  }

  // Pistons, rods and the flame in each combustion chamber: one geometry each, placed per frame.
  const pistonGeo = keep(pistonGeometry());
  const rodGeo = keep(rodGeometry());
  const flameGeo = keep(flameGeometry());
  const pistonLines = outline(pistonGeo).geometry;
  const rodLines = outline(rodGeo).geometry;
  const steel = finishMat('steel', false);
  const pistons = Array.from({ length: CYLINDERS }, (_, i) => {
    const key: Key = `cyl${i}`;
    const piston = addSolid(units.pistons, new Mesh(pistonGeo, pistonMats[i]), key, null, new LineSegments2(pistonLines, lineNormal));
    const rod = addSolid(units.pistons, new Mesh(rodGeo, steel), key, hotOf(steel), new LineSegments2(rodLines, lineNormal));
    const flame = new Mesh(flameGeo, flameMats[i]);
    flame.visible = false;
    units.pistons.add(flame);
    return { piston, rod, flame, x: cylinderX(i) };
  });
  await yieldToPage();
  check();

  phase('meshes', 'shapes');

  /* ---- Picking: a few invisible primitives on their own layer, never rendered ---- */
  const PICK_LAYER = 1;
  const proxyMat = own(new MeshBasicMaterial());
  const proxies: Mesh[] = [];
  const H = BLOCK_HALF;
  function proxy(parent: Object3D, size: Vec, center: Vec, key: Key, round = false): void {
    const geometry = keep(round ? new CylinderGeometry(size[1], size[1], size[0], 12).rotateZ(Math.PI / 2) : new BoxGeometry(...size));
    const mesh = new Mesh(geometry, proxyMat);
    mesh.position.set(...center);
    mesh.layers.set(PICK_LAYER);
    mesh.userData.key = key;
    parent.add(mesh);
    proxies.push(mesh);
  }
  proxy(units.block, [2 * H, 1.12, 1.0], [0, 0.36, 0], 'block');
  proxy(units.head, [2 * H, 0.3, 0.8], [0, 1.07, 0], 'head');
  proxy(units.cover, [2 * H - 0.2, 0.26, 0.62], [0, 1.35, 0], 'head');
  for (let i = 0; i < CYLINDERS; i++) proxy(units.coils, [0.14, 0.13, 0.32], [cylinderX(i), 1.515, -0.025], `cyl${i}`);
  proxy(units.crank, [2 * H + 0.4, 0.24, 0], [0, 0, 0], 'crank', true);
  proxy(units.flywheel, [0.16, 0.55, 0], [H + 0.15, 0, 0], 'crank', true);
  proxy(units.pulley, [0.14, 0.22, 0], [-H - 0.3, 0, 0], 'crank', true);
  pistons.forEach((p, i) => {
    const m = new Mesh(keep(new CylinderGeometry(0.19, 0.19, 0.22, 12)), proxyMat);
    m.position.y = 0.01;
    m.layers.set(PICK_LAYER);
    m.userData.key = `cyl${i}`;
    p.piston.add(m);
    proxies.push(m);
  });
  // Hardware with no link still hides what is behind it.
  proxy(units.pan, [2 * H, 0.48, 0.96], [0, -0.44, 0], null);
  proxy(units.intake, [3.3, 0.5, 0.5], [-0.22, 1.25, -0.63], null);
  proxy(units.exhaust, [3.35, 0.5, 0.36], [0.1, 0.88, 0.58], null);
  proxy(units.exhaust, [0.2, 0.96, 0.18], [1.82, 0.12, 0.71], null);
  proxy(units.timing, [0.14, 1.57, 0.66], [-H - 0.07, 0.52, 0], null);
  proxy(units.front, [0.12, 0.95, 0.9], [-H - 0.3, 0.24, 0.21], null);
  proxy(units.front, [0.24, 0.3, 0.3], [-H - 0.13, 0.55, 0.5], null);

  /* ---- Crank angle: pistons and rods follow it ---- */
  let crank = 0;
  function setCrank(theta: number): void {
    crank = theta;
    for (const unit of ROTATING) units[unit].rotation.x = theta;
    pistons.forEach((p, i) => {
      const phi = theta + PHASE[i]!;
      const pinY = pinHeight(phi);
      const crankY = THROW * Math.cos(phi);
      const crankZ = THROW * Math.sin(phi);
      p.piston.position.set(p.x, pinY, 0);
      p.flame.position.set(p.x, pinY + PIN_TO_CROWN + 0.03, 0);
      // The rod runs from the crankpin up to the piston's wrist pin; it is rigid, so only turns.
      p.rod.position.set(p.x, crankY, crankZ);
      p.rod.rotation.x = Math.atan2(-crankZ, pinY - crankY);
    });
  }
  setCrank(0);

  /* ---- Explode, and the frame it needs ---- */
  // Bounds per unit, measured once, assembled and moved out by its explode offset.
  assembly.updateMatrixWorld(true);
  const unitBoxes = (Object.keys(EXPLODE) as Unit[]).map((unit) => ({ unit, box: new Box3().setFromObject(units[unit]) }));
  const bounds = (t: number): Box3 => {
    const all = new Box3();
    for (const { unit, box } of unitBoxes) {
      if (box.isEmpty()) continue;
      const [x, y, z] = EXPLODE[unit];
      all.union(box.clone().translate(new Vector3(x * t, y * t, z * t)));
    }
    return all;
  };
  const assembled = bounds(0);
  const explodedBox = bounds(1);

  let explode = 0; // 0 assembled, 1 exploded
  function layout(): void {
    for (const unit of Object.keys(EXPLODE) as Unit[]) {
      const [x, y, z] = EXPLODE[unit];
      units[unit].position.set(x * explode, y * explode, z * explode);
    }
    const a = assembled.getCenter(new Vector3());
    const b = explodedBox.getCenter(new Vector3());
    assembly.position.copy(a.lerp(b, explode)).negate();
  }
  layout();

  /* ---- Emphasis ---- */
  let display: Display = 'shaded';
  let hotKeys = new Set<Key>();
  let focus: Part | null = null;
  /** The project the engine last ran for; it runs again only for another one. */
  let lastRun: number | null = null;
  /** Firing flash per cylinder, 0..1, while the engine runs. */
  const fire = new Array<number>(CYLINDERS).fill(0);
  /** How see-through the shell is, 0..1, and where it is heading. */
  let xray = 0;
  let xrayTarget = 0;

  function keysFor(part: Part | null): Set<Key> {
    const keys = new Set<Key>();
    if (!part) return keys;
    if (part.kind === 'layer') keys.add(`cyl${part.index}`);
    else if (part.kind === 'project') usage[part.index]?.forEach((used, i) => used && keys.add(`cyl${i}`));
    else for (const [k, id] of Object.entries(SECTION_OF)) if (id === part.id) keys.add(k as Key);
    return keys;
  }

  function paintCylinders(): void {
    for (let i = 0; i < CYLINDERS; i++) {
      const glow = (hotKeys.has(`cyl${i}`) ? 0.45 : 0) + fire[i]! * 1.4;
      for (const m of [coilMats[i]!, pistonMats[i]!]) {
        m.emissive.copy(fire[i]! > 0 ? flash : cyan);
        m.emissiveIntensity = glow;
      }
      flameMats[i]!.opacity = fire[i]! * 0.9;
      pistons[i]!.flame.visible = fire[i]! > 0.01;
    }
  }

  function paintShell(): void {
    const opacity = lerp(1, XRAY_OPACITY, xray);
    for (const m of shellMaterials) {
      m.opacity = opacity;
      m.depthWrite = opacity > 0.99;
    }
  }

  /** The shell clears when looking inside: X-ray chosen, a run, or a cylinder or project in focus. */
  function updateXray(): void {
    const inside = focus?.kind === 'layer' || focus?.kind === 'project' || run !== null;
    xrayTarget = display === 'xray' || (display === 'shaded' && inside) ? 1 : 0;
    if (reducedMotion) {
      xray = xrayTarget;
      paintShell();
    }
    requestRender();
  }

  function applyEmphasis(): void {
    const wire = display === 'wireframe';
    const dimming = hotKeys.size > 0;
    for (const s of solids) {
      const hot = hotKeys.has(s.key);
      s.mesh.material = wire ? hidden : hot && s.hot ? s.hot : s.base;
      if (s.lines) s.lines.material = hot ? lineHot : dimming ? lineDim : lineNormal;
    }
    // Edges: dark over shaded surfaces, light on their own.
    const lineColor = wire || display === 'xray' ? ink : edge;
    lineNormal.color.copy(lineColor);
    lineDim.color.copy(lineColor);
    lineNormal.opacity = wire ? 0.85 : display === 'xray' ? 0.6 : 0.7;
    for (const m of lineMaterials) m.depthTest = !wire;
    paintCylinders();
    updateXray();
  }

  /* ---- Rendering on demand ---- */
  let raf = 0;
  let idle = 0;
  let dirty = true;
  let visible = true;
  let live = false; // nothing renders until every shader is compiled
  let last = 0;
  const slow: number[] = [];
  const tweens = new Set<Tween>();
  const size = new Vector2();
  const tmp = new Vector3();
  let column: number | null = null;
  /** The running configuration: its project, when it started, and the crank angle it left from. */
  let run: { project: number; start: number; from: number } | null = null;

  function project(p: Vector3): ScreenPoint {
    tmp.copy(p).project(camera);
    return { x: ((tmp.x + 1) / 2) * size.x, y: ((1 - tmp.y) / 2) * size.y };
  }

  /** Of some points in a unit's own coordinates, the one furthest right on screen. */
  function rightmost(unit: Unit, points: Vec[]): ScreenPoint {
    let best: ScreenPoint = { x: -Infinity, y: 0 };
    const v = new Vector3();
    for (const p of points) {
      const s = project(v.set(...p).applyMatrix4(units[unit].matrixWorld));
      if (s.x > best.x) best = s;
    }
    return best;
  }

  function emitFrame(): void {
    const v = new Vector3();
    const cylinders = pistons.map((p) => project(v.set(p.x, COIL_TOP, 0).applyMatrix4(units.coils.matrixWorld)));
    const sections = {} as Record<SectionId, ScreenPoint>;
    for (const [id, anchor] of Object.entries(CALLOUT_ANCHORS))
      sections[id as SectionId] = rightmost(anchor.unit, anchor.points);
    const inv = camera.quaternion.clone().invert();
    const axis = (x: number, y: number, z: number): ScreenPoint => {
      const a = v.set(x, y, z).applyQuaternion(inv);
      return { x: a.x, y: -a.y };
    };
    opts.onFrame({
      width: size.x,
      height: size.y,
      column,
      cylinders,
      sections,
      axes: { x: axis(1, 0, 0), y: axis(0, 1, 0), z: axis(0, 0, 1) },
    });
  }

  function stepRun(now: number): boolean {
    if (!run) return false;
    const k = Math.min(1, (now - run.start) / RUN_MS);
    const theta = run.from + Math.PI * 2 * RUN_REVS * easeInOut(k);
    setCrank(theta);
    const used = usage[run.project] ?? [];
    const cycle = Math.PI * 4;
    for (let i = 0; i < CYLINDERS; i++) {
      const since = (((theta - FIRE_AT[i]!) % cycle) + cycle) % cycle;
      fire[i] = used[i] && k < 1 && since < FLASH ? 1 - since / FLASH : 0;
    }
    paintCylinders();
    if (k >= 1) {
      run = null;
      updateXray();
    }
    return true;
  }

  function stepXray(dt: number): boolean {
    if (xray === xrayTarget) return false;
    const d = Math.min(1, dt / XRAY_MS);
    xray = xray < xrayTarget ? Math.min(xrayTarget, xray + d) : Math.max(xrayTarget, xray - d);
    paintShell();
    return true;
  }

  /** Too slow while moving: one step less resolution, for good. */
  function watchPace(dt: number): void {
    if (dt <= 0 || dt > 200) return; // the first frame after a pause says nothing
    slow.push(dt);
    if (slow.length < 30) return;
    const average = slow.reduce((a, b) => a + b, 0) / slow.length;
    slow.length = 0;
    if (average > SLOW_FRAME_MS && dprCap > DPR_MIN) {
      dprCap = Math.max(DPR_MIN, dprCap - 0.25);
      renderer.setPixelRatio(dprCap);
      resize();
    }
  }

  function frame(now: number): void {
    raf = 0;
    const dt = last ? now - last : 16;
    last = now;
    let moved = stepSpin(dt);
    for (const t of tweens) {
      if (now < t.start) continue; // scheduled (the intro waits for the page to settle)
      const k = t.duration <= 0 ? 1 : Math.min(1, (now - t.start) / t.duration);
      t.step((t.ease ?? easeInOut)(k));
      moved = true;
      if (k >= 1) tweens.delete(t);
    }
    if (stepRun(now)) moved = true;
    if (stepXray(dt)) moved = true;
    if (moved || dirty) {
      renderer.render(scene, camera);
      emitFrame();
      dirty = false;
      idle = 0;
      if (moved) watchPace(dt);
    } else idle++;
    // A render requested during this frame (a resize, the X-ray settling) has already queued
    // the next one; never queue a second, or two loops would run.
    if (!raf && visible && (idle < IDLE_FRAMES || tweens.size > 0 || run || xray !== xrayTarget))
      raf = requestAnimationFrame(frame);
    if (!raf) last = 0;
  }

  function requestRender(): void {
    dirty = true;
    idle = 0;
    if (!raf && visible && live) raf = requestAnimationFrame(frame);
  }

  function addTween(
    kind: Tween['kind'],
    duration: number,
    step: (k: number) => void,
    ease?: (t: number) => number,
  ): void {
    if (kind === 'camera') {
      for (const t of tweens) if (t.kind === 'camera') tweens.delete(t);
      // A camera move takes over from any coasting, and from a keyboard turn's target.
      spin = { az: 0, pol: 0 };
      aim = null;
    }
    tweens.add({ kind, start: performance.now(), duration: reducedMotion ? 0 : duration, step, ease });
    requestRender();
  }

  /** Ease the camera to an azimuth and polar angle, the short way round. */
  function orbitTo(azimuth: number, polar: number, duration = VIEW_MS): void {
    const from = new Spherical().setFromVector3(tmp.copy(camera.position).sub(target));
    const dAz = angleTo(from.theta, azimuth);
    const dPol = polar - from.phi;
    addTween('camera', duration, (k) => {
      spherical.set(RADIUS, from.phi + dPol * k, from.theta + dAz * k);
      camera.position.setFromSpherical(spherical).add(target);
      camera.lookAt(target);
    });
  }

  /* ---- Size and framing ---- */
  let px = 1; // CSS pixels per world unit
  let frameCx = 0;
  let frameCy = 0;
  let across = 1;
  let tall = 1;

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    size.set(w, h);
    fit();
    for (const m of lineMaterials) m.resolution.set(w, h);
    requestRender();
  }

  /**
   * Size the orthographic frustum so the engine fits at any aspect, assembled or exploded, in
   * any orientation: across, the diagonal of its footprint; tall, its height plus that diagonal
   * as the isometric view foreshortens them. Centred when the callouts still fit beside it,
   * otherwise centred in what they leave.
   */
  function fit(): void {
    const { x: w, y: h } = size;
    if (!w || !h) return;
    const box = new Box3(
      assembled.min.clone().lerp(explodedBox.min, explode),
      assembled.max.clone().lerp(explodedBox.max, explode),
    );
    const dims = box.getSize(new Vector3());
    across = Math.hypot(dims.x, dims.z);
    tall = dims.y * Math.cos(ISO_ELEVATION) + across * Math.sin(ISO_ELEVATION);
    // With callouts, equal room on both sides keeps the engine centred and matches the poster's
    // CSS box exactly, so the handover from poster to canvas does not jump.
    const room = opts.calloutRoom();
    px = Math.min((w - room * 2) / (across * 1.04), (h - ROOM_TOP - ROOM_BOTTOM) / tall);
    const half = (across * px) / 2;
    frameCx = w / 2;
    frameCy = ROOM_TOP + (h - ROOM_TOP - ROOM_BOTTOM) / 2;
    camera.left = -frameCx / px;
    camera.right = (w - frameCx) / px;
    camera.top = frameCy / px;
    camera.bottom = -(h - frameCy) / px;
    camera.updateProjectionMatrix();
    column = room > 0 ? Math.min(w - room, frameCx + half + 24) : null;
  }

  /* ---- Orbit: drag to turn, with a little inertia ---- */
  // A mouse or pen turns and tilts from anywhere on the canvas. On touch, a finger that lands on
  // the engine grabs it: it turns and tilts, and the page holds still (onTouchStart cancels the
  // scroll). A finger that lands beside the engine scrolls the page as usual (pan-y), and
  // pinch-zoom stays available there.
  canvas.style.touchAction = 'pan-y pinch-zoom';
  let drag: { id: number; x: number; y: number; at: number } | null = null;
  /** Where a run of keyboard steps is heading, while it lasts. */
  let aim: { theta: number; phi: number } | null = null;
  let spin = { az: 0, pol: 0 }; // radians per frame, after a release

  function turn(dAz: number, dPol: number): void {
    spherical.setFromVector3(tmp.copy(camera.position).sub(target));
    spherical.theta += dAz;
    spherical.phi = Math.min(Math.PI - 0.0001, Math.max(0.0001, spherical.phi + dPol));
    camera.position.setFromSpherical(spherical).add(target);
    camera.lookAt(target);
  }

  /** Coast after a release, slowing to a stop. */
  function stepSpin(dt: number): boolean {
    if (drag || (Math.abs(spin.az) < 1e-4 && Math.abs(spin.pol) < 1e-4)) return false;
    turn(spin.az, spin.pol);
    const keep = SPIN_DAMPING ** (dt / 16.7);
    spin = { az: spin.az * keep, pol: spin.pol * keep };
    return true;
  }

  /* ---- Pointer: hover and pick ---- */

  const raycaster = new Raycaster();
  raycaster.layers.set(PICK_LAYER);
  const ndc = new Vector2();
  let hovered: Part | null = null;
  let down: { x: number; y: number } | null = null;
  let pending: PointerEvent | null = null;

  /** What the pick primitives under a screen point are, nearest first. */
  function hitsAt(x: number, y: number): ReturnType<Raycaster['intersectObjects']> {
    const box = canvas.getBoundingClientRect();
    ndc.set(((x - box.left) / box.width) * 2 - 1, -((y - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(proxies, false);
  }

  function partAt(e: PointerEvent): Part | null {
    const hits = hitsAt(e.clientX, e.clientY);
    if (!hits.length) return null;
    // In X-ray and wireframe the shell is see-through: a cylinder behind it wins.
    if (display !== 'shaded') {
      const inner = hits.find((h) => cylIndex(h.object.userData.key as Key) >= 0);
      if (inner) return partOf(inner.object.userData.key as Key);
    }
    return partOf(hits[0]!.object.userData.key as Key);
  }

  const same = (a: Part | null, b: Part | null): boolean => JSON.stringify(a) === JSON.stringify(b);

  function onMove(e: PointerEvent): void {
    if (drag && e.pointerId === drag.id) {
      // A full turn per two viewport heights of drag, at any size.
      const speed = (Math.PI * 2 * ORBIT_SPEED) / Math.max(canvas.clientHeight, 1);
      spin = { az: -(e.clientX - drag.x) * speed, pol: -(e.clientY - drag.y) * speed };
      turn(spin.az, spin.pol);
      drag = { ...drag, x: e.clientX, y: e.clientY, at: performance.now() };
      requestRender();
      return;
    }
    if (e.pointerType !== 'mouse' || down) return;
    if (!pending) {
      requestAnimationFrame(() => {
        if (!pending) return;
        const part = partAt(pending);
        pending = null;
        if (!same(part, hovered)) {
          hovered = part;
          canvas.style.cursor = part ? 'pointer' : 'grab';
          opts.onHover(part);
        }
      });
    }
    pending = e;
  }
  function onLeave(): void {
    pending = null;
    if (hovered) {
      hovered = null;
      opts.onHover(null);
    }
  }
  /** A finger on the engine grabs it: no page scroll for this touch. Beside it, the page scrolls. */
  function onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (e.touches.length === 1 && touch && hitsAt(touch.clientX, touch.clientY).length > 0) e.preventDefault();
  }

  function onDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY };
    // On touch, only a finger on the engine turns it; anywhere else the page scrolls. A tap
    // beside it still reaches onUp (down is set), and picks nothing.
    if (e.pointerType === 'touch' && hitsAt(e.clientX, e.clientY).length === 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() };
    spin = { az: 0, pol: 0 };
    aim = null;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    // Grabbing the model stops any camera move under way (the intro, a view change).
    for (const t of tweens) if (t.kind === 'camera') tweens.delete(t);
  }
  function release(e: PointerEvent): void {
    if (!drag || e.pointerId !== drag.id) return;
    // Let go while still moving: coast. Paused first: stop.
    if (reducedMotion || performance.now() - drag.at > 80) spin = { az: 0, pol: 0 };
    drag = null;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    requestRender();
  }
  function onUp(e: PointerEvent): void {
    release(e);
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const part = partAt(e);
    if (part) opts.onPick(part);
  }
  function onCancel(e: PointerEvent): void {
    // The browser took the gesture (a vertical swipe on touch): no pick, no coasting.
    down = null;
    spin = { az: 0, pol: 0 };
    release(e);
  }
  function onDoubleClick(): void {
    orbitTo(VIEWS.iso.azimuth, VIEWS.iso.polar);
  }

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  // Not passive: it may cancel the scroll when a finger lands on the engine.
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('dblclick', onDoubleClick);
  canvas.style.cursor = 'grab';

  resize();
  applyEmphasis();
  phase('assembly', 'meshes');
  await yieldToPage();
  // Compile every shader before the first frame, so nothing stutters when it first appears.
  try {
    try {
      await renderer.compileAsync(scene, camera);
    } catch {
      renderer.compile(scene, camera);
    }
    check();
    renderer.render(scene, camera);
  } catch (error) {
    teardown();
    throw error;
  }
  emitFrame();
  live = true;
  phase('ready', 'assembly');

  /** Everything goes: listeners, GPU buffers, instance data, materials, and the context itself. */
  function teardown(): void {
    cancelAnimationFrame(raf);
    raf = 0;
    visible = false;
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('dblclick', onDoubleClick);
    for (const solid of solids) if (solid.mesh instanceof InstancedMesh) solid.mesh.dispose();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  let exploded = false;

  return {
    setView: (view) => orbitTo(VIEWS[view].azimuth, VIEWS[view].polar),
    setExploded: (next) => {
      if (next === exploded) return;
      exploded = next;
      const from = explode;
      const to = next ? 1 : 0;
      addTween('layout', EXPLODE_MS, (k) => {
        explode = from + (to - from) * k;
        fit();
        layout();
      });
    },
    setDisplay: (next) => {
      display = next;
      applyEmphasis();
    },
    setEmphasis: (part) => {
      const project = part?.kind === 'project' ? part.index : null;
      if (project !== null && project !== lastRun && !reducedMotion) {
        // Start from where the crank stands, so a new run never jumps.
        run = { project, start: performance.now(), from: crank };
      } else if (project === null && run) {
        run = null;
        fire.fill(0);
      }
      // Pointing at a cylinder mid-run and back does not run it again; letting go of it all does.
      if (project !== null) lastRun = project;
      else if (!part) lastRun = null;
      focus = part;
      hotKeys = keysFor(part);
      applyEmphasis();
    },
    rotateBy: (dAz, dPol) => {
      // Steps add up toward a target, so a held key (repeating every ~30 ms) turns steadily
      // instead of restarting the ease on every repeat.
      const from = new Spherical().setFromVector3(tmp.copy(camera.position).sub(target));
      const base = aim ?? { theta: from.theta, phi: from.phi };
      const goal = { theta: base.theta + dAz, phi: Math.min(Math.PI - 0.0001, Math.max(0.0001, base.phi + dPol)) };
      const dTheta = angleTo(from.theta, goal.theta);
      const dPhi = goal.phi - from.phi;
      addTween(
        'camera',
        KEY_MS,
        (k) => {
          spherical.set(RADIUS, from.phi + dPhi * k, from.theta + dTheta * k);
          camera.position.setFromSpherical(spherical).add(target);
          camera.lookAt(target);
          if (k >= 1) aim = null;
        },
        easeOut,
      );
      aim = goal;
    },
    intro: () => {
      if (reducedMotion) return;
      const start = VIEWS.iso.azimuth;
      tweens.add({
        kind: 'camera',
        start: performance.now() + INTRO_DELAY_MS,
        duration: INTRO_MS,
        step: (k) => {
          const swing = Math.sin(Math.PI * k) * INTRO_TURN;
          spherical.set(RADIUS, VIEWS.iso.polar, start + swing);
          camera.position.setFromSpherical(spherical).add(target);
          camera.lookAt(target);
          if (!run) setCrank(Math.PI * 2 * INTRO_REVS * k);
        },
      });
      requestRender();
    },
    resize,
    setVisible: (next) => {
      visible = next;
      if (next) requestRender();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    },
    posterBox: () => {
      const width = across * 1.04 * px;
      const height = tall * px;
      return { x: frameCx - width / 2, y: frameCy - height / 2, width, height };
    },
    dispose: teardown,
  };
}
