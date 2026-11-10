// Per-chapter question targets, from content/targets.json.
import { readFileSync } from 'node:fs';

const T = JSON.parse(readFileSync(new URL('../../content/targets.json', import.meta.url), 'utf8'));

export const PRIORITY = T.priority;

/** Questions wanted for one chapter. */
export function chapterTarget(book, chapter) {
  const b = T.books[book];
  if (!b) throw new Error(`unknown book ${book}`);
  const base = b.perChapter ?? T.defaults.perChapter;
  return base + (b.focus?.includes(chapter) ? T.defaults.focusBonus : 0);
}

export function chapterCount(book) {
  return T.books[book].chapters;
}

/** Questions wanted for a whole book. */
export function bookTarget(book) {
  let n = 0;
  for (let c = 1; c <= chapterCount(book); c++) n += chapterTarget(book, c);
  return Math.max(n, T.defaults.minPerBook);
}

export function totalTarget() {
  return PRIORITY.reduce((s, b) => s + bookTarget(b), 0);
}
