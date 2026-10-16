# Deviations from the handoff

Every place the build knowingly departs from `handoff.md`, with the reason. Anything not listed
here is meant to match the handoff exactly; if it does not, that is a bug.

## Copy

The handoff's copy was taken from the résumé as it stood when the design was made. A revised
`Peter_Shmain_Resume.docx` arrived on 2026-09-02 and is what the footer button downloads, so
`src/data/resume.ts` follows the revised file rather than the handoff wherever they differ.
Four passages changed: the profile paragraph ("small startup teams", "AI tools"), the last
Provenance bullet (the PDF generator), the third CoDriverHQ bullet ("with reasoning"), and the
first Shmizzys Garage bullet ("reconditioning and reselling"). Everything else is identical.
`design/assets/` keeps the handoff-era docx for the record.

The LinkedIn link is `https://www.linkedin.com/in/peter-shmain` (display text
`linkedin.com/in/peter-shmain`), supplied 2026-09-02. The older `petershmain-4755a33b5` slug
was replaced everywhere it appeared: the handoff, the prototype, and the contact line inside
both docx files.

Since 2026-10-15:

- **Provenance has no captures and no Visit link.** Its work was internal tooling (pipeline,
  database, admin panel), so its panel leads with the "What I rebuilt" diagram and its tab card
  shows the monogram.
- **Company names drop "LLC"** (Sneakerhead, Shmizzys Garage). They now appear as card titles and
  timeline labels, where the suffix was noise.
- **Dashboard-only copy** (stat tiles, impact chips, diagram nodes, slide labels) is condensed
  from the résumé bullets and adds no new claims. CoDriverHQ's chips say "Stripe billing" rather
  than repeating the bullet's "subscription billing", because the live site sells one-time
  passes.

## Dashboard layout (replaces the handoff's single column)

On 2026-10-15 the page became a recruiter-facing dashboard: no riddle, a compact banner, stat
tiles, a tabbed Work explorer with screenshots and "how it works" diagrams, a career timeline,
and highlightable skills. `design/dashboard.md` is the spec for all of it. The handoff still
governs tokens, type, colour and both engines. Departures from it worth naming:

- **Banner, not a full-screen hero.** At least `clamp(280px, 36svh, 420px)` tall instead of
  `100svh`, and it grows on phones where the action row wraps. The name is 44-84px instead of
  56-118px. The scroll cue is gone, because the content now starts on the first screen.
- **Contact as buttons.** The hero's dotted contact line became an action row (download,
  email with copy, LinkedIn, phone). The footer keeps the handoff's contact line but drops its
  download button, since the banner and the sticky bar both carry one.
- **Wider container.** 1200px for the banner and dashboard (`--container-wide`). The footer
  keeps 920px.
- **Bullets set ragged-right** (`text-wrap: pretty`), not justified. In the narrower details
  column, justification opened rivers.
- **Experience, Selected Work and Profile sections** merged into the Work explorer and the At a
  glance row. Section numerals run I-IV from Work; At a glance has a hidden heading. Shmizzys
  Garage is not in the Work explorer (no site, nothing to show); it stays on the career
  timeline.
- **Motion.** The handoff allows no page animation beyond the scroll cue. The dashboard adds a
  first-screen entrance, scroll-in reveals, a count-up, timeline and diagram sequences, and
  hover lifts, all one-shot and all off under reduced motion and in print. See
  `design/dashboard.md`, "Motion".

## Footer colophon (addition)

A one-line colophon under the footer name explains the ruins (`colophon` in
`src/data/resume.ts`). It arrived on 2026-09-02 together with a riddle gate that locked the page
until a one-word riddle was solved or skipped. The gate was removed on 2026-10-15 so a recruiter
lands straight on the content; the colophon stays.

## Hero source: a frame sheet instead of a live video

