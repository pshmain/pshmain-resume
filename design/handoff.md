# Handoff: Peter Shmain — Résumé Website

## Overview
A single-page personal résumé site. A full-viewport hero renders a short looping video (golden Roman ruins, falling ash) through a real-time **ordered-dither dot engine** on `<canvas>`, with the name and contact links set over it. Below, the résumé body (Profile, Selected Work, Experience, Technical Skills, Education, Footer) sits on a deep warm near-black ground with a second, subtler **procedural falling-ash dither** running fixed behind the whole page. Both dot fields react to the cursor with a circular displacement bulge.

## About the Design Files
The files in this bundle are **design references built in HTML** — a working prototype showing the intended look and behavior, not production code to copy verbatim. Recreate this design in the target codebase's existing environment (Next.js/React is the natural fit given the résumé's stack) using its patterns. The two canvas engines are plain JavaScript in `Resume.dc.html` (the `class Component` block) and port directly to a `useEffect`/ref-based React component or a vanilla module. If no codebase exists yet, a static Next.js or Astro site is appropriate.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy, and interactions are final. Recreate pixel-accurately, taking values from the token table below.

---

## Global

- **Page ground:** `color-mix(in srgb, #2d2b2b 78%, black)` ≈ `#232121` on `<html>`. `<body>` is transparent so the fixed ash canvas shows through.
- **Body text color:** `#f3f2f2` (paper).
- **Links:** `#facb8d` default, `#ffe3bf` hover, no underline unless noted.
- **Fonts:** Cormorant Garamond (headings), Lora (body) — Google Fonts. Never bolder than 600.
- **Container:** `max-width: 920px; margin: 0 auto; padding-inline: clamp(20px, 5vw, 72px)`.
- **Hairline rule:** `1px solid color-mix(in srgb, #f3f2f2 15%, transparent)`.
- **Layering (z-index):** ambient ash canvas `position:fixed; inset:0; z-index:-1` → hero video canvas `position:absolute; z-index:-1` inside the hero → all content on top.

---

## Screens / Views

### 1. Hero (`100dvh`, `min-height: 560px`)
- `position: relative; cursor: crosshair`. No background of its own (page ground shows through).
- **Video dither canvas:** absolute, fills hero, `opacity: 0 → 1` over `1.4s ease` once the first frame renders. `pointer-events: none`.
- **Vignette overlay:** absolute, full-bleed, `radial-gradient(72% 68% at 16% 84%, color-mix(#2d2b2b 80%, black) 10%, transparent 60%)` — darkens the lower-left behind the name.
- **Name block** — absolute, `bottom: clamp(24px, 6vh, 64px)`, inside the 920px container, column flex, `gap: 18.4px`, left-aligned:
  - `h1` "Peter Shmain": Cormorant Garamond 400, `clamp(56px, 8.5vw, 118px)`, `line-height: 0.95`, `letter-spacing: -0.015em`, color `#f3f2f2`, `text-wrap: balance`.
  - Rule: `72px × 1px`, `#b68235`.
  - Subtitle: Lora italic, `clamp(15px, 1.4vw, 19px)`, `rgba(243,242,242,0.68)`. Copy: "Full-Stack Engineer — Los Angeles, CA" (city non-wrapping).
  - Contact row: Lora 13px, `letter-spacing: 0.02em`, `rgba(243,242,242,0.62)`, flex-wrap, `gap: 9.2px`, `·` separators. Links: `mailto:petershmain@gmail.com`, `tel:+13234224866` "(323) 422-4866" (tabular nums, nowrap), `https://www.linkedin.com/in/peter-shmain` "LinkedIn" (new tab).
