import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './Footer.module.css';

export function Footer() {
  const { name, contact, download, colophon } = resume;
  return (
    <footer className={styles.footer} data-gate-hide>
      <div className={styles.inner}>
        <div className={styles.rule} aria-hidden="true" />
        <span className={styles.name}>{name}</span>
        <p className={styles.colophon}>{colophon}</p>
        <a href={download.href} download={download.filename} className={styles.button}>
          {/* Lucide "download" */}
          <svg
            className={styles.icon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M12 15V3" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
          </svg>
          <span className={styles.label}>{download.label}</span>
        </a>
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