The handoff's engine plays the mp4 once in a hidden `<video>`, captures a frame every 1/11 s
during that first pass, then loops the captured frames from memory. That first pass is a
single-shot state machine that depends on autoplay being allowed, on seeking working, and on
the tab staying visible for ten seconds; review found that a browser-initiated pause (Chrome
pauses video-only media in background tabs), a hidden tab, or a mid-play error leaves the hero
frozen on one frame with the decoder still attached.

The build does the capture at build time instead. `src/assets/hero-frames.avif` (with a `.webp`
fallback) is the same video sampled at 11 fps into 110 frames, each already cropped 7.5% per
edge and scaled to the 208x117 master size, tiled 11 x 10. At runtime the engine decodes the
image, copies each tile into an `ImageData`, patches the watermark region and pins the
auto-levels exactly as the handoff specifies, and starts the 11 fps loop with the same
8-frame crossfade. What changes:

- The loop starts as soon as the image decodes, instead of after a 10 s live pass; there is no
  live-to-loop transition to see.
- No `<video>` element, autoplay kick-off, seek pre-pass, seek timeouts, or visibility
  handling exist, and none of their failure modes.
- Bytes: AVIF 550 KB / WebP 579 KB, versus 511 KB for the transcoded mp4 the site shipped
  before. Fidelity was measured on the dithered output (share of master pixels whose dot level
  or colour bucket differs from a lossless extraction of the original 1280px source): mp4 path
  8.0% level / 44.8% dot; AVIF q65 6.5% / 41.5%; WebP q80 6.8% / 45.8%. The AVIF is strictly
  better than what the video path produced.
- Reduced motion shows the middle frame.

