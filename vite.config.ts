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
    rolldownOptions: {
      output: {
        // three.js in a chunk of its own: it changes only with a three upgrade, so returning
        // visitors keep it cached across deploys while the engine's code (engineScene) updates.
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
    // That three.js chunk is about 600 kB (150 kB gzipped), most of it the WebGL renderer and its
    // shader library, which cannot be tree-shaken. It is never in the first load: EngineModel
    // imports the scene once the page is idle, only where WebGL is available and the visitor is
    // not saving data. The limit sits just above it, so anything else past 500 kB still warns.
    // See design/DEVIATIONS.md.
    chunkSizeWarningLimit: 620,
  },
});
