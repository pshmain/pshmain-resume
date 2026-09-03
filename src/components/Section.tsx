import type { ReactNode } from 'react';
import type { SectionMeta } from '@/data/resume';
import { cx } from '@/lib/cx';
import styles from './Section.module.css';

interface Props {
  meta: SectionMeta;
  /** Space between the heading row and the section body. */
  spacing?: 'tight' | 'default' | 'loose';
  /** First section in <main>: no hairline, shorter top padding. */
  first?: boolean;
  children: ReactNode;
}

/** Body section shell: hairline, ghost numeral, h2. */
export function Section({ meta, spacing = 'default', first = false, children }: Props) {
  const headingId = `${meta.id}-heading`;
  return (
    <section id={meta.id} aria-labelledby={headingId} className={cx(styles.section, first && styles.first)}>
      <div className={cx(styles.heading, spacing === 'tight' && styles.tight, spacing === 'loose' && styles.loose)}>
        <span className={styles.numeral} aria-hidden="true">
          {meta.numeral}
        </span>
        <h2 id={headingId} className={styles.title}>
          {meta.title}
        </h2>
      </div>
      {children}
    </section>
  );
}
