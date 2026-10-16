// Draws the engine for the poster capture (scripts/render-engine-poster.mjs): assembled, in
// isometric, shaded, at rest, with no callout room, on a canvas tall enough that its width
// sets the scale. Then publishes the framed extents box for the capture to crop to.
// Query options, for looking at other states: width, display (shaded|xray|wireframe),
// exploded (1), focus (a cylinder index, or p<n> for a project), view (iso|front|top|right).
import { createEngineScene, type Display, type View } from '../src/components/model/engineScene';
import { usage, type Part } from '../src/components/model/parts';
import { readPalette } from '../src/components/model/palette';

const query = new URLSearchParams(location.search);
const width = Number(query.get('width') ?? 900);
const canvas = document.getElementById('engine') as HTMLCanvasElement;
canvas.style.width = `${width}px`;
canvas.style.height = `${Math.round(width * 1.4)}px`;

const scene = await createEngineScene({
  canvas,
  usage,
  palette: readPalette(),
  reducedMotion: true,
  calloutRoom: () => 0,
  onFrame: () => {},
  onHover: () => {},
  onPick: () => {},
});
const display = query.get('display') as Display | null;
if (display) scene.setDisplay(display);
if (query.get('exploded') === '1') scene.setExploded(true);
const view = query.get('view') as View | null;
if (view) scene.setView(view);
const focus = query.get('focus');
if (focus) {
  const part: Part = focus.startsWith('p') ? { kind: 'project', index: Number(focus.slice(1)) } : { kind: 'layer', index: Number(focus) };
  scene.setEmphasis(part);
}
const frames = (n: number): Promise<void> =>
  new Promise((resolve) => {
    const tick = (left: number): void => {
      if (left <= 0) resolve();
      else requestAnimationFrame(() => tick(left - 1));
    };
    tick(n);
  });
await frames(8);
(window as unknown as { __poster: unknown }).__poster = scene.posterBox();
