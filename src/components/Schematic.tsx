import { useEffect, useRef } from 'react';
import { resume, type Diagram, type DiagramLane } from '@/data/resume';
import { cx } from '@/lib/cx';
import { drawStep } from '@/lib/motion';
import styles from './Schematic.module.css';

/* ---- Layout: the same lanes drawn two ways. "wide" puts each lane's nodes in a row; "tall"
   stacks them for phones. A container query (Schematic.module.css) shows the one that fits. ---- */

type Mode = 'wide' | 'tall';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string[];
  note: string[];
}

interface LaneLayout {
  lane: DiagramLane;
  rev: string | null;
  status: string;
  headerY: number;
  boxes: Box[];
  connectors: string[];
  /** The route a packet takes through the lane, behind the boxes. */
  packet: string | null;
  packetSeconds: number;
  loop: string | null;
}

interface Layout {
  width: number;
  height: number;
  lanes: LaneLayout[];
}

const G = {
  wide: { width: 860, x0: 170, x1: 850, gap: 30, label: 15, note: 12, lineL: 18, lineN: 15, charW: 7.4, pad: 18, minH: 64, loop: 34, laneGap: 30 },
  tall: { width: 360, x0: 16, x1: 316, gap: 26, label: 15, note: 12, lineL: 18, lineN: 15, charW: 7.4, pad: 16, minH: 52, loop: 0, laneGap: 30 },
} as const;

/** Greedy word wrap to a character budget. */
function wrap(text: string | undefined, chars: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > chars) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function layout(diagram: Diagram, mode: Mode): Layout {
  const g = G[mode];
  const hasRevisions = diagram.lanes.some((l) => l.tone === 'muted');
  const { ui } = resume;
  let cursor = 0;
  const lanes = diagram.lanes.map((lane): LaneLayout => {
    const rev = lane.tone === 'muted' ? 'A' : lane.tone === 'accent' && hasRevisions ? 'B' : null;
    const status = lane.tone === 'muted' ? ui.superseded : lane.tone === 'accent' ? ui.built : ui.supporting;
    const n = lane.nodes.length;
    const isLoop = lane.layout === 'loop';
    const flows = lane.layout !== 'set';
    let boxes: Box[];
    let connectors: string[] = [];
    let packet: string | null = null;
    let loop: string | null = null;
    let headerY: number;

    if (mode === 'wide') {
      headerY = cursor;
      const w = (g.x1 - g.x0 - g.gap * (n - 1)) / n;
      const chars = Math.max(8, Math.floor((w - g.pad) / g.charW));
      const texts = lane.nodes.map((node) => ({ label: wrap(node.label, chars), note: wrap(node.note, chars + 2) }));
      const h = Math.max(g.minH, ...texts.map((t) => t.label.length * g.lineL + t.note.length * g.lineN + g.pad * 1.4));
      boxes = texts.map((t, i) => ({ x: g.x0 + i * (w + g.gap), y: cursor, w, h, ...t }));
      const cy = cursor + h / 2;
      if (flows) {
        connectors = boxes.slice(0, -1).map((b) => `M${b.x + b.w} ${cy} H${b.x + b.w + g.gap - 2}`);
        const first = boxes[0]!;
        const last = boxes[n - 1]!;
        const a = first.x + first.w / 2;
        const z = last.x + last.w / 2;
        if (isLoop) {
          const below = cursor + h + g.loop / 1.6;
          loop = `M${z} ${cursor + h} V${below} H${a} V${cursor + h + 2}`;
          packet = `M${a} ${cy} H${z} V${below} H${a} V${cy}`;
        } else packet = `M${a} ${cy} H${z}`;
      }
      cursor += h + (isLoop ? g.loop : 0) + g.laneGap;
    } else {
      headerY = cursor;
      cursor += 26;
      const w = g.x1 - g.x0 - (isLoop ? 22 : 0);
      const chars = Math.floor((w - g.pad) / g.charW);
      boxes = lane.nodes.map((node) => {
        const label = wrap(node.label, chars);
        const note = wrap(node.note, chars + 2);
        const h = Math.max(g.minH, label.length * g.lineL + note.length * g.lineN + g.pad * 1.2);
        const box = { x: g.x0, y: cursor, w, h, label, note };
        cursor += h + (flows ? g.gap : 8);
        return box;
      });
      cursor -= flows ? g.gap : 8;
      const cxm = g.x0 + w / 2;
      if (flows) {
        connectors = boxes.slice(0, -1).map((b) => `M${cxm} ${b.y + b.h} V${b.y + b.h + g.gap - 2}`);
        const first = boxes[0]!;
        const last = boxes[n - 1]!;
        const a = first.y + first.h / 2;
        const z = last.y + last.h / 2;
        if (isLoop) {
          const right = g.x0 + w + 16;
          loop = `M${g.x0 + w} ${z} H${right} V${a} H${g.x0 + w + 2}`;
          packet = `M${cxm} ${a} V${z} H${right} V${a} H${cxm}`;
        } else packet = `M${cxm} ${a} V${z}`;
      }
      cursor += g.laneGap;
    }

    const span = packet ? packetLength(packet) : 0;
    return { lane, rev, status, headerY, boxes, connectors, packet, packetSeconds: Math.max(1.6, span / 240), loop };
  });
  return { width: g.width, height: cursor - g.laneGap + 4, lanes };
}

