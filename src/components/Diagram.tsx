import type { CSSProperties } from 'react';
import type { Diagram as DiagramData } from '@/data/resume';
import { cx } from '@/lib/cx';
import styles from './Diagram.module.css';

interface Props {
  diagram: DiagramData;
}

/**
 * A role's "how it works" flow: lanes of nodes joined by CSS-drawn arrows. Horizontal when the
 * diagram is at least 480px wide (container query), vertical otherwise. Ordered lists, so the
 * sequence reads the same without the arrows.
 */
export function Diagram({ diagram }: Props) {
  // One running index across lanes, so the nodes animate in reading order.
  let order = 0;
  return (
    <div className={styles.diagram} data-watch>
      {diagram.lanes.map((lane) => (
        <div key={lane.label} className={cx(styles.lane, styles[lane.tone], styles[lane.layout])}>
          <p className={styles.laneLabel}>{lane.label}</p>
          {lane.layout === 'set' ? (
            <ul className={styles.nodes} role="list">
              {lane.nodes.map((node) => (
                <Node key={node.label} label={node.label} note={node.note} order={order++} />
              ))}
            </ul>
          ) : (
            <ol
              className={styles.nodes}
              role="list"
              style={{ '--count': lane.nodes.length } as CSSProperties}
            >
              {lane.nodes.map((node) => (
                <Node key={node.label} label={node.label} note={node.note} order={order++} />
              ))}
            </ol>
          )}
        </div>
      ))}
      {diagram.outcome && <p className={styles.outcome}>{diagram.outcome}</p>}
    </div>
  );
}

interface NodeProps {
  label: string;
  note?: string | undefined;
  /** Position in the diagram's reading order, for the staggered entrance. */
  order: number;
}

function Node({ label, note, order }: NodeProps) {
  return (
    <li className={styles.node} style={{ '--i': order } as CSSProperties}>
      <span className={styles.nodeLabel}>{label}</span>
      {note && <span className={styles.note}>{note}</span>}
    </li>
  );
}
