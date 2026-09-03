import avif from './hero-frames.avif';
import webp from './hero-frames.webp';
import type { FrameSheet } from '@/engine/DitherEngine';

/**
 * The hero video as a sprite sheet: design/assets/Dense_ash_falls_continuously_o.mp4 sampled at
 * 11 fps (110 frames over 10 s), 7.5% cropped off every edge, scaled to 208x117, tiled 11 across
 * and 10 down (2288x1170). AVIF first, WebP for browsers that cannot decode it.
 *
 * Regenerate: ffmpeg `-vf "fps=11,crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075,scale=208:117,tile=11x10"
 * -frames:v 1 sheet.png`, then encode the PNG with sharp: `.avif({ quality: 65, effort: 6,
 * chromaSubsampling: '4:4:4' })` and `.webp({ quality: 80, effort: 6 })`. Those qualities were
 * chosen by dithering sample frames from each encode and counting cells whose dot level or
 * colour differed from the lossless PNG (see design/DEVIATIONS.md, "Hero source").
 */
export const heroFrames: FrameSheet = {
  sources: [avif, webp],
  frameWidth: 208,
  frameHeight: 117,
  columns: 11,
  count: 110,
};
