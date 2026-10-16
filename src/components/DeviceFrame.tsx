import type { ReactNode } from 'react';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './DeviceFrame.module.css';

interface BrowserProps {
  /** Shown in the address pill. */
  address: string;
  /** Where the address pill links; without it the pill is plain text. */
  url?: string;
  children: ReactNode;
}

/** A minimal browser window around a desktop screenshot; the address pill opens the live page. */
export function BrowserFrame({ address, url, children }: BrowserProps) {
  return (
    <div className={styles.browser}>
      <div className={styles.chrome}>
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {url ? (
          <ExternalLink href={url} className={styles.address}>
            {address}
          </ExternalLink>
        ) : (
          <span className={styles.address}>{address}</span>
        )}
      </div>
      <div className={styles.screen}>{children}</div>
    </div>
  );
}

/** A phone outline around a phone screenshot. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.phone}>
      <div className={styles.phoneScreen}>{children}</div>
    </div>
  );
}