- **Scroll cue** — absolute, `right: clamp(20px, 5vw, 72px); bottom: clamp(24px, 6vh, 64px)`, column flex centered, `gap: 9.2px`, `pointer-events: none`:
  - Label "Scroll": Lora 11px, uppercase, `letter-spacing: 0.24em`, `writing-mode: vertical-rl`, `rgba(243,242,242,0.75)`.
  - Track: `2px × 64px`, `rgba(243,242,242,0.22)`, `overflow: hidden`, `border-radius: 1px`.
  - Runner: `2px × 28px`, `#facb8d`, `box-shadow: 0 0 8px #b68235`, `animation: scrollDrift 2.2s ease-in-out infinite`.
  - `@keyframes scrollDrift { 0%,15% { translateY(-28px); opacity:0 } 35% { opacity:1 } 75% { opacity:1 } 100% { translateY(64px); opacity:0 } }`

### 2. Body (`<main>`, 920px container, `padding-top: clamp(40px, 7vh, 88px)`)
Every section: `padding: 27.6px 0 36.8px`, hairline `border-top` (Profile has none, `padding-top: 18.4px`).

**Section heading pattern** — flex row, `align-items: baseline; gap: 13.8px; margin-bottom: 18.4px` (Experience: `9.2px`; Selected Work: `27.6px`):
- Ghost numeral (I, II, III, IV, V): Cormorant 400, 52px, `line-height: 0.75`, `letter-spacing: -0.02em`, `tnum`, color `rgba(182,130,53,0.38)`.
- `h2`: Cormorant 600, 27px, `letter-spacing: -0.015em`.

**I · Profile** — one paragraph, Lora 16px, `line-height: 1.7`, justified, `hyphens: auto`, `max-width: 68ch`:
> As a full stack developer on small scrappy startup teams, my primary experience has been full ownership from scoping to shipping. I am well versed in AI and have made it my mission to be as efficient and effective with Claude Code and Cursor as possible.

**II · Selected Work** — `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18.4px`. Each card is an `<a target="_blank" rel="noopener">`:
- `display:flex; flex-direction:column; gap:13.8px; padding:27.6px; border:1px solid rgba(243,242,242,0.18); border-radius:4px; background:rgba(45,43,43,0.22); color:inherit; text-decoration:none; transition: border-color .25s, background .25s`.
- Hover: `border-color:#b68235; background: color-mix(#b68235 10%, transparent)`. Focus-visible: `outline:2px solid #b68235; outline-offset:2px`.
- Top row (space-between, baseline): kicker Lora 10.5px uppercase `letter-spacing:0.16em` `#facb8d`; arrow "↗" Lora 13px `#facb8d`.
- Title `h3`: Cormorant 600, 26px, `line-height:1.05`, `letter-spacing:-0.01em`.
- Blurb: Lora 14px, `line-height:1.6`, `rgba(243,242,242,0.68)`, `text-wrap: pretty`.
- Domain: `margin-top:auto; padding-top:9.2px`, Lora 12px, `rgba(243,242,242,0.45)`.

| Kicker | Title | Blurb | URL / domain |
|---|---|---|---|
| Full-Stack Engineer | Provenance | Ordination-documents suite rebuilt as a first-party pipeline, cutting delivery time by two-thirds on a $750K revenue line. | https://provenance.co/ |
| Co-Founder | CoDriverHQ | AI car-buying advisor on Next.js, PostgreSQL, Stripe, and the Claude API — from buyer profiling to live listing analysis. | https://codriverhq.com/ |
| Full-Stack Engineer | Sneakerhead | Ecommerce storefront with Stripe checkout and a real-time Clover POS inventory sync for a Melrose vintage clothing brand. | https://sneakerheadmelrose.com/ |

**III · Experience** — four `<article>`s, each `padding: 27.6px 0` with hairline `border-top` (first has none; last has no bottom padding).
- Header row: flex, wrap, space-between, baseline, `gap: 9.2px 18.4px`.
  - `h3`: Cormorant 600, 21px; flex row `gap:13.8px` so the optional "Visit ↗" link sits inline — Lora 400 12px uppercase `letter-spacing:0.08em`, `border-bottom:1px solid rgba(182,130,53,0.45)`, hover border `#ffe3bf`. Present on Provenance, CoDriverHQ, Sneakerhead (same URLs as cards).
  - Date: Lora 12px uppercase `letter-spacing:0.08em` `tnum` `rgba(243,242,242,0.55)`.
