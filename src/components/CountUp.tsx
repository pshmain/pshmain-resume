import { useLayoutEffect, useRef, useState } from 'react';

/** Count-up length. */
const COUNT_MS = 1100;

interface Props {
  value: string;
  /** Pause after the value comes into view, so it lands after whatever reveals it. */
  delayMs?: number;
}

/**
 * "$750K" counts up from "$0K" the first time it is on screen. The server renders the final
 * value, the client swaps in the zero before paint, and screen readers only ever get the final
 * value (the counting copy is aria-hidden). Values that are not one whole number, and reduced
 * motion, render as they are.
 */
export function CountUp({ value, delayMs = 0 }: Props) {
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
