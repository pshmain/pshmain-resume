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

## Riddle gate (addition)

The handoff has no gate and says the scroll cue is the page's only animation. Added 2026-09-02
at the owner's request: the page opens locked behind a one-word riddle, and the résumé appears
only once it is solved or skipped. Copy lives in `src/data/resume.ts` (`gate`, `colophon`);
the component is `src/components/Gate.tsx`; the state is `<html data-gate>`.

- **Locked look.** The ruins are not drawn at all. Only the ambient ash runs, at density 1.8
  instead of 1, over a faint ember glow centred under the card (`--color-ember`). The cursor
  field is off, the hero's crosshair cursor is dropped, and the hero name block, scroll cue,
  `<main>` and footer are `visibility: hidden` (which also removes them from tab order and
  assistive tech). Scrolling is disabled; `scrollbar-gutter: stable` keeps the scrollbar's
  space reserved so opening the gate causes no layout shift and no ash reseed.
- **Card.** Dead centre, 440px (520px for the reveal), the work-card border and radius on a
  90% ground. Kicker, riddle in Cormorant 400 at 21-24px, a 16px text field (smaller makes iOS
  zoom), the footer-button style for Enter, and "Hint · Skip the riddle" in the Experience
  "Visit" style. The hint opens on hover, focus, or tap, anchored under the card. Near-miss
  answers get a nudge line; anything else gets "Not quite." Escape closes the hint, then skips.
- **Reveal.** Solving or skipping swaps the card to the answer and the explanation with an
  Enter button. Then: card recedes over `--duration-gate` (1.4s); the ruins fade in over
  `--duration-reveal` (2.4s) while the engine eases the ash back to density 1 and the ember
  fades; the page text fades in over 1.4s starting `--delay-gate-content` (0.8s) later.
  Scrolling and the cursor field return as the ruins begin. With the gate open the hero
  canvas fade uses 2.4s instead of the handoff's 1.4s; ungated loads keep 1.4s.
- **Persistence.** Once per browser tab session (`sessionStorage`), so a refresh stays open and
  a new visit locks again. Any URL with a hash bypasses the gate, so links straight to a
  section work as sent.
- **Delivery.** The lock is set before first paint by an inline script in `index.html`, so
  the prerendered résumé never flashes. Without JavaScript the attribute never appears and the
  full page renders. Print ignores the gate entirely. The gate's markup is identical on the
  server and the client, so hydration is unaffected.
- **Engine.** `DitherEngine.setGate()` skips hero rendering, ignores the pointer, and eases the
  ash density; the hero canvas now reveals through a `data-shown` attribute (CSS) instead of
  an inline opacity, so the gate's stylesheet can hold it dark. The reveal duration is read
  from the `--duration-reveal` token so CSS and the engine cannot drift.
- **Footer.** A one-line colophon explaining the ruins sits under the name, for anyone who
  arrives past the gate.

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

- **Card domain line: 50% paper instead of 45%.** `rgba(243,242,242,0.45)` on the page ground
  measures 4.01:1, below the WCAG AA 4.5:1 minimum for 12px text. 50% measures 4.62:1 and is the
  lowest alpha that passes. The footer's 45% is kept: it colours only the decorative `·`
  separators there. Every other text colour in the handoff passes (55% paper is 5.28:1, the
  gold link colour is 10.6:1).
- **`prefers-reduced-motion`.** The handoff notes the prototype does not handle it and
  recommends freezing both canvases to one dithered frame and hiding the scroll-cue runner.
  Done: the hero shows the middle frame, the ash field is drawn once (it still redraws on
  resize and scroll so the hand-off boost stays in place), the cursor field is off, and the
  runner is hidden.
- **"Visit ↗" sits beside the `<h3>`, not inside it.** Same flex row, same visual position, but
  the heading's accessible name is just the role and company. The link's accessible name is
  "Visit <company> (opens in a new tab)".
- **Contact rows are lists** (`role="list"`, since `list-style: none` drops list semantics in
  Safari). The `·` separators are CSS pseudo-elements, so assistive tech reads three links
  rather than three links and two dots. Ghost numerals, the em-dash bullets, the arrows, the
  scroll cue and both canvases are `aria-hidden`.
- **The hero is a `<header>`.** It holds the page's one `<h1>` and contact links; `<main>` holds
  the five body sections. Each section is labelled by its `<h2>`.
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

The handoff gives one layout for every width. Three places needed a phone rule; each kicks in
only below the width where the handoff's layout stops working, and above it nothing changes.

- **Skills stack below 560px.** The two-column `minmax(130px, 190px) 1fr` grid left a 177px
  value column at 375px, wrapping "React, Next.js, TypeScript, JavaScript, Tailwind, HTML/CSS"
  onto five lines. Below 560px the label sits above its value.
- **Hero name block keeps 40px clear of the scroll cue below 640px.** Both sit on the hero's
  bottom edge; at 375px the contact row otherwise runs into the cue's vertical label. A side
  effect: below about 363px of layout width (a 360px phone, or 375px with a desktop scrollbar)
  "Peter Shmain" wraps onto two balanced lines. At a true 375px phone it stays on one.
- **Contact separators trail their item** (`li:not(:last-child)::after`) rather than leading
  the next one, so a wrapped row ends with `·` instead of starting a line with it.
- **Hero height is `100svh`, not the handoff's `100dvh`.** On phones `dvh` follows the address
  bar, so the hero grew while the bar collapsed mid-scroll and the browser's scroll anchoring
  then snapped the page to compensate, which read as the screen teleporting once the scroll
  stopped. `svh` is the height with the bar showing and never changes during a gesture. With
  the bar collapsed the hero is shorter than the screen by the bar's height; the strip below it
  is the same ground and ash, so nothing reads as a gap. The body's minimum height follows.

## Type

- **Font sizes in rem.** Every px size in the handoff is expressed as its rem equivalent at the
  16px default, so the page renders pixel-identical at default settings and still respects a
  visitor's browser font-size preference.
- **Body baseline 15px.** The Classical system's `body { font-size: 15px }` is reproduced so
  unstyled glyphs (the em-dash bullets) match the prototype.

## Print

- Canvases, the scroll cue and the download button are hidden; the tokens re-theme to ink on
  paper; articles and bullets avoid page breaks.

## Delivery

- **Prerendered HTML.** The React tree is baked into `dist/index.html` at build time and
  hydrated on load, so the full résumé is present before any JavaScript runs (repo rule: no
  JS-dependent content). The canvases are the only JavaScript-dependent elements.
- **`color-mix()` fallback.** Browsers without `color-mix()` get the same colours pre-mixed
  from a `@supports not` block in `tokens.css`; without it the page ground fell back to white
  under paper-coloured text.
