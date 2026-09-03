// Bakes the React tree into dist/index.html after `vite build` and the SSR build, so the page
// carries its full content before any JavaScript loads. Run via `npm run build`.
//
// When the production origin is known at build time (SITE_URL, or Vercel's
// VERCEL_PROJECT_PRODUCTION_URL), og:image is made absolute and og:url + a canonical link are
// added; social previews need absolute URLs. Locally these are left out.
import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const indexPath = path.join(dist, 'index.html');
const serverDir = path.join(dist, 'server');
const marker = '<!--app-->';
const socialMarker = '<!--social-->';

const { render } = await import(pathToFileURL(path.join(serverDir, 'entry-server.js')).href);
const html = await readFile(indexPath, 'utf8');
if (!html.includes(marker)) throw new Error(`prerender: ${marker} not found in dist/index.html`);

const markup = render();
let out = html.replace(marker, markup);

const origin = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/+$/, '');
if (origin) {
  out = out
    .replace('content="/og-image.png"', `content="${origin}/og-image.png"`)
    .replace(
      socialMarker,
      `<meta property="og:url" content="${origin}/" />\n    <link rel="canonical" href="${origin}/" />`,
    );
} else {
  out = out.replace(`    ${socialMarker}\n`, '');
}

await writeFile(indexPath, out);
await rm(serverDir, { recursive: true, force: true });
console.log(
  `prerendered dist/index.html (${markup.length} bytes of markup${origin ? `, social URLs on ${origin}` : ', no site origin: og:image left relative'})`,
);
