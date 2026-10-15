import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import styles from './Education.module.css';

export function Education() {
  const { education } = resume;
  return (
    <Section meta={resume.sections.education}>
      <div className={styles.tile}>
        <h3 className={styles.school}>{education.school}</h3>
        <p className={styles.credential}>{education.credential}</p>
        <p className={styles.date}>{education.date}</p>
      </div>
    </Section>
  );
}
