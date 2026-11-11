import data from '../../content/verses.json';
import { dayKey, rng } from './picker';
import type { Question } from './types';

export interface Verse {
  id: string; // BOOK.CH.V
  book: string;
  chapter: number;
  verse: number;
  en: string;
  ta: string;
}

export const VERSES: Verse[] = data.verses;

// Sorted by id, so the daily choice matches the push notification
// (supabase/functions/push/index.ts uses the same order and steps).
const SORTED: Verse[] = [...VERSES].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const BY_REF: Record<string, Verse> = Object.fromEntries(VERSES.map((v) => [v.id, v]));

/** The full verse a question points at, if we have its text. */
export function verseForQuestion(q: Question): Verse | undefined {
  if (!q.verse || q.verseEnd) return undefined;
  return BY_REF[`${q.book}.${q.chapter}.${q.verse}`];
}

/** Same verse for everyone on a given day, cycling through the list without repeats until it wraps. */
export function verseOfTheDay(day = dayKey()): Verse {
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const cycle = Math.floor(dayNumber / SORTED.length);
  const order = [...SORTED.keys()];
  const random = rng(cycle + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return SORTED[order[dayNumber % SORTED.length]];
}
