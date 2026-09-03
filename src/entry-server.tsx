import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from '@/App';

/** Used once at build time by scripts/prerender.mjs to bake the page into dist/index.html. */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
