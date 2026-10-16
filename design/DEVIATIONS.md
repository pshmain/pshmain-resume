# Deviations (rev B, Blueprint)

The places where the build knowingly differs from the approved Blueprint plan, or from
`blueprint.md`, with the reason. Rev A's deviations from its Claude Design handoff are in
`archive/roman-v1/DEVIATIONS.md`.

## Against the plan

- **An engine, not an exploded stack.** The plan's Fig. 1 was a flat isometric stack of plates.
  Peter asked for a model to grab and turn as in SolidWorks, then for one that looks like it is
  actually supposed to be something. It became an inline-six: a cylinder per skill layer (six
  groups, six cylinders, in résumé order so the numbers match the bill of materials), a
  configuration per project, and hardware standing for sections of the page.
- **Three.js was added.** The stack rule is "add nothing unless the design requires it"; a
  model that turns freely, explodes, runs and is picked with a pointer requires a real 3D
  renderer. It loads only with WebGL, not when the visitor saves data, and off the critical
  path (desktop: when idle; touch: on first touch or a few seconds in). The poster carries the
  page until then.
- **The three.js chunk is over Vite's 500 kB warning.** It is about 600 kB minified (150 kB
  gzipped), most of it the WebGL renderer and its shader library, which cannot be tree-shaken.
  It is split from the scene's own code so it stays cached across deploys, and
  `vite.config.ts` raises `chunkSizeWarningLimit` to 620 kB, just above it, so anything else
  that grows past 500 kB still warns. OrbitControls was replaced by a small orbit of our own
  (about 20 kB less).
- **Phong, not physically based, lighting.** A PBR material with a studio environment map looked
  a little richer, but building the environment cost about 0.9 s of blocked main thread on a
  throttled phone. Blinn-Phong with a hemisphere light and three directional lights looks close
  to it, compiles faster and draws faster.
- **The poster is an image, not hand-projected SVG.** The detailed engine's turned and swept
  parts cannot be drawn as flat polygons convincingly. The poster is now the scene's own first
  frame, rendered ahead by `npm run poster` (WebP, 43 kB at 1x, 99 kB at 2x).
- **The cover is a workspace, not two columns.** The plan put the drawing beside the name. Peter
  wanted the model unboxed at the centre with the feature tree on the side, so the name runs
  across the top and the model and left panel sit under it.
- **Motion (the library) was removed.** The plan added it for springs; in the end it drove one
  element, the tab selection box, for about 30 kB of JavaScript (a 37 kB slice of the main
  bundle plus a 47 kB lazy chunk). A CSS transition on `--ease-spring` draws the same slide.
- **Packets use SVG `animateMotion`, not CSS `offset-path`.** Safari's support for `offset-path`
  on SVG elements is unreliable. SMIL runs everywhere, and is started from script only when the
  schematic is in view and reduced motion is off.
- **The schematic replaces the gallery's diagram slide.** In Rev A the diagram was one slide
  among the screenshots. In Rev B it is a full-width drawing under the detail views, because it
  is the clearest picture of the private work.

## Content

- **Callouts appear only where the résumé backs them.** CoDriverHQ and Sneakerhead, which Peter
  built end to end, have balloons on each capture.
- **Provenance's gallery is partly supplied, and it has no Visit link.** Its work was mostly
  internal tooling, so two screens are Peter's own screenshots: the ordination admin panel, with
  every customer's email, name, minister ID and address replaced by placeholder bars, and the
  ceremony checklist, with names, the date and the brand mark removed. They live in the capture
  script's MANUAL list, which it never overwrites or deletes. The third, the public ordination
  signup, is captured live without the site-wide banner or a testimonial that names customers.
  Its browser frames show a plain address, not a link.
- **Colophon:** "Drawn to spec. Built to ship." is a proposal to fit the drawing set; Peter may
  replace it.
- The skill-to-project links marked `// confirm` in `src/data/resume.ts` are still unconfirmed.

## Assets

- **The ruins are gone.** The dither engine, the hero frame sheet (about 1.1 MB) and the ash
  canvas were removed. They live on in the `RomanArchitecture_v1` tag.
- **Favicon, touch icon and social image** were redrawn in the blueprint style: a stack of
  the engine in isometric, and the cover sheet with the engine's poster. They were drawn from
  the engine's dimensions and its rendered poster. They were rendered with the installed Chrome from HTML and SVG
  sources that are not kept in the repo.
