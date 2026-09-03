import styles from './ArrowIcon.module.css';

/**
 * North-east arrow for external links. Neither Cormorant nor Lora carries U+2197, so the
 * handoff's "↗" glyph would fall back to whatever symbol font the visitor's OS has; an inline
 * SVG renders identically everywhere.
 */
export function ArrowIcon() {
  return (
    <svg className={styles.arrow} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4 12 12 4" />
      <path d="M6 4h6v6" />
    </svg>
  );
}