- Location line: Lora italic 13px `rgba(243,242,242,0.55)`, `margin: 4.6px 0 13.8px`.
- Bullets: `ul` no markers, column flex `gap:13.8px`, `max-width:74ch`. Each `li` is a flex row `gap:13.8px` with an em-dash "—" in `#b68235` then Lora 14.5px, `line-height:1.65`, justified, `hyphens:auto`.

Copy (verbatim):

*Full-Stack Engineer · Provenance* — Remote — AUG 2025 — PRESENT
- Lead developer on the ordination-documents suite. Rebuilt a failing third-party pipeline handling a significant amount of the company's customers and revenue into a first-party system, cutting document processing and delivery time by roughly two-thirds on a $750K annual revenue line.
- Scoped and prioritized work directly with the CTO and Head of Product. Continuously cross collaborated across the organization in order to pivot to most needed ongoing product improvements.
- Consolidated customer records scattered across three disconnected third-party tools into one first-party database, migrating all historical data and eliminating the duplicate shipments and multi-month backlogs the old system produced.
- Created a native intake flow to replace the third-party form, cutting redundant customer service questions and adding the validation, error handling, and data structuring the old form lacked.
- Built the admin panel the team now runs the product on, covering order tracking, search, and status management, plus secure customer document uploads.
- Fixed a PDF generator that was exhausting server memory and producing blank shipping labels, reworking it to merge every document for an order into one printable batch.

*Co-Founder & Full-Stack Engineer · CoDriverHQ* — Los Angeles, CA — JAN 2025 — PRESENT
- Co-founded an AI-powered car-buying advisor that educates buyers from research through deal analysis, aggregating data on nearly every vehicle on the market and distilling it into what each buyer actually needs.
- Built the product end to end on Next.js, TypeScript, PostgreSQL, Stripe, and the Claude API, covering architecture, data model, authentication, and subscription billing.
- Designed the schema and user-profiling system behind the recommendation engine. A guided intake builds a buyer profile, then batched API calls evaluate live listings on price, history, and market trends, returning matches with plain-language reasoning.
- Wrote a streaming chat assistant that walks buyers through car-buying topics it hasn't covered yet, with guardrails that keep it on-topic and resistant to off-domain misuse.

*Full-Stack Engineer · Sneakerhead LLC* — Los Angeles, CA — OCT 2024 — DEC 2025
- Designed and built several ecommerce platforms for a brick-and-mortar vintage clothing brand, covering storefront, catalog, search and filtering, cart, and Stripe checkout on a photo-heavy mobile-first catalog.
- Set up a real-time inventory sync between the in-store Clover POS and the web catalog, running every 10 minutes so a sale on either channel updates availability on the other.
- Maintained an active catalog of thousands of items, handling schema mapping, deduplication, and data integrity across both systems, while owning hosting, deploys, and monitoring.

*Co-Founder & Operator · Shmizzys Garage LLC* — Los Angeles, CA — AUG 2022 — NOV 2024
- Co-founded and ran an independent dealership acquiring, reconditioning, and reselling vehicles, applying a mechanical engineering background to scope repairs and performance modifications while running acquisition, pricing, and vendor negotiation.
- Automated inventory, cost, and margin tracking to replace manual record-keeping, which became the entry point into software engineering.

**IV · Technical Skills** — two-column grid `minmax(130px,190px) 1fr`, `column-gap: 27.6px`; each row `padding: 13.8px 0`, hairline `border-top`. Label: Lora 11px uppercase `letter-spacing:0.12em` `#facb8d`. Value: Lora 14.5px `line-height:1.6`.
- Frontend — React, Next.js, TypeScript, JavaScript, Tailwind, HTML/CSS
- Backend — Node.js, Express, Sequelize, Prisma, REST APIs
- Databases — PostgreSQL, MySQL, Supabase
- Cloud & Tools — AWS S3, Vercel, Docker, CircleCI, Git, Stripe, Clover POS API
- AI Engineering — Claude API, LLM application architecture, structured outputs, reliability handling
- AI-Assisted Dev — Claude Code and Cursor in daily production work

