# Blueprint: design spec (rev B, 2026-10-15)

The site is a set of engineering drawing sheets on cyanotype paper. It ties Peter's
mechanical-engineering start to the systems he builds now, and it stays a dashboard: a recruiter
gets role, impact, live work, how it was built, tenure and stack without leaving the page.

This file is the design source of truth. Tokens live in `src/styles/tokens.css`, the only file
allowed raw colours, fonts and sizes. Rev A (the Roman ruins dashboard) is tagged
`RomanArchitecture_v1`, and its documents are in `design/archive/roman-v1/`.

## Drawing language

- **Paper:** `--color-paper` #0d2b4e with a drafting grid, minor lines every 24px and major lines
  every 120px. The grid is CSS gradients on `html`.
- **Ink:** ink #eaf3ff (12.7:1), ink-2 #9cc3ea (7.8:1), ink-3 #86aed6 (6.1:1).
  - **Cyan** #7fd0ff (8.4:1) marks dimensions, active states and the system Peter built.
  - **Redline** #ff7a59 (5.6:1) is only for emphasis: the revision cloud, superseded (Rev A)
    work, and callout balloons.
  - Linework uses the ink at 55%, 28% and 14% (`--color-line`, `-soft`, `-faint`).
- **Type:** IBM Plex, self-hosted.
  - Plex Sans Condensed 600, uppercase: the name and headings.
  - Plex Sans: body text.
  - Plex Mono: labels, numbers, dimensions and sheet numbers.
- **Marks:**
  - Sheet numbers (A-001 to A-401).
  - Title strips: bordered cells, like a row of a title block.
  - Registration Ls at sheet corners.
  - Dimension lines (`components/drawing/Dimension`): ticks, arrowheads, a centred label.
  - A redline revision cloud (`RevisionCloud`).
  - Hatched bars, numbered notes, and callout balloons.

## Sheets, in page order

1. **A-001 Cover sheet** (`sections/CoverSheet`).
   - A double-ruled drawing border with zone markers: 1 to 6 across, A to D down.
   - The name in condensed caps, with a dimension line under it carrying "Full-Stack Engineer —
     Los Angeles, CA".
   - **The CAD workspace** under the name, laid out like SolidWorks: the model at the centre,
     unboxed on the sheet, and a left panel holding the feature tree and the property panel.
     Phones stack them: model, properties, tree.
   - **The model: an inline-six engine** (`components/model`), in Three.js. It is the
     centrepiece: Peter is a mechanical engineer who co-founded a garage and built a
     car-buying platform. It is modelled as a real engine: a block with its cylinder barrels,
     ribs, freeze plugs, mounts, oil filter and starter; a chamfered head and gasket; a ribbed,
     painted valve cover with a filler cap and bolts; coil packs; a timing cover and the front
     drive (balancer, pump, alternator, tensioner and belt); intake runners into a plenum and
     throttle body; an exhaust manifold into a collector and downpipe; a contoured oil pan; a
     flywheel with ring-gear teeth; and inside, grooved pistons, I-beam rods and a crankshaft
     with counterweights. Finishes (aluminium, cast, paint, steel, exhaust, plastic, rubber)
     come from `--model-*` tokens, lit with Blinn-Phong and drawn with edges, as CAD shades.
     Its parts stand for the résumé:
     - **Six cylinders, one per skill layer**, numbered 01 to 06 like the bill of materials.
       Each has an item balloon over its coil pack; pointing at a cylinder spells out its name.
     - **Configurations, one per project.** Picking one (toolbar or tree) turns the crank over
       for two cycles in firing order 1-5-3-6-2-4, and only the cylinders whose layers the
       project used fire. Provenance and Sneakerhead fire five of six; CoDriverHQ fires all six.
     - **Hardware with a meaning:** the head is the headline numbers (A-002), the block is the
       mechanical engineering degree (A-401), the crankshaft is the career (A-201). Callouts on
       leader lines name them where the graphics area is at least 760px wide.
     - Looking inside turns the shell (block, head, cover, timing cover, pan) to X-ray: when a
       cylinder or a configuration is in focus, while the engine runs, or when X-ray is the
       chosen display. The pistons, rods and crank show through it.
   - **Driving it:** drag to rotate (orthographic, starting in true isometric); double-click
     returns to iso. On touch a horizontal drag turns it and a vertical swipe scrolls the page.
     With the graphics area focused, arrow keys rotate it 15 degrees a press.
   - **The heads-up toolbar** above the graphics area: Iso, Front, Top, Right; Explode (the
     coils, cover and head lift, the pistons rise out of the bores, the manifolds move aside, the
     crank, flywheel and pan drop, the front drive pulls forward); Shaded, X-ray or Wireframe;
     and the configuration picker.
   - **The feature tree** (`FeatureTree`): Full-stack engine, then Configurations, Cylinders
     and Hardware, each a folding branch (`<details>`). Hardware starts folded; on phones the
     cylinders do too. Every leaf is a link to its part of the page, so the tree is the way in
     for keyboards, screen readers, and anyone who would rather not turn the model.
   - **The property panel** (`ModelStatus`): whatever is pointed at or picked, with a link down
     the page (View in bill of materials, Open project, View education, ...); otherwise a legend
     for reading the model.
   - Pointing at a part, in the model or the tree, lights it cyan and dims the rest. Clicking a
     part in the model picks it, so its properties stay put while the pointer moves to the link.
     A layer in focus down the page lights its cylinder.
   - Before the scene loads, without JavaScript and without WebGL, the **poster** stands in:
     the scene's own first frame, rendered ahead as WebP at 1x and 2x (`npm run poster`) and
     framed exactly as the live canvas, so the handover is seamless. It is the page's largest
     paint, so it is shown at once, never faded in.
   - A **title block** (Drawn by / Contact / Download résumé) holds every way to reach Peter.
     Under the name, as on any drawing, the drawing number and scale: DWG NO. PS-0001, SCALE 1:1.
     Download is the page's one filled button.
   - A drafting **crosshair** with an X/Y readout follows a mouse pointer over the sheet
     (`components/Crosshair`). It's off for touch and reduced motion.
   - From 768px the left panel sits beside the model; below that they stack.
