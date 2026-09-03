import { resume } from '@/data/resume';
import { Section } from '@/components/Section';
import { ExternalLink } from '@/components/ExternalLink';
import { ArrowIcon } from '@/components/ArrowIcon';
import entry from '@/components/Entry.module.css';
import styles from './Experience.module.css';

export function Experience() {
  const { ui } = resume;
  return (
    <Section meta={resume.sections.experience} spacing="tight">
      {resume.experience.map((role) => (
        <article key={`${role.company}-${role.start}`} className={styles.role}>
          <div className={entry.header}>
            <div className={entry.titleRow}>
              <h3 className={entry.title}>
                {role.title}
                {ui.roleSeparator}
                {role.company}
              </h3>
              {role.href && (
                <ExternalLink href={role.href} className={styles.visit}>
                  {ui.visit}
                  <span className="sr-only"> {role.company}</span> <ArrowIcon />
                </ExternalLink>
              )}
            </div>
            <span className={entry.date}>
              {role.start}
              {ui.dateSeparator}
              {role.end}
            </span>
          </div>
          <p className={styles.location}>{role.location}</p>
          <ul className={styles.bullets} role="list">
            {role.bullets.map((text) => (
              <li key={text} className={styles.bullet}>
                <span className={styles.dash} aria-hidden="true">
                  —
                </span>
                <span className={styles.bulletText}>{text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </Section>
  );
}
