import { useEffect, useRef, type RefObject } from 'react';
import styles from './Crosshair.module.css';

interface Props {
  /** The element the crosshair spans and tracks the pointer over. */
  area: RefObject<HTMLElement | null>;
}

/**
 * A drafting crosshair: hairlines through the pointer across the whole area, with a live X/Y
 * readout in drawing units. Elements marked data-crosshair="off" hide it. Decorative only (aria-hidden), so it is never rendered on the
 * server; it switches itself on for fine pointers outside reduced motion, and positions are
 * written straight to the DOM once per frame, never through React state.
 */
export function Crosshair({ area }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = area.current;
    const overlay = root.current;
    const label = readout.current;
    if (!el || !overlay || !label) return;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || still) return;

    const leave = (): void => {
      delete overlay.dataset.on;
    };
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = (): void => {
      raf = 0;
      overlay.style.setProperty('--x', `${x}px`);
      overlay.style.setProperty('--y', `${y}px`);
      label.textContent = `X ${String(Math.round(x)).padStart(4, '0')}  Y ${String(Math.round(y)).padStart(4, '0')}`;
    };
    const move = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return;
      // Areas with a pointer of their own (the 3D model) opt out.
      if (e.target instanceof Element && e.target.closest('[data-crosshair="off"]')) {
        leave();
        return;
      }
      const box = el.getBoundingClientRect();
      x = e.clientX - box.left;
      y = e.clientY - box.top;
      overlay.dataset.on = '';
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [area]);

  return (
    <div ref={root} className={styles.crosshair} aria-hidden="true">
      <span className={styles.h} />
      <span className={styles.v} />
      <span ref={readout} className={styles.readout} />
    </div>
  );
}
