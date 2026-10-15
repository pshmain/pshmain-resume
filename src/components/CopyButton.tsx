import { useEffect, useRef, useState } from 'react';
import { resume } from '@/data/resume';
import { cx } from '@/lib/cx';
import { Icon } from '@/components/Icon';
import styles from './CopyButton.module.css';

/** How long "Copied" stays up. */
const COPIED_MS = 2000;

interface Props {
  text: string;
  label: string;
  className?: string;
}

/**
 * Copies `text` to the clipboard and says so for a moment. Hidden without JavaScript (see the
 * module CSS); the mailto link it sits beside works either way.
 */
export function CopyButton({ text, label, className }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // clipboard blocked (permissions, insecure origin): the link beside still works
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <>
      <button
        type="button"
        className={cx(styles.copy, className)}
        onClick={() => void copy()}
        aria-label={label}
        data-copied={copied || undefined}
      >
        <Icon name={copied ? 'check' : 'copy'} />
        {copied && (
          <span className={styles.copied} aria-hidden="true">
            {resume.ui.copied}
          </span>
        )}
      </button>
      <span className="sr-only" role="status">
        {copied ? resume.ui.copied : ''}
      </span>
    </>
  );
}
