import { BOOK_BY_CODE } from '../i18n/books';
import type { Question } from './types';
import { hashString, rng } from './picker';

/**
 * Multiple-choice questions by book (about 30,000), from Dr. Ted Hildebrandt's
 * chapter quizzes (biblicalelearning.org) via the BIBLE dataset, CC BY 4.0.
 * One file per book in /packs/mcq/, downloaded when first needed and kept
 * offline by the service worker. Built by scripts/import-bible-mcq.mjs.
 */
export interface McqIndex {
  attribution: string;
  license: string;
  total: number;
  tamil: number;
  /** Books whose questions are machine-generated (no human-written set yet). */
  generated: string[];
  books: Record<string, number>;
  /** Number of Who Said It? questions (all books, in who.json). */
  who?: number;
  whoAttribution?: string;
}

/** [id, chapter, verse, kind, question, options, answer, questionTa?, optionsTa?]; kind bits: 1 fill the blank, 2 machine-generated, 4 who said it */
type Row = [string, number, number, number, string, string[], number, string?, string[]?];

/** Favoured when mixing books into Classic, Speed, Survival and the Daily Challenge. */
export const POPULAR = ['GEN', 'EXO', 'PSA', 'PRO', 'DAN', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'REV', '1SA', 'JOS', 'JDG', 'RUT', 'JON', 'EST'];

let indexPromise: Promise<McqIndex> | null = null;
const cache = new Map<string, Promise<Question[]>>();

export function loadMcqIndex(): Promise<McqIndex> {
  indexPromise ??= fetch('/packs/mcq/index.json').then((r) => {
    if (!r.ok) throw new Error(`index ${r.status}`);
    return r.json();
  });
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

function ref(book: string, chapter: number, verse: number, lang: 'en' | 'ta') {
  const name = BOOK_BY_CODE[book]?.[lang] ?? book;
  return chapter ? `${name} ${chapter}${verse ? `:${verse}` : ''}` : name;
}

export function toQuestion(book: string, [id, chapter, verse, kind, q, options, answer, qTa, optionsTa]: Row): Question {
  const en = { q, options, explain: ref(book, chapter, verse, 'en') };
  const hasTa = Boolean(qTa && optionsTa?.length === options.length);
  return {
    id: `bq-${book}-${id}`,
    type: kind & 4 ? 'who' : kind & 1 ? 'blank' : 'mcq',
    book,
    chapter,
    ...(verse ? { verse } : {}),
    difficulty: 2,
    answer,
    en,
    // Until a book is translated, Tamil mode shows the English question.
    ta: hasTa ? { q: qTa!, options: optionsTa!, explain: ref(book, chapter, verse, 'ta') } : { ...en, explain: ref(book, chapter, verse, 'ta') },
    tags: [hasTa ? 'machine-ta' : 'no-ta', ...(kind & 2 ? ['generated'] : [])],
  };
}

export function loadMcqBook(book: string): Promise<Question[]> {
  let p = cache.get(book);
  if (!p) {
    p = fetch(`/packs/mcq/${book}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`${book} ${r.status}`);
        return r.json() as Promise<{ rows: Row[] }>;
      })
      .then(({ rows }) => rows.map((r) => toQuestion(book, r)));
    p.catch(() => cache.delete(book));
    cache.set(book, p);
  }
  return p;
}

/** Book code from a question id like "bq-GEN-4nLVL5". */
export function bookOfId(id: string): string | null {
  const m = /^bq-([0-9A-Z]{3})-/.exec(id);
  return m ? m[1] : null;
}

/** Loads several books; books that fail (offline, not downloaded yet) are skipped. */
export async function loadMcqBooks(books: string[]): Promise<Question[]> {
  const sets = await Promise.all(books.map((b) => loadMcqBook(b).catch(() => [] as Question[])));
  return sets.flat();
}

/**
 * Picks a few books to mix into a round: popular books more often.
 * The same seed gives the same books (the Daily Challenge is the same for everyone).
 */
export function pickBooks(seed: string, count = 5): string[] {
  const random = rng(hashString(seed));
  const all = Object.keys(BOOK_BY_CODE);
  const weighted = all.map((b) => ({ b, w: random() * (POPULAR.includes(b) ? 3 : 1) }));
  return weighted
    .sort((a, b) => b.w - a.w)
    .slice(0, count)
    .map((x) => x.b);
}

let whoPromise: Promise<Question[]> | null = null;

/** Every Who Said It? question, from all books (one file). */
export function loadWhoSaid(): Promise<Question[]> {
  whoPromise ??= fetch('/packs/mcq/who.json')
    .then((r) => {
      if (!r.ok) throw new Error(`who ${r.status}`);
      return r.json() as Promise<{ rows: [string, ...Row][] }>;
    })
    .then(({ rows }) => rows.map(([book, ...row]) => toQuestion(book, row as Row)));
  whoPromise.catch(() => (whoPromise = null));
  return whoPromise;
}
