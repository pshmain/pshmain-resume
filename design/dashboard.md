# Dashboard layout (2026-10-15)

The page was rebuilt as a recruiter-facing dashboard. It is still one page built in the same
Classical system: `handoff.md` keeps governing tokens, type, colour, and the two dither engines,
and this file governs layout, interaction and motion. Where they disagree on layout, this file
wins.

The reader is a recruiter at a large company who has a few seconds per candidate. Everything
they look for is visible without solving, hunting, or leaving the page: role and location,
impact numbers, the work itself (screenshots and how it was built), tenure, stack, and a
contact route that stays one click away.

## Page order

1. **Banner** (`<header>`): the ruins hero, compacted.
2. **At a glance**: profile paragraph and four stat tiles. Its `h2` is visually hidden.
3. **I · Work**: one tab card per showcased role, then the selected role's panel.
4. **II · Career** (timeline) and **IV · Education** in the left column, **III · Skills** in the
   right column, from 1100px up. Stacked as Career, Skills, Education below that.
5. **Footer**: name, colophon, contact line. No download button: the banner and the sticky bar
   already carry it.
6. **Sticky bar**: slides in at the top once the banner has scrolled away.

The dashboard container is `--container-wide` (1200px) with the existing gutter. The footer
keeps the 920px container. Sections are separated by a hairline and `--space-6` above and below.

## Banner

- At least `--banner-height` (`clamp(280px, 36svh, 420px)`) tall, with `--banner-padding-top` of
  ruins showing above the name; it grows on phones, where the action row wraps. Same canvas,
  vignette and engine as the hero. The engine's feather and the ash hand-off follow the hero's
  bottom edge, so the seam still dissolves. No scroll cue: the content starts on the first
  screen.
- Name block in normal flow at the bottom-left: `h1` at `--text-h1` (`clamp(44px, 6vw, 84px)`),
  the 72px gold rule, subtitle.
- **Action row** below the subtitle, wrapping. **Download résumé** is the primary button
  (Cormorant 600, 17px, gold border). Email (with a copy button that says "Copied" for 2s),
  LinkedIn and phone are quiet buttons: hairline border, paper text, gold icon. Icons are Lucide
  at 16px, stroke 1.75.

## At a glance

- At 1100px and up: a grid of `4fr 8fr`, profile on the left and tiles on the right, four across.
  Below 1100px the profile sits above the tiles, two across under 768px.
- **Stat tile**: work-card border, radius and background. The value is Cormorant 600 at
  `--text-stat` (`clamp(32px, 3.2vw, 44px)`) with proportional figures. The label is Lora 13px,
  68% paper, sentence case. A `→` in a value is drawn as an inline SVG arrow, because neither
  face carries U+2192.
- Each tile is a link to the role panel its number comes from (`#work-<id>`). With JavaScript,
  clicking a tile selects that role, scrolls its source bullet into view and marks it
  (`--color-mark` background, gold left rule) until another selection is made.

## I · Work

- Only roles with a `showcase` in `src/data/resume.ts` appear: Provenance, CoDriverHQ and
  Sneakerhead. Shmizzys Garage has no site or showcase and appears only on the career timeline.
- **Tab cards**: three across from 560px, each a thumbnail (2:1 crop from the top of the
  capture), a kicker (role), a Cormorant 600 title (company), "formerly …" where it applies,
  and the dates. Below 560px each card is a row: thumbnail beside text. A missing capture falls
  back to the role's monogram on a dotted field in the dither palette.
  - **Nothing looks selected on load.** The first role's panel shows, but every card starts in
    the same quiet state. Once the visitor picks a role (card, timeline bar, stat tile or a
    `#work-<id>` link), its card gets a gold border, a 2px gold bar along the top and an
    accent-tinted background, and its timeline bar turns light gold.
  - Dimmed (a skill is active that this role did not use): the thumbnail drops to
    `--dim-opacity` and the title to 55% paper. The text stays above AA.
- The cards are a WAI-ARIA tablist with automatic activation: arrow keys, Home and End. The
  markup uses `<a role="tab" href="#work-<id>">`, so without JavaScript each card still jumps to
  its panel. Selecting a card updates the hash with `replaceState`, and a `#work-<id>` URL opens
  on that role. On phones, a pick whose panel starts below the screen scrolls the panel up.
- **Panel**: from 1100px up, the gallery (`7fr`) beside a summary (`5fr`), with the bullets across
  the full width below both. Stacked in that order on narrower screens.
  - Summary: an `h3` reading "Role · Company", the "formerly" note, dates and location (meta
    style), a "Visit <domain> ↗" link, impact chips (gold hairline, 13px), then the stack chips.
    A stack chip matching the active skill is highlighted.
  - Bullets: em-dash list in two newspaper columns from 768px, ragged-right.
  - **Gallery**: one slide visible at a time, previous/next buttons, and a row of labelled slide
    buttons. A screenshot slide shows the desktop capture in a browser frame (three dots and a
    URL pill that links to the captured page) with the phone capture in a phone frame
    overlapping the bottom-right corner. Clicking a screenshot opens it full size in a
    `<dialog>` lightbox, with arrows to step through the role's screenshots. Escape or the close
    button dismisses it. Without JavaScript the screenshot is a plain link to the image.
  - **Diagram slide**: the role's "how it works" flow. Lanes of nodes joined by arrows, laid out
    horizontally when the diagram's content box is at least 480px wide (container query) and
    vertically otherwise. Lane tones: muted (a "before" state, dashed, 55% paper), accent (gold
    borders, the system that was built) and plain. A `loop` lane draws a return bracket; a
    `set` lane has no arrows. An optional outcome line closes the diagram.

