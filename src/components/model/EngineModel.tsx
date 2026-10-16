import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { resume, showcaseRoles } from '@/data/resume';
import { cx } from '@/lib/cx';
import { groupNo } from '@/lib/groupNo';
import { readPalette } from './palette';
import poster1x from '@/assets/model/engine-poster-1x.webp';
import poster2x from '@/assets/model/engine-poster-2x.webp';
import posterSize from '@/assets/model/poster.json';
import { layerParts, projectParts, samePart, sectionName, sectionParts, usage, type Part, type SectionId } from './parts';
import type { Display, Frame, SceneHandle, View } from './engineScene';
import styles from './EngineModel.module.css';

interface Props {
  hover: Part | null;
  selected: Part | null;
  /** The skill group in focus down the page; its cylinder lights. */
  activeGroup: string | null;
  onHover: (part: Part | null) => void;
  onSelect: (part: Part | null) => void;
  /** The 3D scene has replaced the poster. */
  onReady: () => void;
}

const VIEWS: View[] = ['iso', 'front', 'top', 'right'];
const DISPLAYS: Display[] = ['shaded', 'xray', 'wireframe'];
const KEY_STEP = Math.PI / 12; // 15deg per arrow press
/** Graphics areas narrower than this have no callout column (the tree names the parts). The
    CSS container query that places the poster uses the same number (--bp-model-callouts). */
const CALLOUT_MIN = 760;
/** On touch devices, how long the page must have been up before the scene builds unasked. */
const TOUCH_START_MS = 3500;

/** The visitor has asked to save data: keep to the poster. */
function savingData(): boolean {
  return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
}

/** WebGL is there (checked only when the scene is about to load; the test context is released). */
function hasWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * The cover's model: an inline-six engine to grab and turn, as in a CAD program. The server
 * renders a static isometric poster of it; once the page is idle, the Three.js scene
 * (engineScene.ts, its own chunk) loads and replaces the poster, bringing numbered balloons on
 * the cylinders, callouts on the hardware, the triad, and the heads-up toolbar (standard views,
 * explode, wireframe, and a configuration per project). ModelStatus, beside it, describes what
 * is pointed at or picked and links down the page. Labels follow their parts every frame by
 * direct DOM writes, never through React state. Without WebGL the poster stays, and the feature
 * tree beside it does the work.
 */
