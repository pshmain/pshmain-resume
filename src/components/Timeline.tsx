import type { CSSProperties, MouseEvent } from 'react';
import { resume, type RoleId } from '@/data/resume';
import { formatSpan, toMonth, yearOf } from '@/lib/months';
import { cx } from '@/lib/cx';
import styles from './Timeline.module.css';

interface Props {
  selected: RoleId;
  /** Whether the visitor has chosen a role yet. Until then no bar is drawn as selected. */
  picked: boolean;
  onSelect: (id: RoleId) => void;
  lit: RoleId[] | null;
}

/** Bars and ticks are placed by percentage of the span from the first start to the build month. */
const rows = resume.roles.map((role) => ({ role, start: toMonth(role.start), end: toMonth(role.end) }));
const first = Math.min(...rows.map((r) => r.start));
const last = Math.max(...rows.map((r) => r.end)) + 1; // exclusive: the end month counts as worked
const pct = (month: number): number => ((month - first) / (last - first)) * 100;
const ticks: { year: number; at: number }[] = [];
for (let y = yearOf(first) + 1; y * 12 < last; y++) ticks.push({ year: y, at: pct(y * 12) });

/**
 * Gantt chart of the roles (design/dashboard.md, "III · Career"). Each row is directly labelled
 * with company, role, dates and duration, so the bars need no tooltip. A role in the Work
 * explorer gets a bar that links to its panel (a plain jump without JavaScript, a selection with
 * it); a role without a showcase gets a plain bar.
 */
export function Timeline({ selected, picked, onSelect, lit }: Props) {
  const { ui } = resume;
  return (
    <figure className={styles.timeline} data-watch>
      <figcaption className="sr-only">{ui.timeline}</figcaption>
      <ol className={styles.rows} role="list">
        {rows.map(({ role, start, end }, row) => {
          const left = pct(start);
          const width = pct(end + 1) - left;
          const position = { '--left': `${left}%`, '--width': `${width}%` } as CSSProperties;
          const onClick = (e: MouseEvent<HTMLAnchorElement>): void => {
            e.preventDefault();
            onSelect(role.id);
          };
          return (
            <li
              key={role.id}
              style={{ '--row': row } as CSSProperties}
              className={cx(
                styles.row,
                picked && role.id === selected && styles.selected,
                lit && !lit.includes(role.id) && styles.dim,
              )}
            >
              <span className={styles.label}>
                <span className={styles.company}>{role.company}</span>
                <span className={styles.kicker}>{role.kicker}</span>
                <span className={styles.dates}>
                  {role.start}
                  {ui.dateSeparator}
                  {role.end}
                  {ui.roleSeparator}
                  {formatSpan(start, end)}
                </span>
              </span>
              <span className={styles.track}>
                {ticks.map((t) => (
                  <span key={t.year} className={styles.grid} style={{ left: `${t.at}%` }} aria-hidden="true" />
                ))}
                {role.showcase ? (
                  <a
                    href={`#work-${role.id}`}
                    className={styles.bar}
                    style={position}
                    aria-current={(picked && role.id === selected) || undefined}
                    onClick={onClick}
                  >
                    <span className="sr-only">{role.company}</span>
                  </a>
                ) : (
                  <span className={styles.bar} style={position} aria-hidden="true" />
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className={styles.axis} aria-hidden="true">
        <span className={styles.axisTrack}>
          {ticks.map((t) => (
            <span key={t.year} className={styles.tick} style={{ left: `${t.at}%` }}>
              {t.year}
            </span>
          ))}
        </span>
      </div>
    </figure>
  );
}