**V · Education** — header row as in Experience: `h3` "California State University, Northridge" / date "CLASS OF 2022"; line below: Lora italic 14px `rgba(243,242,242,0.68)` "Mechanical Engineering".

### 3. Footer
`margin-top: 27.6px`, hairline `border-top`, `padding: 51.5px clamp(20px,5vw,72px) 44px`. Inner: 920px, column flex, centered, `gap: 18.4px`, text-align center.
1. Rule `44px × 1px` `#b68235`.
2. "Peter Shmain" — Lora 11px uppercase `letter-spacing:0.18em` `rgba(243,242,242,0.72)`.
3. **Download button** — `<a href="Peter_Shmain_Resume.docx" download>`: inline-flex, `gap:13.8px; padding:13.8px 27.6px; border:1px solid #b68235; border-radius:2px; margin-top:9.2px`. Text "Download résumé" Cormorant 600 18px `letter-spacing:0.01em` color `#f3f2f2`. Leading Lucide `download` icon 16px, stroke `#b68235`, stroke-width 1.75. Hover: `background: color-mix(#b68235 16%, transparent); color:#ffe3bf`. Focus-visible: 2px `#b68235` outline, offset 2px.
4. Contact row — Lora 13px, centered wrap, `gap: 9.2px`, separators `rgba(243,242,242,0.45)`: email, phone, `linkedin.com/in/peter-shmain` (same hrefs as hero; links `#facb8d` → `#ffe3bf`).

---

## Interactions & Behavior

### Video dither engine (hero canvas)
Source: `uploads/Dense_ash_falls_continuously_o.mp4` (~10s, muted, playsinline, autoplay). Port the `render()` / `loop()` / `boot()` methods from `Resume.dc.html`.
1. **Pre-processing:** crop 7.5% off every edge (source has a baked-in parchment border). Downsample to a 208px-wide master buffer (`willReadFrequently`). Watermark patch: the bottom-right region (x ≥ 75%, y ≥ 85% of the master) is overwritten by cloning the strip directly above it, every frame.
2. **Auto-levels:** sample 5 spread frames once, take luma 2nd/98th percentiles → `lo/hi`; normalize every pixel by them.
3. **Capture & loop:** during the first live play, push a frame every 1/11 s (cap 16 s). On `ended`, release the video and play the captured frames at **11 fps** forever, crossfading the last 8 frames into the first 8 so the loop has no seam.
4. **Dither:** grid cell `pixelSize` = 8 css px × devicePixelRatio (DPR capped at 2). Per cell: cover-fit sample from the master, luma → normalized `v`; contrast `v=(v-0.5)*1.22+0.5`; cells with `v ≤ 0.02` skipped; **8×8 Bayer** threshold matrix with `levels = 5` tone steps; quantized level `q` → dot radius `p*0.34*0.85*(q/4)`; dots grouped by color+level into `Path2D` batches and filled. Vertical feather: the bottom 10% of the hero fades `v` to zero with smoothstep.
5. **Dot color (`inkMode: "sampled"`):** the source pixel's RGB quantized to 16 levels per channel (`(c & 240) + 8`). Alternates offered as tweaks: `blended` (25% source / 75% `#b68235`), `gold` (flat `#b68235`), `paper` (flat `#f3f2f2`).
6. **Cursor field:** pointer tracked window-wide, position eased at `dt*9`, strength eased `dt*5` on enter/leave. Within radius `R = 0.6·max(W,H)`, sampling coordinates are pushed **radially away** from the cursor by `smoothstep(1 - d/R) · 0.055R · strength / d · (dx,dy)` — a circular bulge, no directional bias.
7. Re-render only when frame index, blend alpha, canvas size, or tweak values change, or while the cursor field is active.
8. **Autoplay fallback:** if `play()` rejects, extract frames by seeking at 11 fps instead.
9. Re-measure canvas on `ResizeObserver` and on the first RAF if mounted at zero width.

