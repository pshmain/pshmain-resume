# design/

Design source of truth for the site. When the handoff and the code disagree, the handoff wins
unless a deliberate deviation is recorded in `DEVIATIONS.md`.

- `handoff.md` - the Claude Design handoff: tokens, type, spacing, layout, copy, and the two
  canvas engines' behaviour.
- `DEVIATIONS.md` - every place the build knowingly departs from the handoff, with the reason.
- `prototype/` - the working HTML prototype (`Resume.dc.html`) plus the runtime it needs to open
  locally (`support.js`, `_ds/`). Reference only; nothing here ships.
- `assets/` - the handoff's original hero video and résumé docx, kept for the record. The site
  ships the video as a frame sheet (`src/assets/hero-frames.avif` and `.webp`, see
  `src/assets/heroFrames.ts`). The résumé the site actually serves is
  `public/Peter_Shmain_Resume.docx`, which is newer than the handoff copy (see `DEVIATIONS.md`,
  "Copy").
