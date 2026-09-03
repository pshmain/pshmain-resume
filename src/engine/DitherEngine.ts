/**
 * Ordered-dither dot engine, ported from design/prototype/Resume.dc.html (`class Component`).
 *
 * Two dot fields share one animation loop:
 *  - hero: 110 frames of the ruins-and-ash video (11 fps, 208x117 each, cropped 7.5% per edge
 *    and watermark-patched) played from memory forever with a seamless crossfade;
 *  - ash: procedural falling ash splatted into a cell grid behind the whole page, densest at the
 *    hero's bottom edge so the two fields cross-dissolve.
 * Both go through the same 8x8 Bayer matrix and are drawn as antialiased discs. Both react to
 * the cursor with a circular displacement bulge.
 *
 * While the riddle gate is locked (src/components/Gate.tsx) the hero field is not drawn, the
 * cursor field is off, and the ash runs at its denser locked setting; setGate(false) eases the
 * ash back over the reveal duration and lets the hero and cursor fields through again.
 *
 * The frames arrive as a single sprite-sheet image extracted from the video at build time (see
 * src/assets/heroFrames.ts and design/DEVIATIONS.md), so there is no media element, autoplay,
 * seeking, or tab-visibility state to get wrong: the loop starts as soon as the image decodes.
 *
 * Framework-free: construct it with the DOM targets and call start(); call destroy() on
 * unmount. Colours are read from the token sheet (src/styles/tokens.css) at boot. Dots are
 * drawn through DotSurface (WebGL point sprites, Canvas 2D fallback).
 */

import { createDotSurface, type DotSurface } from './DotSurface';

export type InkMode = 'sampled' | 'blended' | 'gold' | 'paper';

export interface DitherOptions {
  /** Dither cell size in CSS px (handoff: 5-16, default 8). */
  pixelSize: number;
  /** Dot radius multiplier (0.6-1, default 0.85). */
  dotScale: number;
  /** Tone steps for the hero field (2-6, default 5). */
  levels: number;
  /** Contrast boost in percent (0-60, default 22). */
  contrast: number;
  invert: boolean;
  inkMode: InkMode;
  /** Ambient ash density (0-2, default 1). 0 hides the layer. */
  ashDensity: number;
  /** Ash density while the riddle gate is locked and the ash is all there is to see. */
  ashDensityLocked: number;
  /** Freeze both fields to one dithered frame and disable the cursor field. */
  reducedMotion: boolean;
  /** Start locked: no hero field, no cursor field, ash at the locked density. */
  gateLocked: boolean;
}

/** A grid of equally sized frames in one image, read left to right, top to bottom. */
export interface FrameSheet {
  /** Candidate URLs in preference order (e.g. AVIF, then WebP). The first that decodes wins. */
  sources: string[];
  frameWidth: number;
  frameHeight: number;
  columns: number;
  count: number;
}

export interface DitherTargets {
  hero: HTMLElement;
  heroCanvas: HTMLCanvasElement;
  ashCanvas: HTMLCanvasElement;
}

export const DEFAULT_DITHER_OPTIONS: DitherOptions = {
  pixelSize: 8,
  dotScale: 0.85,
  levels: 5,
  contrast: 22,
  invert: false,
  inkMode: 'sampled',
  ashDensity: 1,
  ashDensityLocked: 1.8,
  reducedMotion: false,
  gateLocked: false,
};

/* ---- constants from the handoff ---- */
const FPS = 11;
const MAX_BLEND_FRAMES = 8;
const MAX_DPR = 2;
const PARTICLE_AREA = 5000;
const ASH_LEVELS = 3;
const POINTER_EPS = 0.004;
const OFFSCREEN = -9e3;
const TAU = 6.28319;
/** Where along the sequence the auto-levels pre-pass samples (handoff: "5 spread frames"). */
const LEVEL_SAMPLE_POSITIONS = [0.02, 0.25, 0.5, 0.75, 0.97];

