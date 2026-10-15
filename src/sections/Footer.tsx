import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './Footer.module.css';

export function Footer() {
  const { name, contact, colophon } = resume;
  return (
    <footer className={styles.footer} data-reveal>
      <div className={styles.inner}>
        <div className={styles.rule} aria-hidden="true" />
        <span className={styles.name}>{name}</span>
        <p className={styles.colophon}>{colophon}</p>
        <ul className={styles.contact} role="list">
          <li>
            <a href={`mailto:${contact.email}`}>{contact.email}</a>
          </li>
          <li>
            <a href={contact.phone.href} className={styles.phone}>
              {contact.phone.display}
            </a>
          </li>
          <li>
            <ExternalLink href={contact.linkedin.href}>{contact.linkedin.display}</ExternalLink>
          </li>
        </ul>
      </div>
    </footer>
  );
}