### Ambient ash engine (fixed full-page canvas)
- Particle count = `viewportArea / 5000`. Each: random x, fall speed 14–40 px/s, sine sway amplitude 6–24 px at 0.15–0.55 Hz, radius 0.8–2.0 cells, tone 0.55–1.0. Respawn at top when past bottom.
- Stepped at 11 fps (same cadence as the hero). Particles splat a Gaussian (σ² = 0.45·r²) into a cell grid at the same `pixelSize`; grid values clamp to 1.
- **Hand-off boost:** within a band from 25% above to 50% below the hero's bottom edge (page coordinates, so it scrolls with the seam), particle weight is multiplied by `1 + 2·smoothstep` peaking exactly at the boundary — the ambient ash is densest where the video field feathers out, so the two fields cross-dissolve.
- Same 8×8 Bayer dither, 3 tone levels → dot colors `#5a3b0a` (q=1), `#7d5411` (q=2), `#c28d41` (q=3); radius `p*0.34*0.85*(q/3)`.
- Same circular cursor field, but particles are pushed **away** in screen space.
- `ashDensity` tweak 0–2 (0 hides the layer). Redraws when stepping, on cursor activity, or when `scrollY` changes by ≥ 24 px.

### Other
- All external links open in a new tab (`target="_blank" rel="noopener"`).
- Download button triggers a native download of the bundled `.docx`.
- Card/link hover transitions `0.25s ease`. No other page animation besides the scroll cue.
- `prefers-reduced-motion`: not handled in the prototype — recommend freezing both canvases to a single dithered frame and hiding the scroll-cue runner.

## State Management
Static content; no data fetching. Engine state (frames buffer, loop index, pointer, particles) lives in the component instance/refs, not React state. Tweak props (see below) are read each render.

## Design Tokens (Classical design system, `styles.css`)
- **Colors:** bg/paper `#f3f2f2`; text (light-mode) `#201f1d`; accent `#b68235`; accent-200 `#ffe3bf`; accent-300 `#facb8d`; accent-500 `#c28d41`; accent-700 `#7d5411`; accent-800 `#5a3b0a`; neutral-900 `#2d2b2b`; page ground `color-mix(#2d2b2b 78%, black)`.
- **Type:** heading "Cormorant Garamond" (400 display / 600 interface), body "Lora". Tabular figures (`font-feature-settings:'tnum'`) on dates, numerals, phone.
- **Spacing:** 1 = 4.6px, 2 = 9.2px, 3 = 13.8px, 4 = 18.4px, 6 = 27.6px, 8 = 36.8px.
- **Radius:** sm 2px, md 4px.
- **Rules:** 1px, paper at 15–18% alpha on the dark ground.
- **Focus:** `outline: 2px solid #b68235; outline-offset: 2px`.

## Tweakable props (prototype)
`pixelSize` 5–16 (8), `dotScale` 0.6–1 (0.85), `levels` 2–6 (5), `contrast` 0–60 (22), `invert` (false), `inkMode` sampled|blended|gold|paper, `ashDensity` 0–2 (1). Expose as component props or drop to constants.

## Assets
- `Dense_ash_falls_continuously_o.mp4` — hero source video (user-supplied, AI-generated; carries a bottom-right watermark that the engine patches out).
- `Peter_Shmain_Resume.docx` — the downloadable résumé.
- Lucide `download` icon (inline SVG in the footer button).
- Fonts: Cormorant Garamond + Lora via Google Fonts.
- `_ds/…/styles.css` — Classical token sheet (only the variables listed above are used).

## Files
- `Resume.dc.html` — the full prototype: markup (`<x-dc>` body) and both canvas engines (`class Component`). Requires `support.js` (prototype runtime) and the `_ds/` folder to open locally.
- `support.js`, `_ds/classical-…/styles.css`, `_ds/classical-…/_ds_bundle.js` — runtime + design-system files needed to open the prototype.
- `uploads/Dense_ash_falls_continuously_o.mp4`, `Peter_Shmain_Resume.docx` — assets.
