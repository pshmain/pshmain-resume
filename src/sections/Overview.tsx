import { useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { resume, type Stat } from '@/data/resume';
import { Section } from '@/components/Section';
import { Icon } from '@/components/Icon';
import { enterStep } from '@/lib/motion';
import styles from './Overview.module.css';

interface Props {
  /** Select the stat's role and mark its source bullet. */
  onStat: (stat: Stat) => void;
}

/** Count-up length, and the pause before it so it lands after the tile has risen in. */
const COUNT_MS = 1100;
const COUNT_DELAY_MS = 450;

/**
 * "$750K" counts up from "$0K" the first time it is on screen. The server renders the final
 * value, the client swaps in the zero before paint, and screen readers only ever get the final
 * value (the counting copy is aria-hidden). Values that are not one whole number, and reduced
 * motion, render as they are.
 */
function CountUp({ value, delayMs }: { value: string; delayMs: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    const match = /^(\D*)(\d+)(\D*)$/.exec(value);
    const el = ref.current;
    if (!match || !el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const [, prefix = '', digits = '0', suffix = ''] = match;
    const target = Number(digits);
    const render = (n: number): string => `${prefix}${n}${suffix}`;
    setShown(render(0));
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now() + delayMs;
      const tick = (now: number): void => {
        const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
        setShown(render(Math.round(target * (1 - (1 - t) ** 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, delayMs]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

/**
 * "3 → 1" with the arrow drawn as an icon (neither face carries U+2192); the arrow and what
 * follows it slide in after the tile (Overview.module.css). A single number counts up.
 */
function StatValue({ value, index }: { value: string; index: number }) {
  const parts = value.split('→').map((p) => p.trim());
  if (parts.length === 1) return <CountUp value={value} delayMs={COUNT_DELAY_MS + index * 60} />;
  return (
    <>
      {parts.map((part, i) => (
        <span key={part + i} className={styles.part}>
          {i > 0 && (
            <>
              <Icon name="arrowRight" className={styles.arrow} />
              <span className="sr-only"> {resume.ui.arrowTo} </span>
            </>
          )}
          {part}
        </span>
      ))}
    </>
  );
}

export function Overview({ onStat }: Props) {
  const { sections, profile, stats } = resume;
  return (
    <Section meta={sections.overview} first headingHidden>
      <div className={styles.grid}>
        <p className={styles.profile} data-enter style={enterStep(5)}>
          {profile}
        </p>
        <ul className={styles.stats} role="list">
          {stats.map((stat, i) => {
            const href = stat.roleId ? `#work-${stat.roleId}` : `#${sections.work.id}`;
            const onClick = (e: MouseEvent<HTMLAnchorElement>): void => {
              if (!stat.roleId) return; // a plain jump to the Work section
              e.preventDefault();
              onStat(stat);
            };
            return (
              <li key={stat.label} data-enter style={enterStep(7 + i)}>
                <a href={href} className={styles.tile} onClick={onClick}>
                  <span className={styles.value}>
                    <StatValue value={stat.value} index={i} />
                  </span>
                  <span className={styles.label}>{stat.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