type RGB = [number, number, number];
type Mode = 'boot' | 'loop' | 'still';

interface Pointer {
  x: number;
  y: number;
  tx: number;
  ty: number;
  s: number;
  on: boolean;
}

interface Particle {
  x: number;
  y: number;
  spd: number;
  amp: number;
  frq: number;
  ph: number;
  r: number;
  tone: number;
}

function newPointer(): Pointer {
  return { x: OFFSCREEN, y: OFFSCREEN, tx: OFFSCREEN, ty: OFFSCREEN, s: 0, on: false };
}

/** Ease position at dt*9 and strength at dt*5 (handoff "Cursor field"). */
function easePointer(p: Pointer, dt: number): void {
  p.s += ((p.on ? 1 : 0) - p.s) * Math.min(1, dt * 5);
  if (p.on || p.s > POINTER_EPS) {
    p.x += (p.tx - p.x) * Math.min(1, dt * 9);
    p.y += (p.ty - p.y) * Math.min(1, dt * 9);
  }
}

/** True while the eased pointer is still moving toward its target or fading in/out. */
function pointerBusy(p: Pointer): boolean {
  if (p.s <= POINTER_EPS) return false;
  const settled =
    Math.abs(p.x - p.tx) < 0.25 &&
    Math.abs(p.y - p.ty) < 0.25 &&
    Math.abs(p.s - (p.on ? 1 : 0)) < POINTER_EPS;
  return !settled;
}

function smoothstep(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** 8x8 Bayer thresholds in (0,1), built by recursing the 2x2 base. */
function buildBayer(): Float64Array {
  let m: number[][] = [
    [0, 2],
    [3, 1],
  ];
  for (let s = 2; s < 8; s *= 2) {
    const n = s * 2;
    const out: number[][] = [];
    for (let y = 0; y < n; y++) {
      const row: number[] = [];
      for (let x = 0; x < n; x++) {
        const base = m[y % s]![x % s]!;
        const quad = y < s ? (x < s ? 0 : 2) : x < s ? 3 : 1;
        row.push(4 * base + quad);
      }
      out.push(row);
    }
    m = out;
  }
  const t = new Float64Array(64);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) t[y * 8 + x] = (m[y]![x]! + 0.5) / 64;
  return t;
}

/** A CSS <time> ("2.4s", "800ms") in milliseconds; 0 for anything unparseable. */
function parseDuration(str: string): number {
  const v = parseFloat(str);
  if (Number.isNaN(v)) return 0;
  return str.trim().endsWith('ms') ? v : v * 1000;
}

let colorProbe: CanvasRenderingContext2D | null | undefined;

/** Normalise any CSS colour string to RGB via the canvas parser. */
function parseColor(str: string): RGB {
  if (colorProbe === undefined) colorProbe = document.createElement('canvas').getContext('2d');
  const ctx = colorProbe;
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = 'black';
  ctx.fillStyle = str;
  const v = ctx.fillStyle;
  if (typeof v !== 'string') return [0, 0, 0];
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = v.match(/[\d.]+/g) ?? [];
  return [Number(m[0] ?? 0), Number(m[1] ?? 0), Number(m[2] ?? 0)];
}

/** Load the first image in `sources` that this browser can decode. */
async function loadFirstDecodable(sources: string[]): Promise<HTMLImageElement | null> {
  for (const src of sources) {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    try {
      await img.decode();
      return img;
    } catch {
      // unsupported format or network failure: try the next candidate
    }
  }
  return null;
}

export class DitherEngine {
  private readonly hero: HTMLElement;
  private readonly heroCanvas: HTMLCanvasElement;
  private readonly ashCanvas: HTMLCanvasElement;
  private readonly sheet: FrameSheet;
  private readonly opts: DitherOptions;
  private readonly bayer = buildBayer();
  private readonly cleanups: Array<() => void> = [];

  private dead = false;
  private raf = 0;
  private prev = 0;
  private dpr = 1;

