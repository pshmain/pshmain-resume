# resume-site

Single-page resume website for Peter Shmain. Design fidelity is the priority.

## Stack

- Vite + React 19 + TypeScript (strict). CSS Modules for component styles, plain CSS for globals.
- No UI library, no CSS framework, no state library. Add nothing unless the handoff requires it.
- Node 20.19 or newer (Vite 8's floor; `engines` in `package.json`). Vercel builds on its current
  default. Package manager: npm.
- Output is static (`dist/`). Deploy target: Vercel.

## Commands

- `npm run dev` - dev server with HMR at http://localhost:5173.
- `npm run build` - typecheck, then production build to `dist/`. Must pass before any change is
  reported as done.
- `npm run preview` - serve the production build locally.
- `npm run typecheck` - tsc only.

## Design source of truth

- `design/handoff.md` is the Claude Design handoff. It defines colors, type, spacing, layout, and copy.
- `src/styles/tokens.css` holds every design token as a CSS custom property. It is the only file
  allowed to contain raw color, font, or spacing values. Everything else references `var(--...)`.
  The one exception is `@media` breakpoints, which cannot read custom properties: write the
  number in the module, and list it in `tokens.css` as a `--bp-*` comment token.
- If a deviation from the handoff is necessary (accessibility, technical limit), record it in
  `design/DEVIATIONS.md` with the reason.

## Structure

- `src/main.tsx` - entry; imports global CSS in order: tokens, base.
- `src/App.tsx` - composes sections in page order.
- `src/sections/*.tsx` - one component per page section (Hero, Experience, Skills, ...), each with a
  sibling `*.module.css`.
- `src/data/resume.ts` - all copy and content, typed. Components read from it and never hardcode text.
- `src/styles/tokens.css`, `src/styles/base.css` - global.
- `public/` - static assets (favicon, fonts, images).
- `design/` - handoff and exported design assets.

## Conventions

- Path alias `@/` maps to `src/`.
- Semantic HTML: `header`, `main`, `section`, `article`; headings in order; exactly one `h1`.
- CSS Modules, mobile-first media queries, `clamp()` for fluid type and space where the handoff gives
  min and max sizes.
- Fonts: self-host in `public/fonts/` with `font-display: swap`; preload the display face in
  `index.html`.
- Images: `width` and `height` attributes always set; `loading="lazy"` below the fold.
- Accessibility: WCAG AA contrast, visible focus states, respects `prefers-reduced-motion`.
- Print: keep the `@media print` rules in `base.css` working so the page prints as a clean resume.
- No JS-dependent content. Motion and interaction are progressive enhancement only.

## Verification before reporting done

1. `npm run build` succeeds with no type errors and no warnings.
2. Check the page at 375px, 768px, and 1280px widths. No horizontal scroll at any width.
3. Compare against the handoff section by section.
