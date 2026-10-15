import { useEffect } from 'react';

/** Starts a block's reveal a little before it is fully on screen. */
const ROOT_MARGIN = '0px 0px -8% 0px';

/**
 * Scroll-in reveals (src/styles/motion.css). Marks every [data-reveal] and [data-watch] element
 * with data-inview once it enters the viewport; [data-watch] elements get the flag without the
 * fade, for components that run their own animation off it (timeline bars, diagram nodes).
 *
 * Elements already on screen are marked before html[data-motion] is set, so nothing the visitor
 * can see is hidden and re-shown. Under reduced motion the attribute is never set and every
 * element simply stays visible. Elements inside a hidden panel or slide report no intersection
 * until they are shown, so they animate the first time they appear.
 */
export function useReveal(): void {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.inview = '';
          io.unobserve(entry.target);
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal], [data-watch]')) {
      const box = el.getBoundingClientRect();
      const onScreen = box.height > 0 && box.top < window.innerHeight && box.bottom > 0;
      if (onScreen) el.dataset.inview = '';
      else io.observe(el);
    }
    root.dataset.motion = '';
    return () => {
      io.disconnect();
      delete root.dataset.motion;
    };
  }, []);
}
