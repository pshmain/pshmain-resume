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
  /** Keep the h2 for assistive tech and the outline, but show no heading row. */
  headingHidden?: boolean;
  children: ReactNode;
}

/** Body section shell: hairline, ghost numeral, h2. */
export function Section({ meta, spacing = 'default', first = false, headingHidden = false, children }: Props) {
  const headingId = `${meta.id}-heading`;
  const heading = headingHidden ? (
    <h2 id={headingId} className="sr-only">
      {meta.title}
    </h2>
  ) : (
    <div className={cx(styles.heading, spacing === 'tight' && styles.tight, spacing === 'loose' && styles.loose)}>
      <span className={styles.numeral} aria-hidden="true">
        {meta.numeral}
      </span>
      <h2 id={headingId} className={styles.title}>
        {meta.title}
      </h2>
    </div>
  );
  return (
    <section id={meta.id} aria-labelledby={headingId} className={cx(styles.section, first && styles.first)}>
      {heading}
      {children}
    </section>
  );
}
