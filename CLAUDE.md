# resume-site

Single-page resume website for Peter Shmain: a recruiter-facing interactive dashboard drawn as a
set of engineering blueprint sheets. Design fidelity is the priority.

## Stack

- Vite + React 19 + TypeScript (strict). CSS Modules for component styles, plain CSS for globals.
- Three.js (`three`) for the cover's engine model only, imported dynamically by
  `src/components/model/EngineModel.tsx` (desktop: once the page is idle; touch: on first touch
  or a few seconds in) and only with WebGL. three.js gets a vendor chunk of its own
  (`vite.config.ts`) so it stays cached across deploys. Nothing else may import `three`.
- Motion is plain CSS (`src/styles/motion.css` and each module's no-preference block). The
  Motion library was removed: it served one spring, which `--ease-spring` now draws.
- No UI library, no CSS framework, no state library. Add nothing else unless the design
  requires it.
- Node 20.19 or newer (Vite 8's floor; `engines` in `package.json`). Vercel builds on its current
  default. Package manager: npm.
- Output is static (`dist/`), prerendered by `scripts/prerender.mjs`. Deploy target: Vercel.

## Commands

- `npm run dev` - dev server with HMR at http://localhost:5173.
- `npm run build` - typecheck, then production build to `dist/`. Must pass before any change is
  reported as done.
- `npm run preview` - serve the production build locally.
- `npm run typecheck` - tsc only.
- `npm run shots` - recapture the live-site screenshots (manual; drives the installed Chrome).
- `npm run poster` - re-render the engine poster (`src/assets/model/`) after changing the model;
  needs `npm run dev` running, drives the installed Chrome.

## Design source of truth

- `design/blueprint.md` is the spec: drawing language, every sheet, interaction and motion.
- `src/styles/tokens.css` holds every design token as a CSS custom property. It is the only file
  allowed to contain raw color, font, or spacing values. Everything else references `var(--...)`.
  The one exception is `@media`/`@container` breakpoints, which cannot read custom properties:
  write the number in the module, and list it in `tokens.css` as a `--bp-*` comment token.
  Lettering inside SVG drawings is sized in viewBox units, also via tokens.
- If the build must depart from the spec (accessibility, technical limit), record it in
  `design/DEVIATIONS.md` with the reason.
- Rev A, the Roman ruins dashboard, is tagged `RomanArchitecture_v1`; its handoff and spec are in
  `design/archive/roman-v1/` for reference only.

## Structure

- `src/main.tsx` - entry; imports global CSS in order: tokens, base, motion.
- `src/App.tsx` - composes the sheets in page order and owns page state (selected project, the
  part or layer in focus).
- `src/sections/*.tsx` - one component per sheet (CoverSheet, Overview, Work, Career,
  BillOfMaterials, Education, Footer), each with a sibling `*.module.css`.
- `src/components/model/` - the cover's engine: `engine.ts` (numbers, no three), `engineParts.ts`
  (the shapes) and `engineScene.ts` (the scene), both in the lazy chunk; `EngineModel`,
  `FeatureTree`, `ModelStatus`; `parts.ts` (what each part stands for); `palette.ts` (finishes
  from the tokens). `src/assets/model/` holds the poster, the scene's first frame as WebP.
- `src/components/*.tsx` - shared pieces (Schematic, Gallery, Timeline, ...);
  `src/components/drawing/` - drafting primitives (Sheet, Dimension, RevisionCloud).
- `src/assets/shots/` - live-site screenshots and `manifest.json`; `src/assets/shots.ts`
  resolves them.
- `src/data/resume.ts` - all copy and content, typed. Components read from it and never hardcode
  text.
- `src/styles/tokens.css`, `base.css`, `motion.css` - global.
- `public/` - static assets (favicon, fonts, social image, the downloadable résumé).
- `design/` - spec, deviations, archive.

## Conventions

- Path alias `@/` maps to `src/`.
- Semantic HTML: `header`, `main`, `section`, `article`; headings in order; exactly one `h1`.
- CSS Modules, mobile-first media queries, `clamp()` for fluid type and space.
- Fonts: IBM Plex, self-hosted in `public/fonts/` with `font-display: swap`; preload the cover
  sheet's faces in `index.html`.
- Images: `width` and `height` attributes always set; `loading="lazy"` below the fold.
- Accessibility: WCAG AA contrast on the paper, visible focus states, respects
  `prefers-reduced-motion`. All motion lives inside
  `@media screen and (prefers-reduced-motion: no-preference)` and may only hide content under
  `html[data-js]` (CSS that ends visible) or `html[data-motion]` (set by `src/lib/useReveal.ts`
  after hydration). Nothing animates from a hidden state that the server output does not end in.
- Performance: the cover's largest paint is the engine poster, so it never fades in. Below-the-fold
  sheets hydrate in their own tasks (Suspense boundaries in `App.tsx`). The 3D scene builds in
  steps that yield to the page and keeps every task short; keep it that way.
- Print: keep the `@media print` rules working so the page prints as a clean resume.
- No JS-dependent content. Interaction and motion are progressive enhancement only: an inline
  script sets `<html data-js>` before first paint, and only CSS under `[data-js]` may collapse
  or hide content. Without JavaScript every project renders expanded and every drawing drawn.

## Verification before reporting done

1. `npm run build` succeeds with no type errors and no warnings.
2. Check the page at 375px, 768px, and 1280px widths. No horizontal scroll at any width.
3. Compare against `design/blueprint.md` sheet by sheet.