  private paper: RGB = [0, 0, 0];
  private gold: RGB = [0, 0, 0];
  private sepia: [RGB, RGB, RGB] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  /* hero canvas */
  private heroSurface: DotSurface | null = null;
  private W = 0;
  private H = 0;
  private heroVisible = true;
  private shown = false;
  private lastSig = '';
  private readonly ptr = newPointer();

  /* frame store */
  private mw = 1;
  private mh = 1;
  private lo = 0;
  private hi = 255;
  private frames: ImageData[] = [];
  private still: ImageData | null = null;
  private mode: Mode = 'boot';
  private idx = 0;
  private acc = 0;
  private blend = 0;

  /* ambient ash */
  private ashSurface: DotSurface | null = null;
  private aW = 0;
  private aH = 0;
  private particles: Particle[] = [];
  private grid: Float32Array | null = null;
  private ashAcc = 0;
  private ashT = 0;
  private ashSig = '';
  private ashCleared = false;
  private readonly vptr = newPointer();

  /* riddle gate */
  private gateLocked: boolean;
  private revealMs = 0;
  /** Current ash density, eased between the locked and open settings. */
  private dens: number;
  private densFrom: number;
  private densTo: number;
  private densT = 0;
  private densDur = 0;

  constructor(targets: DitherTargets, sheet: FrameSheet, opts: DitherOptions) {
    this.hero = targets.hero;
    this.heroCanvas = targets.heroCanvas;
    this.ashCanvas = targets.ashCanvas;
    this.sheet = sheet;
    this.opts = opts;
    this.gateLocked = opts.gateLocked;
    this.dens = opts.gateLocked ? opts.ashDensityLocked : opts.ashDensity;
    this.densFrom = this.dens;
    this.densTo = this.dens;
  }

  start(): void {
    this.boot().catch((err: unknown) => {
      if (!this.dead) console.error('[dither] boot failed', err);
    });
  }

  destroy(): void {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    for (const off of this.cleanups.splice(0)) off();
    this.heroSurface?.dispose();
    this.ashSurface?.dispose();
    this.heroSurface = null;
    this.ashSurface = null;
    this.frames = [];
    this.still = null;
    delete this.heroCanvas.dataset.shown;
  }

  /**
   * Lock or open the riddle gate. Locked: the hero field stops drawing (its frame index keeps
   * advancing), pointer input is ignored, and the ash jumps to its locked density. Open: the
   * ash eases back to normal over the `--duration-reveal` token and both fields resume.
   */
  setGate(locked: boolean): void {
    if (locked === this.gateLocked) return;
    this.gateLocked = locked;
    if (locked) {
      this.ptr.on = false;
      this.vptr.on = false;
      this.easeAsh(this.opts.ashDensityLocked, 0);
    } else {
      this.easeAsh(this.opts.ashDensity, this.revealMs);
    }
  }

  private easeAsh(target: number, ms: number): void {
    this.densFrom = this.dens;
    this.densTo = target;
    this.densT = 0;
    this.densDur = this.opts.reducedMotion ? 0 : ms / 1000;
    if (this.densDur <= 0) this.dens = target;
  }

  /* ------------------------------------------------------------------ boot */

  private async boot(): Promise<void> {
    this.readTokens();
    this.setupHero();
    this.setupAsh();
    this.setupPointer();
    this.prev = performance.now();
    this.raf = requestAnimationFrame(this.loop);

    const img = await loadFirstDecodable(this.sheet.sources);
    if (this.dead) return;
    if (!img) {
      console.warn('[dither] hero frame sheet failed to load; hero stays on the ground colour');
      return;
    }
    if (this.opts.reducedMotion) {
      // Only the five level-sampling frames are needed; the middle one becomes the still.
      const last = this.sheet.count - 1;
      const picks = LEVEL_SAMPLE_POSITIONS.map((f) => Math.round(f * last));
      const frames = this.extractFrames(img, picks);
      if (this.dead || frames.length === 0) return;
      this.pinLevels(frames);
      this.still = frames[Math.floor(frames.length / 2)] ?? null;
      this.mode = 'still';
      return;
    }

    const frames = this.extractFrames(img);
    if (this.dead || frames.length === 0) return;
    this.pinLevels(frames);
    this.frames = frames;
    const n = frames.length;
    this.blend = n > 10 ? Math.min(MAX_BLEND_FRAMES, Math.floor(n / 3)) : 0;
    this.idx = this.blend % n;
    this.acc = 0;
    this.mode = 'loop';
  }

