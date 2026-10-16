import type { RoleId } from '@/data/resume';

/**
 * Live-site screenshots, captured by `npm run shots` (scripts/capture-shots.mjs) into
 * src/assets/shots/ with a manifest of each file's size, plus a few screens of internal tools
 * supplied by hand (the script's MANUAL list), redacted before they were added. Globbed rather than imported so a
 * missing capture drops its gallery slide instead of breaking the build.
 */

export type ShotDevice = 'desktop' | 'phone' | 'thumb';

interface ManifestEntry {
  file: string;
  width: number;
  height: number;
  device: ShotDevice;
  site: string;
  page: string;
  /** The live page that was captured; empty for screens supplied by hand. */
  url: string;
  /** What the browser frame's address pill says, when not the URL. */
  address?: string;
}

export interface ShotImage {
  src: string;
  width: number;
  height: number;
  url: string;
  address?: string;
}

type Manifest = ManifestEntry[] | { shots: ManifestEntry[] };

const manifests = import.meta.glob<Manifest>('./shots/manifest.json', { eager: true, import: 'default' });
const files = import.meta.glob<string>('./shots/*.webp', { eager: true, import: 'default' });
const manifest = Object.values(manifests)[0];
const entries: ManifestEntry[] = !manifest ? [] : Array.isArray(manifest) ? manifest : manifest.shots;

export function findShot(site: RoleId, page: string, device: ShotDevice): ShotImage | undefined {
  const entry = entries.find((e) => e.site === site && e.page === page && e.device === device);
  if (!entry) return undefined;
  const src = files[`./shots/${entry.file.split('/').pop()}`];
  return src ? { src, width: entry.width, height: entry.height, url: entry.url, address: entry.address } : undefined;
}
