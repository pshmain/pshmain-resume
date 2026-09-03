import type { RefObject } from 'react';
import { resume } from '@/data/resume';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './Hero.module.css';

interface Props {
  sectionRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function Hero({ sectionRef, canvasRef }: Props) {
  const { name, headline, location, contact, ui } = resume;
  return (
    <header ref={sectionRef} className={styles.hero}>
      {/* Ember glow behind the riddle gate; before the canvas so the ruins paint over it. */}
      <div className={styles.ember} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.cue} aria-hidden="true" data-gate-hide>
        <span className={styles.cueLabel}>{ui.scrollCue}</span>
        <div className={styles.cueTrack}>
          <div className={styles.cueRunner} />
        </div>
      </div>

      <div className={styles.nameBlock} data-gate-hide>
        <div className={styles.container}>
          <h1 className={styles.name}>{name}</h1>
          <div className={styles.rule} aria-hidden="true" />
          <p className={styles.subtitle}>
            {headline}
            {ui.headlineSeparator}
            <span className={styles.nowrap}>{location}</span>
          </p>
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
              <ExternalLink href={contact.linkedin.href}>{contact.linkedin.short}</ExternalLink>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