2. **A-002 At a glance** (`sections/Overview`): the profile beside four stats.
   - Each stat is a number over a dimension line, with its label.
   - $750K is ringed by a redline revision cloud.
   - Single numbers count up. In "3 → 1" the arrow and the 1 slide in.
   - A tile links to its source bullet, which flashes and stays marked.
3. **A-101 Work** (`sections/Work`): one sheet tab per showcased project (A-101 Provenance, A-102
   CoDriverHQ, A-103 Sneakerhead), each with a thumbnail, sheet number, company, role and dates.
   - **Tabs.** Nothing looks selected until the visitor picks a project. Then a cyan
     **selection box** with corner grips springs to the picked tab.
     - The tabs are a WAI-ARIA tablist with arrow keys, Home and End.
     - Picking a tab updates the URL to `#work-<id>`, and a URL with `#work-<id>` opens on that
       project.
   - **Detail views** (`components/Gallery`): one captured page at a time.
     - The desktop capture sits in a browser outline, and the phone capture overlaps it in a
       phone outline.
     - Numbered redline **balloons** mark what Peter built, keyed to a legend below. They come
       from `callouts` in `resume.ts` and appear only where the résumé backs the claim.
     - Clicking a capture opens a lightbox.
   - **Specifications:** a two-column table of role, date, impact and stack. The stack part
     matching the focused skill is lit, and a "Visit" link sits below.
   - **How it works** (`components/Schematic`): an SVG schematic computed from the role's
     `diagram`.
     - Where there is a before and after, the old setup is **Rev A**: dashed, ink-3, with
       "Superseded" struck through in redline. The built system is **Rev B** in cyan.
     - A `loop` lane draws a return path.
     - It is drawn wide from 640px of container width and tall below that.
     - A "Result" line closes it, and a text version carries the same content for screen
       readers.
   - **Notes:** the résumé bullets, numbered 01 to 06, in two columns from 768px.
   - From 1024px the detail views and specifications sit side by side, with the schematic and
     notes full width below.
4. **A-201 Career** (`sections/Career`, `components/Timeline`): every role on one schedule.
   - Hatched bars, with labels for company, role, dates and duration.
   - Hover, focus or the picked role shows a dimension line with the duration over its bar.
   - A showcased role's bar links to its panel. Shmizzys Garage's bar is plain.