## II · Career

- A Gantt chart of all four roles from the first start month to the build month. Each row is
  labelled with company, role and "dates · duration", so the bars need no tooltip. Year ticks
  run on hairline gridlines, with labels below the last row. Each bar is 10px tall, rounded
  `--radius-sm`, filled `--color-accent-500`; the picked role's bar is `--color-accent-300`;
  dimmed bars use `--dim-opacity`.
- A showcased role's bar is a link to its panel with a 28px hit area: clicking selects the role
  and scrolls to Work. Shmizzys Garage's bar is plain.
- "Present" resolves to the build month (`__BUILD_MONTH__`, defined in `vite.config.ts`), so the
  server render and the client agree.
- Below 560px the label sits above its track. In print the rows print as a plain list.

## III · Skills

- The six categories stay. The category label uses the Skills label style, and the skills are
  chips (`<button aria-pressed>`, 13px, hairline border, `--radius-sm`).
- Hovering or focusing a chip previews it, and clicking pins it (click again to clear). While a
  skill is active, Work cards and timeline bars for roles that did not use it dim. A polite live
  line above the chips reads "Stripe · Used at CoDriverHQ, Sneakerhead." Skill-to-role links
  live in `src/data/resume.ts`.

## IV · Education

A tile in the work-card style: school, the credential in italic, and the date in meta style.

## Sticky bar

Fixed to the top, `--bar-height` tall, background `--color-bar-bg` with an 8px backdrop blur and
a hairline bottom edge. It holds the name (Cormorant 600, 18px) and section links (Work, Career,
Skills, hidden under 768px) on the left, and icon buttons for email, LinkedIn and résumé on the
right. It is hidden and `inert` until the banner leaves the viewport (IntersectionObserver),
then slides down over `--duration-bar`.

## Motion

Quiet and one-shot: things arrive, then hold still. Nothing loops except the ruins and the ash.
All of it is inside `@media screen and (prefers-reduced-motion: no-preference)`, so reduced
motion and print get the finished page with nothing hidden. Tokens: `--ease-out`,
`--duration-enter`, `--duration-reveal`, `--duration-panel`, `--duration-grow`,
`--duration-flow`, `--stagger`, `--flow-step`, `--enter-distance`, `--lift`, `--thumb-zoom`.

- **First screen** (`[data-enter]`, `src/styles/motion.css`): the name, the gold rule (drawn from
  the left), the subtitle, each action, the profile, the four tiles and the three work cards
  rise `--enter-distance` and fade in, one `--stagger` apart. Pure CSS keyed on `html[data-js]`,
  so it plays before the bundle arrives and always ends visible.
- **Count-up**: a stat that is one whole number ($750K, 3) counts up from zero over 1.1s once
  on screen. The server renders the final value and screen readers only get the final value.
  In "3 → 1" the arrow and the 1 slide in after the tile.
- **Scroll-in** (`[data-reveal]`, `src/lib/useReveal.ts`): the role panel, Career, Skills,
  Education and the footer fade up as they enter the viewport. The hook sets `html[data-motion]`
  after hydration; anything already on screen is marked first, so nothing visible blinks out.
  Without JavaScript nothing is ever hidden.
- **Timeline**: the bars draw out from their start month, one row after another, when the chart
  comes on screen.
- **Diagram**: when the diagram is on screen (and each time its slide is shown again) its nodes
  arrive in reading order, and each node of the built system glows gold in turn
  (`--glow-node`), like work moving through the pipeline. Once.
- **Switching**: a newly picked panel's gallery, summary and bullets rise in turn; a new gallery
  slide fades in; the picked card's gold bar draws across.
- **Hover**: cards and tiles lift `--lift`; a card's thumbnail zooms to `--thumb-zoom`.
- **Stat-tile target**: the marked bullet flashes brighter, then settles into its mark.

## Progressive enhancement and print

- An inline script in `index.html` sets `<html data-js>` before first paint. Only under
  `[data-js]` do non-selected panels and gallery slides collapse, the gallery controls, copy
  buttons and sticky bar appear, and links become tabs. Without JavaScript the page reads as the
  full résumé, every showcased role expanded.
- Print: the banner prints as name and contact, the stat tiles as a plain row, every showcased
  role's details with its bullets in one column, the career rows as a list, and the skills as
  plain text. Galleries, diagrams, tab cards, chip borders and all controls are hidden. Ink on
  paper, as before.
