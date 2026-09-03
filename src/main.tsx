import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@/styles/tokens.css';
import '@/styles/base.css';
import App from '@/App';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Production HTML is prerendered by scripts/prerender.mjs, so the content is there before any
// JavaScript runs and React only hydrates. The dev server serves an empty root.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
