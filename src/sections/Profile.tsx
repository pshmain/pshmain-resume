import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import styles from './Profile.module.css';

export function Profile() {
  return (
    <Section meta={resume.sections.profile} first>
      <p className={styles.text}>{resume.profile}</p>
    </Section>
  );
}
