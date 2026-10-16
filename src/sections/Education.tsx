import { resume } from '@/data/resume';
import { Sheet } from '@/components/drawing/Sheet';
import styles from './Education.module.css';

/** Sheet A-401, general notes: education, set as the first note on the sheet. */
export function Education() {
  const { education } = resume;
  return (
    <Sheet meta={resume.sections.education}>
      <ol className={styles.notes}>
        <li className={styles.note}>
          <span className={styles.no} aria-hidden="true">
            01
          </span>
          <span className={styles.body}>
            <span className={styles.credential}>{education.credential}</span>
            <span className={styles.school}>{education.school}</span>
            <span className={styles.date}>{education.date}</span>
          </span>
        </li>
      </ol>
    </Sheet>
  );
}
