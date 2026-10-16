import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import { DrawingSpecs } from '@/components/drawing/DrawingSpecs';
import styles from './Footer.module.css';

/** The drawing set's closing title block: who drew it, how to reach him, and his revisions. */
export function Footer() {
  const { name, contact, colophon, revisions, ui } = resume;
  return (
    <footer className={styles.footer} data-reveal>
      <div className={styles.block}>
        <div className={styles.cell}>
          <span className={styles.label}>{ui.drawnBy}</span>
          <span className={styles.name}>{name}</span>
          <DrawingSpecs />
          <p className={styles.colophon}>{colophon}</p>
        </div>
        <div className={styles.cell}>
          <span className={styles.label}>{ui.contact}</span>
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
        <div className={styles.cell}>
          <table className={styles.revisions}>
            <caption className={styles.label}>{ui.revisions}</caption>
            <thead>
              <tr>
                <th scope="col">{ui.rev}</th>
                <th scope="col">{ui.description}</th>
                <th scope="col">{ui.date}</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r) => (
                <tr key={r.rev} className={r.open ? styles.open : undefined}>
                  <td className={styles.rev}>{r.rev}</td>
                  <td>{r.description}</td>
                  <td className={styles.date}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </footer>
  );
}
