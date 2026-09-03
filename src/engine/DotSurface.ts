/**
 * Dot rasteriser shared by both dither fields.
 *
 * WebGL point sprites when available: ~25k antialiased discs per frame cost well under a
 * millisecond of GPU time, which is what lets the cursor field re-render at 60 fps. The
 * Canvas 2D fallback batches dots by colour and radius into Path2D fills (the prototype's
 * method; ~20-30 ms per frame at 2560x1400 on a laptop). Both draw the same centres, radii and
 * colours; callers skip cells whose centre lies past the canvas edge so the point-sprite
 * clipping rule (whole point culled) and the 2D rule (half disc drawn) never disagree.
 */

export interface DotSurface {
  readonly kind: 'webgl' | '2d';
  /** Set after a WebGL context is restored; the owner should redraw and then clear it. */
  dirty: boolean;
  resize(width: number, height: number): void;
  begin(): void;
  /** Queue one disc. Coordinates and radius in device px, colour channels 0-255. */
  dot(x: number, y: number, r: number, cr: number, cg: number, cb: number): void;
  /** Clear the canvas and draw everything queued since begin(). */
  end(): void;
  clear(): void;
  /** Release GPU objects and listeners. The canvas keeps its context so a remount can reuse it. */
  dispose(): void;
}

export function createDotSurface(canvas: HTMLCanvasElement): DotSurface {
  return WebGLSurface.create(canvas) ?? new Canvas2DSurface(canvas);
}

/* ------------------------------------------------------------------ WebGL */

const FLOATS_PER_DOT = 6; // x, y, r, cr, cg, cb
const STRIDE = FLOATS_PER_DOT * 4;
const MAX_POINT_SIZE_NEEDED = 16;
const CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
};

const VERT = `
attribute vec2 aPos;
attribute float aRadius;
attribute vec3 aColor;
uniform vec2 uRes;
varying vec3 vColor;
varying float vRadius;
void main() {
  vec2 clip = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = aRadius * 2.0 + 2.0;
  vColor = aColor;
  vRadius = aRadius;
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vRadius;
void main() {
  float d = length(gl_PointCoord - 0.5) * (vRadius * 2.0 + 2.0);
  float a = clamp(vRadius + 0.5 - d, 0.0, 1.0);
  gl_FragColor = vec4(vColor * a, a);
}`;

class WebGLSurface implements DotSurface {
  readonly kind = 'webgl' as const;
  dirty = false;

  private readonly gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private uRes: WebGLUniformLocation | null = null;
  private data = new Float32Array(FLOATS_PER_DOT * 8192);
  private count = 0;
  private lost = false;
  private width = 1;
  private height = 1;

  /**
   * Capability probe on a throwaway canvas. Once a canvas has handed out a WebGL context it can
   * never hand out a 2D one, so a failed attempt on the real canvas would leave the Canvas 2D
   * fallback with nothing to draw on. Evaluated once per page.
   */
  private static supported: boolean | undefined;

  private static probe(): boolean {
    if (WebGLSurface.supported !== undefined) return WebGLSurface.supported;
    let ok = false;
    try {
      const scratch = document.createElement('canvas');
      const gl = scratch.getContext('webgl', CONTEXT_ATTRIBUTES);
      if (gl) {
        const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
        if (range && (range[1] ?? 0) >= MAX_POINT_SIZE_NEEDED) {
          ok = new WebGLSurface(scratch, gl).program !== null;
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      ok = false;
    }
    WebGLSurface.supported = ok;
    return ok;
  }

  static create(canvas: HTMLCanvasElement): WebGLSurface | null {
    if (!WebGLSurface.probe()) return null;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', CONTEXT_ATTRIBUTES);
    } catch {
      return null;
    }
    if (!gl) return null;
    const surface = new WebGLSurface(canvas, gl);
    if (!surface.program) {
      console.error('[dither] WebGL program failed on the live canvas after a successful probe');
      return null;
    }
    return surface;
  }

  private readonly canvas: HTMLCanvasElement;
  private readonly onLost = (e: Event): void => {
    e.preventDefault();
    this.lost = true;
  };
  private readonly onRestored = (): void => {
    this.lost = false;
    this.init();
    this.gl.viewport(0, 0, this.width, this.height);
    this.dirty = true;
  };

  private constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.init();
    canvas.addEventListener('webglcontextlost', this.onLost);
    canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  dispose(): void {
    const gl = this.gl;
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    if (!this.lost) {
      if (this.buffer) gl.deleteBuffer(this.buffer);
      if (this.program) gl.deleteProgram(this.program);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    this.buffer = null;
    this.program = null;
    this.count = 0;
  }

  private init(): void {
    const gl = this.gl;
    const compile = (type: number, src: string): WebGLShader | null => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      this.program = null;
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      this.program = null;
      return;
    }
    gl.useProgram(program);
    this.program = program;
    this.uRes = gl.getUniformLocation(program, 'uRes');
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const aPos = gl.getAttribLocation(program, 'aPos');
    const aRadius = gl.getAttribLocation(program, 'aRadius');
    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aRadius);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(aRadius, 1, gl.FLOAT, false, STRIDE, 8);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, STRIDE, 12);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.gl.canvas.width = width;
    this.gl.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  begin(): void {
    this.count = 0;
  }

  dot(x: number, y: number, r: number, cr: number, cg: number, cb: number): void {
    let i = this.count * FLOATS_PER_DOT;
    if (i + FLOATS_PER_DOT > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    const d = this.data;
    d[i++] = x;
    d[i++] = y;
    d[i++] = r;
    d[i++] = cr / 255;
    d[i++] = cg / 255;
    d[i] = cb / 255;
    this.count++;
  }

  end(): void {
    const gl = this.gl;
    if (this.lost || !this.program) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.count === 0) return;
    gl.uniform2f(this.uRes, this.width, this.height);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.count * FLOATS_PER_DOT), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }

  clear(): void {
    if (this.lost || !this.program) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
}

/* -------------------------------------------------------------- Canvas 2D */

interface Bucket {
  fill: string;
  path: Path2D;
}

class Canvas2DSurface implements DotSurface {
  readonly kind = '2d' as const;
  dirty = false;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly buckets = new Map<number, Bucket>();
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  begin(): void {
    this.buckets.clear();
  }

  dot(x: number, y: number, r: number, cr: number, cg: number, cb: number): void {
    // one Path2D per (colour, radius): radii are a handful of discrete tone steps
    const key = ((cr << 16) | (cg << 8) | cb) * 1024 + Math.round(r * 8);
    let bk = this.buckets.get(key);
    if (!bk) {
      bk = { fill: `rgb(${cr},${cg},${cb})`, path: new Path2D() };
      this.buckets.set(key, bk);
    }
    bk.path.moveTo(x + r, y);
    bk.path.arc(x, y, r, 0, 6.28319);
  }

  end(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const bk of this.buckets.values()) {
      ctx.fillStyle = bk.fill;
      ctx.fill(bk.path);
    }
  }

  clear(): void {
    this.ctx?.clearRect(0, 0, this.width, this.height);
  }

  dispose(): void {
    this.buckets.clear();
    this.clear();
  }
}
