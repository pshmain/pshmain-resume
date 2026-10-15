import { resume } from '@/data/resume';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "YYYY-MM" of the build, as a month count. "Present" resolves to it on server and client alike. */
const [buildYear = 0, buildMonth = 1] = __BUILD_MONTH__.split('-').map(Number);
const BUILD = buildYear * 12 + buildMonth - 1;

/** "Aug 2025" (or ui.present) as a month count: year * 12 + month index. */
export function toMonth(label: string): number {
  if (label === resume.ui.present) return BUILD;
  const [mon = '', year = ''] = label.split(' ');
  const m = MONTHS.indexOf(mon);
  if (m < 0 || !year) throw new Error(`Unrecognised date "${label}" (expected "Mon YYYY")`);
  return Number(year) * 12 + m;
}

export function yearOf(month: number): number {
  return Math.floor(month / 12);
}

/** Inclusive span as "1 yr 3 mos", in the résumé's units. */
export function formatSpan(start: number, end: number): string {
  const { ui } = resume;
  const total = end - start + 1;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? ui.year : ui.years}`);
  if (m) parts.push(`${m} ${m === 1 ? ui.month : ui.months}`);
  return parts.join(' ');
}
