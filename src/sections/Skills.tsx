import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import styles from './Skills.module.css';

export function Skills() {
  return (
    <Section meta={resume.sections.skills}>
      <dl className={styles.grid}>
        {resume.skills.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
