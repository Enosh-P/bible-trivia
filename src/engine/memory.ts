import { hashString, rng, shuffle } from './picker';

/**
 * Memory verses: each round hides more of the verse until it's learned.
 * Level 0 hides a quarter of the words, 1 half, 2 three quarters, 3 all of them;
 * level 4 means learned (practised with every word hidden).
 */
export const HIDE = [0.25, 0.5, 0.75, 1, 1];
export const LEARNED = 4;

export interface Piece {
  /** The word as written, punctuation included. */
  text: string;
  /** The part to fill in (letters only), or null when shown. */
  blank: string | null;
}

const LETTERS = /[\p{L}\p{M}\p{N}'’-]+/u;

/** Splits a verse into words and hides some of them for this level. */
export function makeRound(text: string, level: number, seed: string): { pieces: Piece[]; bank: string[] } {
  const words = text.split(/\s+/).filter(Boolean);
  const candidates = words.map((w, i) => (LETTERS.test(w) ? i : -1)).filter((i) => i >= 0);
  const n = Math.max(1, Math.ceil(candidates.length * HIDE[Math.min(level, HIDE.length - 1)]));
  const random = rng(hashString(seed));
  const hidden = new Set(shuffle(candidates, random).slice(0, n));
  const pieces = words.map((w, i) => ({ text: w, blank: hidden.has(i) ? (LETTERS.exec(w)?.[0] ?? w) : null }));
  const bank = shuffle(
    pieces.filter((p) => p.blank).map((p) => p.blank!),
    random,
  );
  return { pieces, bank };
}

/** Same word, ignoring case. */
export function sameWord(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}
