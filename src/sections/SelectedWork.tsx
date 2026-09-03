import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import { ExternalLink } from '@/components/ExternalLink';
import { ArrowIcon } from '@/components/ArrowIcon';
import styles from './SelectedWork.module.css';

export function SelectedWork() {
  return (
    <Section meta={resume.sections.work} spacing="loose">
      <ul className={styles.grid} role="list">
        {resume.work.map((card) => (
          <li key={card.href}>
            <ExternalLink href={card.href} className={styles.card}>
              <span className={styles.top}>
                <span className={styles.kicker}>{card.kicker}</span>
                <span className={styles.arrow}>
                  <ArrowIcon />
                </span>
              </span>
              <h3 className={styles.title}>{card.title}</h3>
              <span className={styles.blurb}>{card.blurb}</span>
              <span className={styles.domain}>{card.domain}</span>
            </ExternalLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}