/** Length of an M/H/V path, for packet timing. */
function packetLength(d: string): number {
  let x = 0;
  let y = 0;
  let len = 0;
  for (const [, cmd, a, b] of d.matchAll(/([MHV])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
    const p = Number(a);
    if (cmd === 'M') {
      x = p;
      y = Number(b);
    } else if (cmd === 'H') {
      len += Math.abs(p - x);
      x = p;
    } else {
      len += Math.abs(p - y);
      y = p;
    }
  }
  return len;
}

/** How many times packets run through the system after it comes into view, and on hover. */
const PACKET_RUNS = 2;

function Drawing({ diagram, mode, id }: { diagram: Diagram; mode: Mode; id: string }) {
  const g = G[mode];
  const { width, height, lanes } = layout(diagram, mode);
  const arrow = `${id}-${mode}-arrow`;
  const arrowMuted = `${id}-${mode}-arrow-muted`;
  let step = 0;

  return (
    <svg
      className={cx(styles.drawing, styles[mode])}
      viewBox={`-6 -6 ${width + 12} ${height + 12}`}
      aria-hidden="true"
    >
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9" className={styles.head} />
        </marker>
        <marker id={arrowMuted} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 1 L9 5 L0 9" className={styles.headMuted} />
        </marker>
      </defs>
      {lanes.map((l) => {
        const tone = styles[l.lane.tone];
        const muted = l.lane.tone === 'muted';
        const marker = `url(#${muted ? arrowMuted : arrow})`;
        const headerX = mode === 'wide' ? 0 : g.x0;
        const headerTextX = headerX + (l.rev ? 26 : 0);
        return (
          <g key={l.lane.label} className={tone}>
            {/* Lane header: revision triangle, lane name, status. */}
            {l.rev && (
              <g className={styles.rev}>
                <path d={`M${headerX + 10} ${l.headerY + 1} L${headerX + 20} ${l.headerY + 18} L${headerX} ${l.headerY + 18} Z`} />
                <text x={headerX + 10} y={l.headerY + 15} textAnchor="middle">
                  {l.rev}
                </text>
              </g>
            )}
            <text className={styles.laneLabel} x={headerTextX} y={l.headerY + 13}>
              {mode === 'wide'
                ? wrap(l.lane.label.toUpperCase(), 16).map((line, i) => (
                    <tspan key={line} x={headerTextX} dy={i === 0 ? 0 : 15}>
                      {line}
                    </tspan>
                  ))
                : `${l.lane.label.toUpperCase()} · ${l.status.toUpperCase()}`}
            </text>
            {mode === 'wide' && (
              <text
                className={cx(styles.status, muted && styles.struck)}
                x={headerTextX}
                y={l.headerY + 13 + wrap(l.lane.label, 16).length * 15 + 4}
              >
                {l.status.toUpperCase()}
              </text>
            )}

            {/* Packets travel behind the boxes, visible only in the gaps between them. */}
            {l.packet && l.lane.tone === 'accent' && (
              <circle className={styles.packet} r={4} opacity={0}>
                <animateMotion path={l.packet} dur={`${l.packetSeconds}s`} begin="indefinite" repeatCount={PACKET_RUNS} fill="remove" />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.08;0.92;1"
                  dur={`${l.packetSeconds}s`}
                  begin="indefinite"
                  repeatCount={PACKET_RUNS}
                  fill="remove"
                />
              </circle>
            )}

            {l.connectors.map((d) => (
              <path
                key={d}
                className={styles.connector}
                d={d}
                markerEnd={marker}
                pathLength={muted ? undefined : 1}
                data-draw={muted ? undefined : 'view'}
                style={drawStep(step++)}
              />
            ))}
            {l.loop && (
              <path
                className={styles.connector}
                d={l.loop}
                markerEnd={marker}
                pathLength={1}
                data-draw="view"
                style={drawStep(step++)}
              />
            )}

            {l.boxes.map((b) => {
              const textH = b.label.length * g.lineL + b.note.length * g.lineN;
              const top = b.y + (b.h - textH) / 2 + g.label - 3;
              return (
                <g key={b.label.join(' ') + b.x + b.y}>
                  <rect
                    className={styles.box}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    pathLength={muted ? undefined : 1}
                    data-draw={muted ? undefined : 'view'}
                    style={drawStep(step++)}
                  />
                  <text className={styles.nodeLabel} x={b.x + b.w / 2} y={top} textAnchor="middle">
                    {b.label.map((line, i) => (
                      <tspan key={line} x={b.x + b.w / 2} dy={i === 0 ? 0 : g.lineL}>
                        {line}
                      </tspan>
                    ))}
                    {b.note.map((line, i) => (
                      <tspan
                        key={`n${line}`}
                        className={styles.note}
                        x={b.x + b.w / 2}
                        dy={i === 0 ? g.lineL - 1 : g.lineN}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

interface Props {
  diagram: Diagram;
  /** Unique per schematic on the page, for marker ids. */
  id: string;
}

/**
 * A project's "how it works" as an engineering schematic. Where there is a before and after, the
 * old setup is Rev A (dashed, struck through in redline) and the system Peter built is Rev B.
 * Boxes and connectors draw themselves when the schematic comes into view, then a data packet
 * runs through the built system twice; hovering the schematic sends it again. A list version
 * carries the same content for assistive tech.
 */
export function Schematic({ diagram, id }: Props) {
  const ref = useRef<HTMLElement>(null);
  const { ui } = resume;

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = (): void => {
      for (const a of el.querySelectorAll<SVGAnimationElement>('animateMotion, animate')) {
        try {
          a.beginElement();
        } catch {
          // A hidden SVG (the layout not in use) may refuse; it has nothing to show anyway.
        }
      }
    };
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      // Wait for the boxes and connectors to finish drawing.
      timer = window.setTimeout(run, 1600);
    });
    io.observe(el);
    el.addEventListener('pointerenter', run);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      el.removeEventListener('pointerenter', run);
    };
  }, []);

  return (
    <figure ref={ref} className={styles.schematic} data-watch>
      <figcaption className={styles.title}>{ui.schematic}</figcaption>
      <div className={styles.stage}>
        <Drawing diagram={diagram} mode="wide" id={id} />
        <Drawing diagram={diagram} mode="tall" id={id} />
      </div>
      <div className="sr-only">
        {diagram.lanes.map((lane) => (
          <p key={lane.label}>
            {lane.label}: {lane.nodes.map((n) => (n.note ? `${n.label} (${n.note})` : n.label)).join(', then ')}.
          </p>
        ))}
      </div>
      {diagram.outcome && (
        <p className={styles.outcome}>
          <span className={styles.outcomeLabel}>{ui.result}</span>
          {diagram.outcome}
        </p>
      )}
    </figure>
  );
}