export function EngineModel({ hover, selected, activeGroup, onHover, onSelect, onReady }: Props) {
  const { ui, skills } = resume;
  const model = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<SceneHandle | null>(null);
  const balloonEls = useRef<(HTMLButtonElement | null)[]>([]);
  const calloutEls = useRef<(HTMLButtonElement | null)[]>([]);
  const leaderEls = useRef<(SVGLineElement | null)[]>([]);
  const triadEls = useRef<(SVGLineElement | null)[]>([]);
  const triadText = useRef<(SVGTextElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  // No WebGL, or the visitor saves data: the poster stays, and the toolbar goes.
  const [still, setStill] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [display, setDisplay] = useState<Display>('shaded');
  // Kept in a ref so the scene's callbacks (bound once) always call the latest handlers.
  const callbacks = useRef({ onHover, onSelect, onReady });
  callbacks.current = { onHover, onSelect, onReady };

  // ---- Load the scene once the page is idle ----
  useEffect(() => {
    const host = viewport.current;
    const el = canvas.current;
    if (!host || !el) return;
    if (savingData()) {
      setStill(true);
      return;
    }
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    const calloutRoom = parseFloat(getComputedStyle(host).getPropertyValue('--model-callout-room'));
    const room = (): number => (host.clientWidth >= CALLOUT_MIN ? calloutRoom : 0);
    const cylinderCount = skills.length;

    const placeLabels = (frame: Frame): void => {
      // Balloons above the coil packs, pushed apart sideways so they never overlap.
      const order = frame.cylinders.map((p, i) => ({ i, x: p.x })).sort((a, b) => a.x - b.x);
      for (let k = 1; k < order.length; k++) order[k]!.x = Math.max(order[k]!.x, order[k - 1]!.x + 30);
      order.forEach(({ i, x }) => {
        const anchor = frame.cylinders[i]!;
        const y = Math.max(14, anchor.y - 30);
        const balloon = balloonEls.current[i];
        const line = leaderEls.current[i];
        if (balloon) balloon.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        line?.setAttribute('x1', anchor.x.toFixed(1));
        line?.setAttribute('y1', anchor.y.toFixed(1));
        line?.setAttribute('x2', x.toFixed(1));
        line?.setAttribute('y2', (y + 9).toFixed(1));
      });
      // Callouts in a column right of the engine, in the order of their parts, never touching.
      const ids = sectionParts.map((p) => (p as { id: SectionId }).id);
      const shown = frame.column !== null;
      const rows = ids.map((id, i) => ({ i, y: frame.sections[id].y })).sort((a, b) => a.y - b.y);
      for (let k = 1; k < rows.length; k++) rows[k]!.y = Math.max(rows[k]!.y, rows[k - 1]!.y + 30);
      const overflow = rows[rows.length - 1]!.y - (frame.height - 16);
      if (overflow > 0) for (const r of rows) r.y -= overflow;
      rows.forEach(({ i, y }) => {
        const anchor = frame.sections[ids[i]!];
        const callout = calloutEls.current[i];
        const line = leaderEls.current[cylinderCount + i];
        if (callout) {
          callout.hidden = !shown;
          callout.style.transform = `translate(${frame.column ?? 0}px, ${y}px) translateY(-50%)`;
        }
        if (line) {
          line.style.display = shown ? '' : 'none';
          line.setAttribute('x1', anchor.x.toFixed(1));
          line.setAttribute('y1', anchor.y.toFixed(1));
          line.setAttribute('x2', ((frame.column ?? 0) - 4).toFixed(1));
          line.setAttribute('y2', y.toFixed(1));
        }
      });
      // Triad: unit axes from its centre.
      (['x', 'y', 'z'] as const).forEach((axis, a) => {
        const d = frame.axes[axis];
        triadEls.current[a]?.setAttribute('x2', (d.x * 18).toFixed(1));
        triadEls.current[a]?.setAttribute('y2', (d.y * 18).toFixed(1));
        triadText.current[a]?.setAttribute('x', (d.x * 24).toFixed(1));
        triadText.current[a]?.setAttribute('y', (d.y * 24 + 3).toFixed(1));
      });
    };

    const start = async (): Promise<void> => {
      performance.mark('engine:load');
      const { createEngineScene } = await import('./engineScene');
      performance.measure('engine:load', 'engine:load');
      if (disposed) return;
      // Built in steps that yield to the page; it stops and cleans up if this unmounts meanwhile.
      const scene = await createEngineScene({
        canvas: el,
        usage,
        palette: readPalette(),
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        calloutRoom: room,
        onFrame: placeLabels,
        onHover: (part) => callbacks.current.onHover(part),
        onPick: (part) => callbacks.current.onSelect(part),
        cancelled: () => disposed,
      });
      handle.current = scene;
      setReady(true);
      callbacks.current.onReady();
      scene.intro();
      // The latest entry is the current state.
      io = new IntersectionObserver((entries) => scene.setVisible(!!entries[entries.length - 1]?.isIntersecting));
      io.observe(host);
      ro = new ResizeObserver(() => scene.resize());
      ro.observe(host);
    };

    // When to build the scene. Desktop: once the page is idle. Touch devices: on the first touch
    // or focus on the model, or once the page has been quiet a few seconds, so a phone's main
    // thread stays free while the visitor starts reading. The poster is the scene's own first
    // frame, so nothing looks different meanwhile.
    let started = false;
    const run = (): void => {
      if (started || disposed) return;
      started = true;
      if (!hasWebGL()) {
        setStill(true);
        return;
      }
      // A failed start (unmounted mid-build, or no usable WebGL after all) leaves the poster.
      start().catch(() => {
        if (!disposed) setStill(true);
      });
    };
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const root = model.current;
    const intents = ['pointerdown', 'focusin'] as const;
    if (touch && root) for (const type of intents) root.addEventListener(type, run, { passive: true });
    // Safari has no requestIdleCallback; a short timeout stands in.
    const hasIdle = typeof requestIdleCallback === 'function';
    let idleId = 0;
    const schedule = (): void => {
      if (hasIdle) idleId = requestIdleCallback(run, { timeout: 1500 });
      else run();
    };
    const timer = window.setTimeout(schedule, touch ? TOUCH_START_MS : hasIdle ? 0 : 300);
    return () => {
      disposed = true;
      if (idleId) cancelIdleCallback(idleId);
      window.clearTimeout(timer);
      if (root) for (const type of intents) root.removeEventListener(type, run);
      io?.disconnect();
      ro?.disconnect();
      handle.current?.dispose();
      handle.current = null;
    };
  }, [skills.length]);

  // ---- Emphasis: what the visitor points at or picked, else what the page has in focus ----
  const groupIndex = activeGroup ? skills.findIndex((g) => g.label === activeGroup) : -1;
  const highlight = hover ?? selected ?? (groupIndex >= 0 ? layerParts[groupIndex]! : null);
  const highlightKey = JSON.stringify(highlight);
  useEffect(() => {
    handle.current?.setEmphasis(highlight);
    // highlightKey stands in for highlight, a new object on most renders.
  }, [ready, highlightKey]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const d = step[e.key];
    if (!d || !handle.current) return;
    e.preventDefault();
    handle.current.rotateBy(d[0], d[1]);
  };

  const toggleExplode = (): void => {
    const next = !exploded;
    setExploded(next);
    handle.current?.setExploded(next);
  };
  const chooseDisplay = (next: Display): void => {
    setDisplay(next);
    handle.current?.setDisplay(next);
  };
  const onConfig = (e: ChangeEvent<HTMLSelectElement>): void => {
    const i = e.target.value === '' ? -1 : Number(e.target.value);
    onSelect(i >= 0 ? projectParts[i]! : null);
  };
  const config = selected?.kind === 'project' ? String(selected.index) : '';
  const viewLabel: Record<View, string> = { iso: ui.viewIso, front: ui.viewFront, top: ui.viewTop, right: ui.viewRight };
  const displayLabel: Record<Display, string> = { shaded: ui.shaded, xray: ui.xray, wireframe: ui.wireframe };

  return (
    <div
      ref={model}
      className={styles.model}
      data-ready={ready || undefined}
      data-still={still || undefined}
      data-crosshair="off"
    >
      {/* The heads-up toolbar, as in a CAD program: views, display, configuration. */}
      <div className={styles.toolbar} role="group" aria-label={ui.viewControls}>
        <div className={styles.toolGroup}>
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              className={styles.tool}
              disabled={!ready}
              onClick={() => handle.current?.setView(v)}
            >
              {viewLabel[v]}
            </button>
          ))}
        </div>
        <div className={styles.toolGroup}>
          <button type="button" className={styles.tool} disabled={!ready} aria-pressed={exploded} onClick={toggleExplode}>
            {ui.explode}
          </button>
        </div>
        <div className={styles.toolGroup} role="group" aria-label={ui.display}>
          {DISPLAYS.map((d) => (
            <button
              key={d}
              type="button"
              className={styles.tool}
              disabled={!ready}
              aria-pressed={display === d}
              onClick={() => chooseDisplay(d)}
            >
              {displayLabel[d]}
            </button>
          ))}
        </div>
        <label className={styles.config}>
          <span className={styles.configLabel}>{ui.configuration}</span>
          <select className={styles.configSelect} value={config} disabled={!ready} onChange={onConfig}>
            <option value="">{ui.configDefault}</option>
            {showcaseRoles.map((role, i) => (
              <option key={role.id} value={i}>
                {role.company}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={ready ? 0 : -1}
        role="group"
        aria-roledescription="3D model"
        aria-label={`${ui.modelLabel}. ${ready ? ui.modelKeys : ''}`}
        onKeyDown={onKeyDown}
      >
        {/* The scene's own first frame, rendered ahead (npm run poster): shown until the scene
            takes over, and for good without JavaScript or WebGL. */}
        <img
          className={styles.poster}
          src={poster1x}
          srcSet={`${poster1x} ${posterSize.width}w, ${poster2x} ${posterSize.width * 2}w`}
          sizes="(min-width: 768px) 520px, calc(100vw - 80px)"
          width={posterSize.width}
          height={posterSize.height}
          alt=""
          decoding="async"
          fetchPriority="high"
        />
        <canvas ref={canvas} className={styles.canvas} />

        {ready && (
          <div className={styles.overlay} aria-hidden="true">
            <svg className={styles.leaders}>
              {[...layerParts, ...sectionParts].map((part, i) => (
                <line
                  key={i}
                  ref={(el) => {
                    leaderEls.current[i] = el;
                  }}
                  className={cx(styles.leader, samePart(highlight, part) && styles.hot)}
                />
              ))}
            </svg>
            {skills.map((group, i) => {
              const part = layerParts[i]!;
              // A run lights the cylinders it fires; only the one pointed at spells out its name.
              const lit = highlight?.kind === 'project' && usage[highlight.index]![i];
              return (
                <button
                  key={group.label}
                  type="button"
                  tabIndex={-1}
                  ref={(el) => {
                    balloonEls.current[i] = el;
                  }}
                  className={cx(styles.balloon, samePart(highlight, part) && styles.hot, lit && styles.lit)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(part)}
                  onPointerLeave={() => onHover(null)}
                  onClick={() => onSelect(part)}
                >
                  <span className={styles.balloonNo}>{groupNo(i)}</span>
                  <span className={styles.balloonName}>{group.label}</span>
                </button>
              );
            })}
            {sectionParts.map((part, i) => {
              const { part: name, section } = sectionName((part as { id: SectionId }).id);
              return (
                <button
                  key={name}
                  type="button"
                  tabIndex={-1}
                  hidden
                  ref={(el) => {
                    calloutEls.current[i] = el;
                  }}
                  className={cx(styles.callout, samePart(highlight, part) && styles.hot)}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(part)}
                  onPointerLeave={() => onHover(null)}
                  onClick={() => onSelect(part)}
                >
                  <span className={styles.calloutName}>{name}</span>
                  <span className={styles.calloutSection}>{section}</span>
                </button>
              );
            })}
            <svg className={styles.triad} viewBox="-30 -30 60 60">
              {(['x', 'y', 'z'] as const).map((axis, a) => (
                <g key={axis} className={styles[`axis${axis.toUpperCase()}`]}>
                  <line
                    x1="0"
                    y1="0"
                    ref={(el) => {
                      triadEls.current[a] = el;
                    }}
                  />
                  <text
                    ref={(el) => {
                      triadText.current[a] = el;
                    }}
                    textAnchor="middle"
                  >
                    {axis.toUpperCase()}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
