import styles from './RevisionCloud.module.css';

/** Scalloped outline of a w x h box: arcs bulging outward, about 2r apart, clockwise. */
function cloudPath(w: number, h: number, r: number): string {
  const corners: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  let d = 'M0 0';
  corners.forEach(([x0, y0], i) => {
    const [x1, y1] = corners[(i + 1) % corners.length]!;
    const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (2 * r)));
    for (let k = 1; k <= steps; k++) {
      const x = x0 + ((x1 - x0) * k) / steps;
      const y = y0 + ((y1 - y0) * k) / steps;
      d += ` A${r * 1.15} ${r * 1.15} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });
  return `${d} Z`;
}

const PATH = cloudPath(200, 80, 9);

interface Props {
  draw?: 'enter' | 'view';
}

/**
 * A redline revision cloud around its positioned parent: the drafter's "look here". Stretches
 * to the parent's box; the stroke keeps its width.
 */
export function RevisionCloud({ draw }: Props) {
  return (
    <svg className={styles.cloud} viewBox="-10 -10 220 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={PATH} pathLength={1} data-draw={draw} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
