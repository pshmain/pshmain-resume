import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// "Present" on the career timeline resolves to the month the site was built, so the prerendered
// HTML and the hydrating client agree on every bar's width.
const buildMonth = new Date().toISOString().slice(0, 7);

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_MONTH__: JSON.stringify(buildMonth) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    cssMinify: true,
  },
});
