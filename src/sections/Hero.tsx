import type { RefObject } from 'react';
import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import { CopyButton } from '@/components/CopyButton';
import { Icon } from '@/components/Icon';
import { enterStep } from '@/lib/motion';
import styles from './Hero.module.css';

interface Props {
  sectionRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/** The ruins banner: name, headline, and every way to reach Peter, one click each. */
export function Hero({ sectionRef, canvasRef }: Props) {
  const { name, headline, location, contact, download, ui } = resume;
  return (
    <header ref={sectionRef} id="top" className={styles.hero}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.container}>
        <h1 className={styles.name} data-enter style={enterStep(0)}>
          {name}
        </h1>
        <div className={styles.rule} aria-hidden="true" data-enter="grow" style={enterStep(1)} />
        <p className={styles.subtitle} data-enter style={enterStep(2)}>
          {headline}
          {ui.headlineSeparator}
          <span className={styles.nowrap}>{location}</span>
        </p>
        <ul className={styles.actions} role="list">
          <li data-enter style={enterStep(3)}>
            <a href={download.href} download={download.filename} className={styles.primary}>
              <Icon name="download" />
              {download.label}
            </a>
          </li>
          <li className={styles.action} data-enter style={enterStep(4)}>
            <a href={`mailto:${contact.email}`} className={styles.actionLink}>
              <Icon name="mail" />
              {contact.email}
            </a>
            <CopyButton text={contact.email} label={ui.copyEmail} className={styles.copy} />
          </li>
          <li className={styles.action} data-enter style={enterStep(5)}>
            <ExternalLink href={contact.linkedin.href} className={styles.actionLink}>
              <Icon name="linkedin" />
              {contact.linkedin.short}
            </ExternalLink>
          </li>
          <li className={styles.action} data-enter style={enterStep(6)}>
            <a href={contact.phone.href} className={styles.actionLink}>
              <Icon name="phone" />
              <span className={styles.phone}>{contact.phone.display}</span>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
