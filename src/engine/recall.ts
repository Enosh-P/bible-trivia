import { db } from '../storage/db';
import { supabase } from '../online/supabase';
import { shuffle } from './picker';

/**
 * Recall cards: human-written questions with their answers (unfoldingWord
 * Translation Questions, ~17,000 across every chapter). Loaded one book at a
 * time from Supabase, or from the bundled /packs/uw/ files, and kept offline.
 */
export interface RecallCard {
  id: string; // 'uw-GEN-i4zd'
  book: string;
  chapter: number;
  verse: number;
  verseEnd?: number;
  q: string;
  a: string;
  /** Tamil (machine-translated with Tamil Bible names until reviewed). */
  qTa?: string;
  aTa?: string;
  taReviewed?: boolean;
}

export interface RecallIndex {
  attribution: string;
  license: string;
  total: number;
  books: Record<string, number>;
}

type Row = [string, number, number, number, string, string, string?, string?];

let indexPromise: Promise<RecallIndex> | null = null;
const bookCache = new Map<string, Promise<RecallCard[]>>();

export function loadRecallIndex(): Promise<RecallIndex> {
  indexPromise ??= fetch('/packs/uw/index.json').then((r) => {
    if (!r.ok) throw new Error(`index ${r.status}`);
    return r.json();
  });
  indexPromise.catch(() => (indexPromise = null)); // allow a retry after going online
  return indexPromise;
}

/**
 * Cards for one book. With Supabase connected, the database is the source
 * (so fixes made there reach players) and a copy is kept for offline use;
 * otherwise, or if that fails, the files bundled with the app.
 */
export function loadRecallBook(book: string): Promise<RecallCard[]> {
  let p = bookCache.get(book);
  if (!p) {
    p = loadFromDatabase(book)
      .catch(() => loadOfflineCopy(book))
      .catch(() => loadBundled(book));
    p.catch(() => bookCache.delete(book));
    bookCache.set(book, p);
  }
  return p;
}

interface RecallRow {
  id: string;
  chapter: number;
  verse: number | null;
  verse_end: number | null;
  en: { q: string; a: string };
  ta: { q: string; a: string } | null;
  ta_status: 'machine' | 'reviewed' | null;
}

async function loadFromDatabase(book: string): Promise<RecallCard[]> {
  if (!supabase || !navigator.onLine) throw new Error('offline');
  const cards: RecallCard[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, chapter, verse, verse_end, en, ta, ta_status')
      .eq('type', 'recall')
      .eq('book_code', book)
      .order('chapter')
      .order('verse')
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data as RecallRow[]) {
      cards.push({
        id: r.id,
        book,
        chapter: r.chapter,
        verse: r.verse ?? 1,
        ...(r.verse_end ? { verseEnd: r.verse_end } : {}),
        q: r.en.q,
        a: r.en.a,
        ...(r.ta?.q && r.ta?.a ? { qTa: r.ta.q, aTa: r.ta.a, taReviewed: r.ta_status === 'reviewed' } : {}),
      });
    }
    if (data.length < 1000) break;
  }
  if (!cards.length) throw new Error('not in database yet');
  void db.recallBooks.put({ book, cards, at: Date.now() }).catch(() => {});
  return cards;
}

async function loadOfflineCopy(book: string): Promise<RecallCard[]> {
  const saved = await db.recallBooks.get(book);
  if (!saved?.cards.length) throw new Error('no offline copy');
  return saved.cards as RecallCard[];
}

function loadBundled(book: string): Promise<RecallCard[]> {
  return fetch(`/packs/uw/${book}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`${book} ${r.status}`);
        return r.json() as Promise<{ rows: Row[] }>;
      })
      .then(({ rows }) =>
        rows.map(([id, chapter, verse, verseEnd, q, a, qTa, aTa]) => ({
          id: `uw-${book}-${id}`,
          book,
          chapter,
          verse,
          ...(verseEnd ? { verseEnd } : {}),
          q,
          a,
          ...(qTa && aTa ? { qTa, aTa } : {}),
        })),
      );
}

/**
 * A practice round: cards you missed come first, cards you knew recently
 * come last, the rest in random order.
 */
export async function recallRound(book: string, chapter: number | null, size = 15): Promise<RecallCard[]> {
  const all = (await loadRecallBook(book)).filter((c) => chapter === null || c.chapter === chapter);
  const history = await db.answers.where('book').equals(book).toArray().catch(() => []);
  const last = new Map<string, { correct: boolean; at: number }>();
  for (const h of history) {
    const prev = last.get(h.questionId);
    if (!prev || h.at > prev.at) last.set(h.questionId, { correct: h.correct, at: h.at });
  }
  const weekAgo = Date.now() - 7 * 864e5;
  const score = (c: RecallCard) => {
    const h = last.get(c.id);
    if (!h) return 1; // never seen
    if (!h.correct) return 2; // missed: practise again
    return h.at > weekAgo ? 0 : 1; // knew it recently: later
  };
  const shuffled = shuffle(all);
  shuffled.sort((a, b) => score(b) - score(a));
  const picked = shuffled.slice(0, size);
  // Within the round, follow the order of the chapter for a natural flow.
  return chapter === null ? picked : picked.sort((a, b) => a.verse - b.verse);
}
