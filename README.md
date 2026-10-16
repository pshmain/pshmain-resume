# resume-site

Single-page résumé for Peter Shmain, drawn as a set of engineering blueprint sheets and built as
an interactive dashboard. Vite + React 19 + TypeScript, with three.js for the cover's engine. The spec is
`design/blueprint.md`.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, client build, SSR build, prerender -> dist/
npm run preview  # serve dist/ at http://localhost:4173
npm run shots    # recapture the live-site screenshots (manual, uses the installed Chrome)
```

## What is in the page

- **A-001 Cover sheet:** the name with a dimension line; a CAD workspace with a 3D inline-six
  engine to turn, explode and run (a cylinder per skill layer, a configuration per project), its
  feature tree and property panel; a title block with every contact route; and a drafting
  crosshair that follows the mouse.
- **A-002 At a glance:** four key numbers on dimension lines, with $750K ringed in a redline
  revision cloud. Each tile jumps to the bullet it comes from.
- **A-101 Work:** sheet tabs for Provenance, CoDriverHQ and Sneakerhead. Each has:
  - live-site captures with numbered callouts and a lightbox (CoDriverHQ and Sneakerhead;
    Provenance's work was internal tooling, so its schematic carries the picture);
  - a specifications table;
  - a "how it works" schematic (Rev A superseded, Rev B built) that draws itself and sends
    data packets through the built system;
  - numbered notes.
- **A-201 Career:** a hatched schedule of every role.
- **A-301 Skills:** a bill of materials per layer, with a used-in matrix linked to the stack
  drawing, the project tabs and the schedule.
- **A-401 Education**, then a footer title block with the site's revision table.

The React tree is prerendered into `dist/index.html` at build time and hydrated on load, so the
whole résumé is readable before any JavaScript runs. Without JavaScript every project is
expanded and every drawing is drawn. All motion is one-shot and respects reduced motion.

## Where things live

- `design/blueprint.md` is the spec, `design/DEVIATIONS.md` records departures from it, and
  `design/archive/roman-v1/` holds rev A (git tag `RomanArchitecture_v1`).
- `src/data/resume.ts` holds all copy, skill-to-project links, screenshot callouts and schematic
  lanes. Components never hardcode text.
- `src/styles/tokens.css` holds every colour, font, spacing, line and motion value, and is the
  only file allowed to contain raw values. Next to it: `base.css` (paper, reset, print) and
  `motion.css` (entrance, reveal, line drawing).
- `src/sections/*` has one component per sheet, and `src/components/*` the shared pieces.
  `src/components/drawing/*` holds the drafting primitives.
- `src/assets/shots/` holds the screenshots and their manifest, and `scripts/capture-shots.mjs`
  regenerates them.
- `public/fonts/` holds self-hosted IBM Plex (Sans, Sans Condensed, Mono).
- `scripts/prerender.mjs` bakes the rendered markup into `dist/index.html` after the build.

## Testing the production build locally

Run `npm run build && npm run preview`, then check widths of 375, 768 and 1280 px.

The site deploys to Vercel as a static site. `vercel.json` pins the build command and output
directory and sets the cache headers: hashed `/assets/*` files are immutable, and `/fonts/*` is
cached for a week. When the build runs on Vercel, `scripts/prerender.mjs` reads
`VERCEL_PROJECT_PRODUCTION_URL` to make `og:image` absolute and to add `og:url` and a canonical
link; set `SITE_URL` to do the same elsewhere. See `CLAUDE.md` for conventions and the
verification checklist.