5. **A-301 Skills, bill of materials** (`sections/BillOfMaterials`): a parts list per layer,
   numbered 01 to 06 to match the engine's cylinders.
   - Each part has a "used in" marker per project: ● used, ○ not used.
   - Layer headers and parts are buttons: hover or focus previews, and a click pins.
   - The focus lights the matching cylinder, lights the parts, dims project tabs and schedule bars
     that did not use it, and updates a polite status line ("Stripe · Used at CoDriverHQ,
     Sneakerhead.").
   - The lists sit three across from 1024px, two from 560px.
6. **A-401 Education, general notes** (`sections/Education`): note 01, the degree.
7. **Footer title block** (`sections/Footer`): Drawn by, with the drawing number and scale
   (`components/drawing/DrawingSpecs`, shared with the cover) and the colophon ("Drawn to spec. Built
   to ship."); contact; and a revision table of Peter himself: A, Student (mechanical engineering
   at CSU Northridge); B, Business Owner (co-founded Shmizzys Garage); C, full-stack engineer;
   D, "Your team", pending approval, in redline.
8. **Sticky index strip** (`components/StickyBar`): name, sheet links and contact icons. It
   slides in once the cover sheet has scrolled away.

## Motion

Things draw themselves once, then hold still. The only repeats are the packets on hover, the
crosshair, and the engine when a visitor runs a configuration. All motion is inside
`screen and (prefers-reduced-motion: no-preference)`. Reduced motion and print get the finished
drawing, with nothing hidden.

- **Line drawing:** SVG strokes with `pathLength="1"` and `data-draw`.
  - `view` draws when the nearest `[data-watch]` comes into view: schematic boxes and
    connectors, in order.
- **Cover entrance:** `[data-enter]` with `--enter-step`. The sheet label, name, dimension line
  and title block cells rise in turn, and the dimension line spreads out from its centre.
- **Scroll-in:** `[data-reveal]`, through `src/lib/useReveal.ts`. Stats, panels, schedule, parts
  lists and footer fade up. Blocks already on screen are never hidden.
- **Stats:** dimension lines spread, the revision cloud draws, and counts run up.
- **Schedule:** hatched bars draw out from their start month, one row after another.
- **Schematic:** Rev A fades in, and Rev B's boxes and connectors draw. Then a data packet runs
  the built system twice (SVG `animateMotion`), and again when the pointer enters.
- **The engine** (Three.js, its own render loop): once it has loaded (desktop: when the page is
  idle; touch: on first touch or a few seconds in), one intro swing of the camera while the
  crank turns over twice; view changes and explode ease over 650 to 800 ms;
  a configuration runs for 3.6 s. It renders only while something moves, and pauses off screen.
  Reduced motion gets a still engine: no intro, no runs, instant views.
- **Spring:** the tab selection box slides from tab to tab on `--ease-spring`, a CSS curve that
  overshoots a little and settles.
- **Switching:** a picked panel's parts rise in turn, a new gallery slide fades in, and balloons
  pop in after their capture.
- **Hover:** tiles and tabs lift `--lift`, and tab thumbnails zoom to `--thumb-zoom`.

## Progressive enhancement and print

- `<html data-js>` is set before first paint. Only under it do panels and slides collapse, and
  controls, copy buttons and the sticky strip appear.
- Without JavaScript every project is expanded, every drawing is fully drawn, and nothing is
  hidden.
- Print re-themes to navy ink on white paper and prints a résumé:
  - Kept: name and contact, the stats, each project's specifications and notes, the career rows
    as a list, skills as comma lists per layer, education.
  - Hidden: the engine workspace, galleries, schematics, tabs and all controls.

## Performance

Budgets the build is held to, measured on the production build in headless Chrome (Lighthouse
throttling: mobile is 4x CPU on slow 4G; desktop unthrottled), October 2026:

| | Mobile | Desktop |
|---|---|---|
| First / largest contentful paint | 1.7 s / 1.8-2.2 s | 0.44 s / 0.44 s |
| Cumulative layout shift | 0.001 | 0 |
| Blocking time before the 3D starts | about 0.3 s | 0 |
| Longest task while the 3D builds | 0.15 s | under 0.05 s |
| 3D model live | on touch, or about 6 s in | 1.1 s |
| Frame time while dragging | 15 ms average | 9 ms average |

- First load: about 440 kB transferred (scripts 84 kB gzipped, fonts 103 kB, poster 43 kB at 1x).
  three.js (150 kB gzipped) and the scene (10 kB) load later, off the critical path.
- The scene: static parts merged per unit, meaning and finish; small hardware instanced; picking
  against a few invisible primitives; shaders compiled before the first frame; renders only while
  something moves; pauses off screen; drops its resolution a step if frames run slow.