The original video stays in `design/assets/`; the sheet is regenerated with the ffmpeg filter
and encoder settings noted in `src/assets/heroFrames.ts`. The fidelity comparison was a one-off
Node script (sharp + the engine's Bayer/levels math over frames 0, 27, 55, 82, 109) and is not
in the repo; the numbers above are what it printed on 2026-09-02.

## Engine

- **Dots are drawn with WebGL point sprites.** The prototype filled Path2D batches on a 2D
  canvas. Measured on a 2560x1400 canvas (25k cells) that costs 20-30 ms per frame, which is
  why the cursor bulge stuttered: it re-renders on every pointer move. Point sprites with an
  antialiased disc shader draw the same centres, radii and colours in about 2 ms of GPU time
  (Intel Iris Xe). The Path2D path is kept as the fallback when WebGL is unavailable; WebGL
  support is probed on a throwaway canvas first so a failed probe cannot poison the real one.
  Cells whose centre lies past the canvas edge are skipped in both backends so their clipping
  rules never disagree.
- **Ash canvas measured from its own box.** The prototype sized the fixed ash canvas from
  `window.innerWidth`, which includes a classic scrollbar, so on Windows the ash lattice was
  squashed 15-17 px horizontally and drifted against the hero lattice. The port measures the
  canvas element itself, the same space pointer coordinates live in.
- **Idle CPU.** The prototype re-rendered the hero every animation frame while the cursor was
  anywhere over the page, even at rest. The port re-renders only when the frame, blend, canvas
  size, or the *eased* cursor position changes, and pauses hero rendering while the hero is
  scrolled out of view. The picture is identical; the work is not.
- **Touch pointers are ignored by the cursor field.** There is no cursor on touch, and a tap
  would otherwise leave the bulge frozen at the last touch point.

## Accessibility

- **No text below 55% paper.** `rgba(243,242,242,0.45)` on the page ground measures 4.01:1,
  below the WCAG AA 4.5:1 minimum for small text, so 45% colours only decorative separators and
  diagram arrows. 55% paper is 5.28:1, the gold link colour 10.6:1. Dimmed states (a skill that
  a role did not use) fade thumbnails and bars, never text below 55%.
- **`prefers-reduced-motion`.** The handoff notes the prototype does not handle it and
  recommends freezing both canvases to one dithered frame. Done: the hero shows the middle
  frame, the ash field is drawn once (it still redraws on resize and scroll so the hand-off
  boost stays in place), and the cursor field is off. Smooth anchor scrolling and the sticky
  bar's slide are off too.
- **Work explorer is a WAI-ARIA tablist** with automatic activation (arrows, Home, End). The
  tabs are links to their panels, so they still jump without JavaScript. Timeline bars and stat
  tiles are links to the same panels.
- **"Visit ↗" sits beside the `<h3>`, not inside it.** Same flex row, same visual position, but
  the heading's accessible name is just the role and company. The link's accessible name is
  "Visit <domain> (opens in a new tab)".
- **Contact rows are lists** (`role="list"`, since `list-style: none` drops list semantics in
  Safari). The `·` separators are CSS pseudo-elements, so assistive tech reads three links
  rather than three links and two dots. Ghost numerals, the em-dash bullets, the arrows, icons
  and both canvases are `aria-hidden`.
- **The hero is a `<header>`.** It holds the page's one `<h1>` and contact links; `<main>` holds
  the body sections. Each section is labelled by its `<h2>`.
- **External links use `rel="noopener noreferrer"`**; the handoff says `noopener`.

## Assets

- **Fonts self-hosted.** Cormorant Garamond (variable, 300-700) and Lora (400 regular and
  italic) are served from `public/fonts/` as latin subsets, per the repo convention, instead of
  the Google Fonts stylesheet. Same files Google serves.
- **"↗" is an inline SVG.** Neither Cormorant nor Lora carries U+2197, so the handoff's text
  glyph would fall back to whatever symbol font the visitor's OS has. The SVG is sized `1em`,
  so it takes the surrounding text size exactly as the glyph would (13px in the cards, 12px in
  "Visit"), stroked in the same accent colour.
- **Favicon and social image** are additions: `favicon.svg` plus PNG fallbacks (Safari does
  not render SVG tab icons), an `apple-touch-icon`, and a 1200x630 `og-image.png` drawn from
  the same tokens and fonts. `scripts/prerender.mjs` makes `og:image` absolute and adds
  `og:url` plus a canonical link when `SITE_URL` or Vercel's production URL is set at build
  time; a local build leaves it relative.

## Small screens

The dashboard's responsive rules are in `design/dashboard.md`. Two older notes still apply:

- **Contact separators trail their item** (`li:not(:last-child)::after`) rather than leading
  the next one, so a wrapped row ends with `·` instead of starting a line with it.
- **Viewport units are `svh`, never `dvh`.** On phones `dvh` follows the address bar, so a
  `dvh`-sized hero grew while the bar collapsed mid-scroll and the browser's scroll anchoring
  then snapped the page to compensate, which read as the screen teleporting once the scroll
  stopped. `svh` is the height with the bar showing and never changes during a gesture. The
  banner's height and the body's minimum height both use it.

## Type

- **Font sizes in rem.** Every px size in the handoff is expressed as its rem equivalent at the
  16px default, so the page renders pixel-identical at default settings and still respects a
  visitor's browser font-size preference.
- **Body baseline 15px.** The Classical system's `body { font-size: 15px }` is reproduced so
  unstyled glyphs (the em-dash bullets) match the prototype.

## Print

- Canvases, the download buttons, the sticky bar, tab cards, galleries, diagrams, the timeline
  and every control are hidden. Every role prints expanded with its bullets, and skills print
  as comma-separated text. The tokens re-theme to ink on paper; articles and bullets avoid page
  breaks.

## Delivery

- **Prerendered HTML.** The React tree is baked into `dist/index.html` at build time and
  hydrated on load, so the full résumé is present before any JavaScript runs (repo rule: no
  JS-dependent content). An inline script sets `<html data-js>` before first paint, and only
  under it do panels and slides collapse into the interactive layout. Without JavaScript every
  role and slide shows expanded. The canvases, copy buttons and sticky bar are the only
  JavaScript-dependent elements.
- **`color-mix()` fallback.** Browsers without `color-mix()` get the same colours pre-mixed
  from a `@supports not` block in `tokens.css`; without it the page ground fell back to white
  under paper-coloured text.
