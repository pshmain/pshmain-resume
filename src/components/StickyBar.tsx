import { useEffect, useState, type RefObject } from 'react';
import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import styles from './StickyBar.module.css';

interface Props {
  /** The cover sheet; the bar shows once it has scrolled fully out of view. */
  watch: RefObject<HTMLElement | null>;
}

/** The drawing set's index strip: name, sheet links and contact, pinned once the cover is gone. */
export function StickyBar({ watch }: Props) {
  const { name, sections, contact, download, ui } = resume;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShown(!entry?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [watch]);

  return (
    <nav className={styles.bar} aria-label={ui.quickLinks} data-shown={shown || undefined} inert={!shown}>
      <div className={styles.inner}>
        <a href="#top" className={styles.name}>
          {name}
        </a>
        <ul className={styles.links} role="list">
          {[sections.work, sections.career, sections.skills].map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>
                <span className={styles.sheet}>{s.sheet}</span> {s.title}
              </a>
            </li>
          ))}
        </ul>
        <ul className={styles.actions} role="list">
          <li>
            <a href={`mailto:${contact.email}`} className={styles.icon}>
              <Icon name="mail" />
              <span className="sr-only">
                {ui.email} {contact.email}
              </span>
            </a>
          </li>
          <li>
            <ExternalLink href={contact.linkedin.href} className={styles.icon}>
              <Icon name="linkedin" />
              <span className="sr-only">{contact.linkedin.short}</span>
            </ExternalLink>
          </li>
          <li>
            <a href={download.href} download={download.filename} className={styles.download}>
              <Icon name="download" />
              <span className={styles.downloadLabel}>{download.short}</span>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
