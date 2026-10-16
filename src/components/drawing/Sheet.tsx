import type { ReactNode } from 'react';
import type { SectionMeta } from '@/data/resume';
import { cx } from '@/lib/cx';
import styles from './Sheet.module.css';

interface Props {
  meta: SectionMeta;
  /** Extra cell at the right of the title strip, e.g. "3 assemblies". */
  note?: string;
  className?: string;
  children: ReactNode;
}

/**
 * One sheet of the drawing set: a title strip (sheet number, title, kind of drawing) above the
 * content, with registration marks at two corners. The section is labelled by its h2.
 */
export function Sheet({ meta, note, className, children }: Props) {
  const headingId = `${meta.id}-heading`;
  return (
    <section id={meta.id} aria-labelledby={headingId} className={cx(styles.sheet, className)}>
      <header className={styles.strip}>
        <span className={styles.number}>{meta.sheet}</span>
        <h2 id={headingId} className={styles.title}>
          {meta.title}
        </h2>
        <span className={styles.kind}>{meta.kind}</span>
        {note && <span className={styles.note}>{note}</span>}
      </header>
      {children}
    </section>
  );
}
