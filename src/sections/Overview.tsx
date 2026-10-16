import type { MouseEvent } from 'react';
import { resume, type Stat } from '@/data/resume';
import { Sheet } from '@/components/drawing/Sheet';
import { Dimension } from '@/components/drawing/Dimension';
import { RevisionCloud } from '@/components/drawing/RevisionCloud';
import { CountUp } from '@/components/CountUp';
import { Icon } from '@/components/Icon';
import { revealStep } from '@/lib/motion';
import styles from './Overview.module.css';

interface Props {
  /** Select the stat's role and mark its source bullet. */
  onStat: (stat: Stat) => void;
}

/** A count-up starts once its dimension line has begun to spread. */
const COUNT_DELAY_MS = 350;

/**
 * "3 → 1" with the arrow drawn as an icon (neither face carries U+2192); the arrow and what
 * follows it slide in after the tile (Overview.module.css). A single number counts up.
 */
function StatValue({ value, index }: { value: string; index: number }) {
  const parts = value.split('→').map((p) => p.trim());
  if (parts.length === 1) return <CountUp value={value} delayMs={COUNT_DELAY_MS + index * 60} />;
  return (
    <>
      {parts.map((part, i) => (
        <span key={part + i} className={styles.part}>
          {i > 0 && (
            <>
              <Icon name="arrowRight" className={styles.arrow} />
              <span className="sr-only"> {resume.ui.arrowTo} </span>
            </>
          )}
          {part}
        </span>
      ))}
    </>
  );
}

/**
 * Sheet A-002, key dimensions: the profile beside four numbers, each measured off with a
 * dimension line. The one to notice first wears a redline revision cloud. Each tile links to the
 * bullet its number comes from.
 */
export function Overview({ onStat }: Props) {
  const { sections, profile, stats } = resume;
  return (
    <Sheet meta={sections.overview}>
      <div className={styles.grid}>
        <p className={styles.profile} data-reveal>
          {profile}
        </p>
        <ul className={styles.stats} role="list" data-watch>
          {stats.map((stat, i) => {
            const href = stat.roleId ? `#work-${stat.roleId}` : `#${sections.work.id}`;
            const onClick = (e: MouseEvent<HTMLAnchorElement>): void => {
              if (!stat.roleId) return; // a plain jump to the Work sheet
              e.preventDefault();
              onStat(stat);
            };
            return (
              <li key={stat.label} data-reveal style={revealStep(i + 1)}>
                <a href={href} className={styles.tile} onClick={onClick}>
                  <span className={styles.value}>
                    {stat.cloud && <RevisionCloud draw="view" />}
                    <StatValue value={stat.value} index={i} />
                  </span>
                  <Dimension draw="view" className={styles.dimension} />
                  <span className={styles.label}>{stat.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
