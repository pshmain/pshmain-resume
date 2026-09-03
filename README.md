# resume-site

Single-page résumé for Peter Shmain. Vite + React 19 + TypeScript, built for design fidelity
to the Claude Design handoff in `design/handoff.md`.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck, client build, SSR build, prerender -> dist/
npm run preview  # serve dist/ at http://localhost:4173
```

## What is in the page

- A full-viewport hero renders a short looping video (shipped as a 110-frame sprite sheet)
  through an ordered-dither dot engine on a WebGL canvas (Canvas 2D fallback), with the name
  and contact links set over it.
- A second, subtler procedural falling-ash field runs fixed behind the whole page.
- Both fields react to the cursor with a circular displacement bulge.
- Below: Profile, Selected Work, Experience, Technical Skills, Education, and a footer with a
  résumé download.

The React tree is prerendered into `dist/index.html` at build time and hydrated on load, so the
whole résumé is readable before any JavaScript runs; only the two canvases need script.

## Where things live

- `design/handoff.md` - design source of truth. `design/DEVIATIONS.md` - every deliberate
  departure from it, with the reason. `design/prototype/` - the HTML prototype the engines were
  ported from. `design/assets/` - original video and docx.
- `src/data/resume.ts` - all copy. Components never hardcode text.
- `src/styles/tokens.css` - every colour, font, spacing, radius and motion value. The only file
  allowed to contain raw values. `src/styles/base.css` - reset, globals, print.
- `src/engine/DitherEngine.ts` - both dot fields. `src/engine/DotSurface.ts` - WebGL / 2D dot
  rasteriser. `src/engine/useDitherEngine.ts` - React mount.
- `src/sections/*` - one component per page section with a sibling CSS module.
  `src/components/*` - shared shell pieces (section heading, external link, arrow icon).
- `src/assets/hero-frames.avif` / `.webp` - the hero video as an 11 fps frame sheet (imported,
  so it ships content-hashed); `src/assets/heroFrames.ts` describes the grid.
- `public/fonts/` - self-hosted Cormorant Garamond (variable) and Lora (regular, italic).
- `scripts/prerender.mjs` - bakes the rendered markup into `dist/index.html` after the build.

## Testing the production build locally

`npm run build && npm run preview`, then check 375, 768 and 1280 px widths. The hero needs no
media playback at all (the frames are a static image), so any static server works.

Deploys to Vercel as a static site. `vercel.json` pins the build command and output directory
and sets cache headers (hashed `/assets/*` immutable, `/fonts/*` a week). When the build runs
on Vercel, `scripts/prerender.mjs` reads `VERCEL_PROJECT_PRODUCTION_URL` to make `og:image`
absolute and add `og:url` and a canonical link; set `SITE_URL` to do the same elsewhere. See
`CLAUDE.md` for conventions and the verification checklist.
