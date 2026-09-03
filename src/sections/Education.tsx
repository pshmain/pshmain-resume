import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import entry from '@/components/Entry.module.css';
import styles from './Education.module.css';

export function Education() {
  const { education } = resume;
  return (
    <Section meta={resume.sections.education}>
      <div className={entry.header}>
        <h3 className={entry.title}>{education.school}</h3>
        <span className={entry.date}>{education.date}</span>
      </div>
      <p className={styles.credential}>{education.credential}</p>
    </Section>
  );
}
