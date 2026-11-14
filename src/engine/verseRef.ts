import { BOOK_BY_CODE } from '../i18n/books';

/** A verse (or a short run of verses) a post points at: 'JHN 3:16' or 'JHN 3:16-18'. */
export interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
}

/** Reads 'JHN 3:16' / 'JHN 3:16-18' (also with an en dash). null if it isn't a reference to a known book. */
export function parseVerseRef(ref: string | null | undefined): VerseRef | null {
  const m = /^\s*([A-Z0-9]{3})\s+(\d{1,3}):(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*$/.exec((ref ?? '').toUpperCase());
  if (!m || !BOOK_BY_CODE[m[1]]) return null;
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  const end = m[4] ? Number(m[4]) : 0;
  if (!chapter || !verse) return null;
  return { book: m[1], chapter, verse, ...(end > verse ? { verseEnd: end } : {}) };
}

/** Writes a reference the way the database keeps it. */
export function formatVerseRef(r: VerseRef): string {
  return `${r.book} ${r.chapter}:${r.verse}${r.verseEnd && r.verseEnd > r.verse ? `-${r.verseEnd}` : ''}`;
}