  /**
   * Copy tiles of the sheet into their own ImageData, patching the watermark as it goes.
   * `indices` selects which tiles (in that order); by default every tile in sequence.
   */
  private extractFrames(img: HTMLImageElement, indices?: number[]): ImageData[] {
    const { frameWidth: fw, frameHeight: fh, columns, count } = this.sheet;
    this.mw = fw;
    this.mh = fh;
    const master = document.createElement('canvas');
    master.width = fw;
    master.height = fh;
    const ctx = master.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    // Watermark patch: the source's bottom-right region (x >= 75%, y >= 85%) is overwritten by
    // the strip directly above it.
    const px = Math.round(fw * 0.75);
    const py = Math.round(fh * 0.85);
    const pw = fw - px;
    const ph = fh - py;
    const frames: ImageData[] = [];
    const order = indices ?? Array.from({ length: count }, (_, k) => k);
    for (const k of order) {
      if (k < 0 || k >= count) continue;
      const sx = (k % columns) * fw;
      const sy = Math.floor(k / columns) * fh;
      if (sy + fh > img.naturalHeight || sx + fw > img.naturalWidth) break;
      ctx.drawImage(img, sx, sy, fw, fh, 0, 0, fw, fh);
      if (pw > 0 && ph > 0) ctx.drawImage(master, px, py - ph, pw, ph, px, py, pw, ph);
      frames.push(ctx.getImageData(0, 0, fw, fh));
    }
    return frames;
  }

  /** Auto-levels: 2nd/98th luma percentiles across 5 spread frames, pinned once for the loop. */
  private pinLevels(frames: ImageData[]): void {
    const hist = new Uint32Array(256);
    let count = 0;
    const last = frames.length - 1;
    for (const f of LEVEL_SAMPLE_POSITIONS) {
      const data = frames[Math.round(f * last)]?.data;
      if (!data) continue;
      for (let i = 0; i < data.length; i += 4) {
        const luma = Math.min(255, (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) | 0);
        hist[luma] = hist[luma]! + 1;
        count++;
      }
    }
    const pct = (p: number): number => {
      const target = count * p;
      let acc = 0;
      for (let i = 0; i < 256; i++) {
        acc += hist[i]!;
        if (acc >= target) return i;
      }
      return 255;
    };
    this.lo = pct(0.02);
    this.hi = pct(0.98);
    if (this.hi - this.lo < 10) {
      this.lo = Math.max(0, this.lo - 5);
      this.hi = Math.min(255, this.hi + 5);
    }
  }

  /* ----------------------------------------------------------------- setup */

  private readTokens(): void {
    const cs = getComputedStyle(document.documentElement);
    const get = (name: string): string => cs.getPropertyValue(name).trim();
    this.revealMs = parseDuration(get('--duration-reveal'));
    this.paper = parseColor(get('--color-paper'));
    this.gold = parseColor(get('--color-accent'));
    this.sepia = [
      parseColor(get('--color-accent-800')),
      parseColor(get('--color-accent-700')),
      parseColor(get('--color-accent-500')),
    ];
  }

