import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Dimension.module.css';

interface Props {
  /** Text set into a gap at the middle of the line, as a drawing writes a measurement. */
  children?: ReactNode;
  /** When the line spreads out from its centre: on load, or when its [data-watch] ancestor
   * comes into view. Omit for a static line. */
  draw?: 'enter' | 'view';
  className?: string;
}

/**
 * A dimension line: extension ticks at both ends, a line from the middle out to each with an
 * arrowhead, and an optional label in the gap. Drawn in CSS so the arrowheads stay square at any
 * width.
 */
export function Dimension({ children, draw, className }: Props) {
  return (
    <span className={cx(styles.dimension, className)} data-anim={draw}>
      <span className={cx(styles.half, styles.start)} aria-hidden="true" />
      {children && <span className={styles.label}>{children}</span>}
      <span className={cx(styles.half, styles.end)} aria-hidden="true" />
    </span>
  );
}
