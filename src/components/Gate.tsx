import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type TransitionEvent,
} from 'react';
import type { DitherEngine } from '@/engine/DitherEngine';
import { resume } from '@/data/resume';
import { cx } from '@/lib/cx';
import styles from './Gate.module.css';

/**
 * The riddle that locks the page. Everything the visitor must not see yet is hidden by CSS
 * keyed on `<html data-gate>` (see base.css), which the inline script in index.html sets to
 * "locked" before first paint; this component only advances that attribute. The markup is
 * identical on the server and the client, so the prerendered page hydrates cleanly and, with
 * no JavaScript, the overlay is simply never shown.
 *
 * States: locked (riddle, then the reveal card) -> dissolving (card recedes) -> open (ruins
 * and text fade in; the overlay is gone) -> done (unmounted).
 */

/** Mirrors the key the inline script in index.html checks before first paint. */
const STORAGE_KEY = 'gate';
const STORAGE_OPEN = 'open';
const ANSWER_MAX_LENGTH = 24;

type GateState = 'locked' | 'dissolving' | 'open' | 'done';
type Phase = 'riddle' | 'reveal';

interface Props {
  engine: RefObject<DitherEngine | null>;
}

/** Lowercase letters only, leading article dropped: "The Arches!" -> "arches". */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(a|an|the)\s+/, '')
    .replace(/[^a-z]/g, '');
}

/** A CSS <time> token on :root, in milliseconds. */
function readDurationMs(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

export function Gate({ engine }: Props) {
  const { gate } = resume;
  const [state, setState] = useState<GateState>('locked');
  const [phase, setPhase] = useState<Phase>('riddle');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hintHover, setHintHover] = useState(false);
  const [hintPinned, setHintPinned] = useState(false);
  const stateRef = useRef<GateState>('locked');
  const inputRef = useRef<HTMLInputElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  const go = (next: GateState): void => {
    stateRef.current = next;
    setState(next);
  };
  const later = (fn: () => void, ms: number): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const id of pending) clearTimeout(id);
    };
  }, []);

  // The inline script decides whether the page is locked. If it is not, this overlay has no job.
  useEffect(() => {
    if (document.documentElement.dataset.gate !== 'locked') {
      go('done');
      return;
    }
    if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (phase === 'reveal') enterRef.current?.focus();
  }, [phase]);

  const finishDissolve = (): void => {
    if (stateRef.current !== 'dissolving') return;
    go('open');
    document.documentElement.dataset.gate = 'open';
    try {
      sessionStorage.setItem(STORAGE_KEY, STORAGE_OPEN);
    } catch {
      // Storage unavailable: the gate shows again on the next load, which is acceptable.
    }
    engine.current?.setGate(false);
    later(() => go('done'), readDurationMs('--duration-reveal'));
  };

  const dissolve = (): void => {
    if (stateRef.current !== 'locked') return;
    go('dissolving');
    document.documentElement.dataset.gate = 'dissolving';
    // Fallback for a transitionend that never arrives (the card removed early, reduced motion).
    later(finishDissolve, readDurationMs('--duration-gate') + 100);
  };

  const onCardTransitionEnd = (e: TransitionEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget && e.propertyName === 'opacity') finishDissolve();
  };

  const reveal = (): void => {
    setHintHover(false);
    setHintPinned(false);
    setPhase('reveal');
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const guess = normalize(answer);
    if (!guess) {
      inputRef.current?.focus();
      return;
    }
    if (gate.answers.includes(guess)) {
      reveal();
      return;
    }
    const nudge = gate.nudges.find((n) => n.match.includes(guess));
    setFeedback(nudge ? nudge.text : gate.miss);
    inputRef.current?.select();
  };

  // Escape closes the hint, skips the riddle, or ends the reveal, in that order of precedence.
  const hintOpen = hintHover || hintPinned;
  useEffect(() => {
    if (state !== 'locked') return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (hintOpen) {
        setHintHover(false);
        setHintPinned(false);
      } else if (phase === 'reveal') {
        dissolve();
      } else {
        reveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (state === 'done') return null;
  const revealing = phase === 'reveal';

  return (
    <div className={styles.gate}>
      <div
        className={cx(styles.card, revealing && styles.wide)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-kicker"
        aria-describedby={revealing ? 'gate-reveal' : 'gate-riddle'}
        onTransitionEnd={onCardTransitionEnd}
      >
        <div className={styles.rule} aria-hidden="true" />
        <p id="gate-kicker" className={styles.kicker}>
          {revealing ? gate.answerKicker : gate.kicker}
        </p>

        {revealing ? (
          <div id="gate-reveal" className={styles.reveal}>
            {gate.reveal.map((line) => (
              <p key={line} className={styles.revealText}>
                {line}
              </p>
            ))}
            <p className={cx(styles.riddle, styles.closing)}>
              {gate.closing.map((line) => (
                <span key={line} className={styles.line}>
                  {line}
                </span>
              ))}
            </p>
            <button ref={enterRef} type="button" className={styles.enter} onClick={dissolve}>
              {gate.enter}
            </button>
          </div>
        ) : (
          <>
            <p id="gate-riddle" className={styles.riddle}>
              {gate.riddle.map((line) => (
                <span key={line} className={styles.line}>
                  {line}
                </span>
              ))}
            </p>
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <input
                ref={inputRef}
                className={styles.answer}
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setFeedback('');
                }}
                placeholder={gate.placeholder}
                maxLength={ANSWER_MAX_LENGTH}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                aria-label={gate.inputLabel}
                aria-invalid={feedback ? true : undefined}
                aria-describedby="gate-feedback"
              />
              <p id="gate-feedback" className={styles.feedback} aria-live="polite">
                {feedback}
              </p>
              <button type="submit" className={styles.enter}>
                {gate.submit}
              </button>
              <div className={styles.quiet}>
                <button
                  type="button"
                  className={styles.quietButton}
                  aria-expanded={hintOpen}
                  aria-controls="gate-hint"
                  onClick={() => setHintPinned((v) => !v)}
                  onMouseEnter={() => setHintHover(true)}
                  onMouseLeave={() => setHintHover(false)}
                  onFocus={() => setHintHover(true)}
                  onBlur={() => setHintHover(false)}
                >
                  {gate.hint}
                </button>
                <span className={styles.dot} aria-hidden="true">
                  ·
                </span>
                <button type="button" className={styles.quietButton} onClick={reveal}>
                  {gate.skip}
                </button>
              </div>
            </form>
            <p
              id="gate-hint"
              role="tooltip"
              className={cx(styles.hint, hintOpen && styles.hintOpen)}
              onMouseEnter={() => setHintHover(true)}
              onMouseLeave={() => setHintHover(false)}
            >
              {gate.hintLines.map((line) => (
                <span key={line} className={styles.line}>
                  {line}
                </span>
              ))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