  private setupHero(): void {
    this.heroSurface = createDotSurface(this.heroCanvas);
    this.measureHero();
    const ro = new ResizeObserver(() => this.measureHero());
    ro.observe(this.hero);
    this.cleanups.push(() => ro.disconnect());
    // Skip drawing while the hero is scrolled out of view; state keeps advancing.
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) this.heroVisible = e.isIntersecting;
        },
        { rootMargin: '10% 0px' },
      );
      io.observe(this.hero);
      this.cleanups.push(() => io.disconnect());
    }
  }

  private measureHero(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const r = this.hero.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width * this.dpr));
    const H = Math.max(2, Math.round(r.height * this.dpr));
    if (W !== this.W || H !== this.H) {
      this.W = W;
      this.H = H;
      this.heroSurface?.resize(W, H);
    }
  }

  private setupAsh(): void {
    this.ashSurface = createDotSurface(this.ashCanvas);
    this.measureAsh();
    const onResize = (): void => this.measureAsh();
    window.addEventListener('resize', onResize);
    this.cleanups.push(() => window.removeEventListener('resize', onResize));
  }

  private measureAsh(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // The canvas's own box: the viewport minus any classic scrollbar, which is also the space
    // pointer clientX/Y live in. window.innerWidth would include the scrollbar and squash the grid.
    const r = this.ashCanvas.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width * this.dpr));
    const H = Math.max(2, Math.round(r.height * this.dpr));
    const widthChanged = W !== this.aW;
    if (W !== this.aW || H !== this.aH) {
      this.aW = W;
      this.aH = H;
      this.ashSurface?.resize(W, H);
    }
    // Height-only changes (mobile browser chrome collapsing) keep the field; particles that end
    // up below the new bottom edge simply respawn.
    if (widthChanged || this.particles.length === 0) this.seedAsh();
  }

  private setupPointer(): void {
    if (this.opts.reducedMotion) return;
    const move = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') return; // no cursor on touch; avoids a stuck bulge
      if (this.gateLocked) return; // no cursor field behind the riddle
      const dpr = this.dpr;
      const vp = this.vptr;
      vp.tx = e.clientX * dpr;
      vp.ty = e.clientY * dpr;
      if (!vp.on && vp.s < 0.01) {
        vp.x = vp.tx;
        vp.y = vp.ty;
      }
      vp.on = true;
      // The hero field is driven from anywhere on the page: its radius overhangs the hero.
      const r = this.hero.getBoundingClientRect();
      const hp = this.ptr;
      hp.tx = (e.clientX - r.left) * dpr;
      hp.ty = (e.clientY - r.top) * dpr;
      if (!hp.on && hp.s < 0.01) {
        hp.x = hp.tx;
        hp.y = hp.ty;
      }
      hp.on = true;
    };
    const off = (): void => {
      this.vptr.on = false;
      this.ptr.on = false;
    };
    const out = (e: PointerEvent): void => {
      if (!e.relatedTarget) off();
    };
    const visibility = (): void => {
      if (document.hidden) off();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', out);
    window.addEventListener('blur', off);
    document.addEventListener('visibilitychange', visibility);
    this.cleanups.push(() => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', out);
      window.removeEventListener('blur', off);
      document.removeEventListener('visibilitychange', visibility);
    });
  }

  /* ------------------------------------------------------------------ loop */

  private readonly loop = (now: number): void => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, Math.max(0, (now - this.prev) / 1000));
    this.prev = now;
    if (this.W <= 2) this.measureHero(); // re-measure if mounted at zero size
    if (this.aW <= 2) this.measureAsh();
    easePointer(this.ptr, dt);
    this.ashTick(dt);

    let alpha = 0;
    let next: ImageData | null = null;
    let base: ImageData | null = null;
    let frameKey = -1;
    if (this.mode === 'loop') {
      const n = this.frames.length;
      const step = 1 / FPS;
      this.acc += dt;
      while (this.acc >= step) {
        this.acc -= step;
        this.idx++;
        if (this.idx >= n) this.idx = this.blend < n ? this.blend : 0;
      }
      base = this.frames[this.idx] ?? null;
      // Crossfade the last `blend` frames into the first `blend` so the wrap has no seam.
      if (this.blend > 0 && this.idx >= n - this.blend) {
        alpha = (this.idx - (n - this.blend) + 1) / (this.blend + 1);
        next = this.frames[this.idx - (n - this.blend)] ?? null;
      }
      frameKey = this.idx;
    } else if (this.mode === 'still' && this.still) {
      base = this.still;
      frameKey = 0;
    }
    if (!base) return;

    // Re-render only when the frame, blend, size, or the eased cursor changes.
    const sig = `${frameKey}|${alpha.toFixed(3)}|${this.W}x${this.H}`;
    if (sig === this.lastSig && !pointerBusy(this.ptr) && !this.heroSurface?.dirty) return;
    if (!this.heroVisible || this.gateLocked) return;
    this.lastSig = sig;
    this.renderHero(base, next, alpha);
  };

  /* ------------------------------------------------------------ hero field */

  private renderHero(imgA: ImageData, imgB: ImageData | null, alpha: number): void {
    const s = this.heroSurface;
    if (!s) return;
    const o = this.opts;
    const W = this.W;
    const H = this.H;
    const p = clamp(o.pixelSize, 3, 30) * this.dpr;
    const L = clamp(Math.round(o.levels), 2, 8);
    const Lm1 = L - 1;
    const ds = clamp(o.dotScale, 0.3, 1.2);
    const k = (100 + clamp(o.contrast, 0, 100)) / 100;
    const lo = this.lo;
    const rng = Math.max(1, this.hi - this.lo);
    const cols = Math.ceil(W / p);
    const rows = Math.ceil(H / p);
    const mw = this.mw;
    const mh = this.mh;
    // cover-fit mapping canvas -> master buffer
    const aC = W / H;
    const aM = mw / mh;
    let sw: number;
    let sh: number;
    let ox: number;
    let oy: number;
    if (aC > aM) {
      sw = mw;
      sh = mw / aC;
      ox = 0;
      oy = (mh - sh) / 2;
    } else {
      sh = mh;
      sw = mh * aC;
      oy = 0;
      ox = (mw - sw) / 2;
    }
    const dA = imgA.data;
    const dB = imgB ? imgB.data : null;
    const ptr = this.ptr;
    const warp = ptr.s > POINTER_EPS;
    const R = 0.6 * Math.max(W, H);
    const amp = 0.055 * R * ptr.s;
    const rMax = p * 0.34;
    const paper = this.paper;
    const gold = this.gold;
    const bayer = this.bayer;
    const mode = o.inkMode;

    s.begin();
    for (let gy = 0; gy < rows; gy++) {
      const cy = (gy + 0.5) * p;
      if (cy >= H) break; // a centre past the edge is culled by point sprites; keep both backends identical
      const rowB = (gy & 7) * 8;
      for (let gx = 0; gx < cols; gx++) {
        const cx = (gx + 0.5) * p;
        if (cx >= W) break;
        let sx = cx;
        let sy = cy;
        if (warp) {
          // circular field: displace sampling coords radially away from the cursor
          const dx = cx - ptr.x;
          const dy = cy - ptr.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R && dist > 1) {
            const t = 1 - dist / R;
            const e = (t * t * (3 - 2 * t) * amp) / dist;
            sx -= dx * e;
            sy -= dy * e;
          }
        }
        let u = sx / W;
        if (u < 0) u = 0;
        else if (u > 1) u = 1;
        let vv = sy / H;
        let fade = 1;
        if (vv > 0.9) {
          // feather the field's last 10% so the frame has no hard edge
          fade = smoothstep((1 - vv) / 0.1);
          if (fade <= 0) continue;
        }
        if (vv < 0) vv = 0;
        else if (vv > 1) vv = 1;
        const mx = Math.min(mw - 1, (ox + u * sw) | 0);
        const my = Math.min(mh - 1, (oy + vv * sh) | 0);
        const i = (my * mw + mx) * 4;
        let r = dA[i]!;
        let g = dA[i + 1]!;
        let b = dA[i + 2]!;
        if (dB) {
          r += (dB[i]! - r) * alpha;
          g += (dB[i + 1]! - g) * alpha;
          b += (dB[i + 2]! - b) * alpha;
        }
        let val = (0.2126 * r + 0.7152 * g + 0.0722 * b - lo) / rng;
        if (val < 0) val = 0;
        else if (val > 1) val = 1;
        if (o.invert) val = 1 - val;
        val = (val - 0.5) * k + 0.5;
        if (val <= 0.02) continue; // floor: kill residual background haze
        if (val > 1) val = 1;
        if (fade < 1) {
          val *= fade;
          if (val <= 0.02) continue;
        }
        const xL = val * Lm1;
        const bse = xL | 0;
        const fr = xL - bse;
        let q = bse + (fr > bayer[rowB + (gx & 7)]! ? 1 : 0);
        if (q < 1) continue;
        if (q > Lm1) q = Lm1;

        let cr: number;
        let cg: number;
        let cb: number;
        if (mode === 'paper') {
          [cr, cg, cb] = paper;
        } else if (mode === 'gold') {
          [cr, cg, cb] = gold;
        } else {
          let fr2: number;
          let fg2: number;
          let fb2: number;
          if (mode === 'blended') {
            const m = 0.25;
            fr2 = (r * m + gold[0] * (1 - m)) | 0;
            fg2 = (g * m + gold[1] * (1 - m)) | 0;
            fb2 = (b * m + gold[2] * (1 - m)) | 0;
          } else {
            fr2 = r | 0;
            fg2 = g | 0;
            fb2 = b | 0;
          }
          // quantise to 16 levels per channel: the posterised palette is part of the look
          cr = (fr2 & 240) + 8;
          cg = (fg2 & 240) + 8;
          cb = (fb2 & 240) + 8;
        }
        s.dot(cx, cy, rMax * ds * (q / Lm1), cr, cg, cb);
      }
    }
    s.end();
    s.dirty = false;
    if (!this.shown) {
      this.shown = true;
      this.heroCanvas.dataset.shown = ''; // Hero.module.css fades the canvas in on this attribute
    }
  }

  /* ------------------------------------------------------------- ash field */

  private seedAsh(): void {
    const area = (this.aW * this.aH) / (this.dpr * this.dpr);
    const n = Math.round(area / PARTICLE_AREA);
    this.particles = [];
    for (let i = 0; i < n; i++) this.particles.push(this.spawn(true));
  }

  private spawn(anywhere: boolean): Particle {
    return {
      x: Math.random() * (this.aW / this.dpr),
      y: anywhere ? Math.random() * (this.aH / this.dpr) : -10,
      spd: 14 + Math.random() * 26,
      amp: 6 + Math.random() * 18,
      frq: 0.15 + Math.random() * 0.4,
      ph: Math.random() * TAU,
      r: 0.8 + Math.random() * 1.2,
      tone: 0.55 + Math.random() * 0.45,
    };
  }

  private ashTick(dt: number): void {
    const s = this.ashSurface;
    if (!s) return;
    if (this.densDur > 0) {
      this.densT += dt;
      const k = Math.min(1, this.densT / this.densDur);
      this.dens = this.densFrom + (this.densTo - this.densFrom) * smoothstep(k);
      if (k >= 1) this.densDur = 0;
    }
    const dens = clamp(this.dens, 0, 2);
    if (dens <= 0) {
      if (!this.ashCleared) {
        s.clear();
        this.ashCleared = true;
      }
      return;
    }
    this.ashCleared = false;
    const vp = this.vptr;
    easePointer(vp, dt);
    let stepped = false;
    if (!this.opts.reducedMotion) {
      const step = 1 / FPS;
      this.ashAcc += dt;
      while (this.ashAcc >= step) {
        this.ashAcc -= step;
        this.ashT += step;
        stepped = true;
        const H = this.aH / this.dpr;
        for (const a of this.particles) {
          a.y += a.spd * step;
          if (a.y > H + 12) Object.assign(a, this.spawn(false));
        }
      }
    }
    const sig = `${this.aW}x${this.aH}|${Math.round((window.scrollY || 0) / 24)}|${dens.toFixed(3)}`;
    if (!stepped && !pointerBusy(vp) && sig === this.ashSig && !s.dirty) return;
    this.ashSig = sig;
    this.drawAsh(dens);
  }

  private drawAsh(dens: number): void {
    const s = this.ashSurface;
    if (!s) return;
    const o = this.opts;
    const W = this.aW;
    const H = this.aH;
    const p = clamp(o.pixelSize, 3, 30) * this.dpr;
    const ds = clamp(o.dotScale, 0.3, 1.2);
    const cols = Math.ceil(W / p);
    const rows = Math.ceil(H / p);
    const n = cols * rows;
    if (!this.grid || this.grid.length !== n) this.grid = new Float32Array(n);
    const g = this.grid;
    g.fill(0);
    const vp = this.vptr;
    const warp = vp.s > POINTER_EPS;
    const R = 0.6 * Math.max(W, H);
    const amp = 0.055 * R * vp.s;
    const t = this.ashT;
    const scY = (window.scrollY || 0) * this.dpr;
    const hB = this.H; // hero bottom edge in page device px

    for (const a of this.particles) {
      let px = (a.x + Math.sin(t * a.frq * TAU + a.ph) * a.amp) * this.dpr;
      let py = a.y * this.dpr;
      // hand-off boost: densest exactly at the hero boundary, decaying 50% below it
      let bw = 1;
      if (hB > 2) {
        const rel = (py + scY - hB) / (hB * 0.5);
        if (rel > -0.25 && rel < 1) {
          const up = rel < 0 ? 1 + rel / 0.25 : 1 - rel;
          bw = 1 + 2 * smoothstep(up);
        }
      }
      if (warp) {
        // particles are pushed away in screen space
        const dx = px - vp.x;
        const dy = py - vp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R && dist > 1) {
          const tt = 1 - dist / R;
          const e = (tt * tt * (3 - 2 * tt) * amp) / dist;
          px += dx * e;
          py += dy * e;
        }
      }
      // splat a Gaussian (sigma^2 = 0.45 r^2) into the cell grid
      const cx = px / p - 0.5;
      const cy = py / p - 0.5;
      const x0 = Math.round(cx);
      const y0 = Math.round(cy);
      const rr = a.r;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const gx = x0 + ox;
          const gy = y0 + oy;
          if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
          const ddx = gx - cx;
          const ddy = gy - cy;
          const w = a.tone * dens * bw * Math.exp(-(ddx * ddx + ddy * ddy) / (0.45 * rr * rr));
          if (w > 0.02) {
            const ix = gy * cols + gx;
            const nv = g[ix]! + w;
            g[ix] = nv > 1 ? 1 : nv;
          }
        }
      }
    }

    const Lm1 = ASH_LEVELS;
    const rMax = p * 0.34;
    const sepia = this.sepia;
    const bayer = this.bayer;
    s.begin();
    for (let gy = 0; gy < rows; gy++) {
      const cy = (gy + 0.5) * p;
      if (cy >= H) break;
      const rowB = (gy & 7) * 8;
      const off = gy * cols;
      for (let gx = 0; gx < cols; gx++) {
        const cx = (gx + 0.5) * p;
        if (cx >= W) break;
        const v = g[off + gx]!;
        if (v <= 0.02) continue;
        const xL = v * Lm1;
        const bse = xL | 0;
        const fr = xL - bse;
        let q = bse + (fr > bayer[rowB + (gx & 7)]! ? 1 : 0);
        if (q < 1) continue;
        if (q > Lm1) q = Lm1;
        const rad = rMax * ds * (q / Lm1);
        const c = sepia[(q - 1) as 0 | 1 | 2];
        s.dot(cx, cy, rad, c[0], c[1], c[2]);
      }
    }
    s.end();
    s.dirty = false;
  }
}
