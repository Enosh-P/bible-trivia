import type { Question } from './types';
import type { ModeDef } from './modes';

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Local calendar day as YYYY-MM-DD (the daily challenge flips at local midnight). */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PickOptions {
  /** Question ids the player answered wrong recently: shown a bit more often. */
  weak?: Set<string>;
  /** Question ids seen recently: shown a bit less often. */
  recent?: Set<string>;
  random?: () => number;
}

/**
 * Builds the question list for a round.
 * Endless modes (Speed, Survival) get the whole eligible pool, shuffled.
 */
export function pickQuestions(pool: Question[], mode: ModeDef, opts: PickOptions = {}): Question[] {
  const random = opts.random ?? Math.random;
  const eligible = pool.filter((q) => mode.types.includes(q.type));

  // Weighted shuffle: weak questions float up, recently seen sink down.
  const scored = eligible.map((q) => {
    let w = random();
    if (opts.weak?.has(q.id)) w += 0.35;
    if (opts.recent?.has(q.id)) w -= 0.35;
    return { q, w };
  });
  scored.sort((a, b) => b.w - a.w);
  const ordered = scored.map((s) => s.q);

  return Number.isFinite(mode.length) ? ordered.slice(0, mode.length) : ordered;
}

/** Same questions for everyone on the same day. */
export function pickDaily(pool: Question[], mode: ModeDef, day = dayKey()): Question[] {
  const random = rng(hashString(`daily:${day}`));
  const eligible = pool.filter((q) => mode.types.includes(q.type));
  // 3 Bible Knowledge, 2 True or False, the rest well-known starter questions.
  const isTf = (q: Question) => q.type === 'tf';
  const isKnowledge = (q: Question) => !isTf(q) && q.id.startsWith('kn-');
  const groups: [Question[], number][] = [
    [eligible.filter(isKnowledge), 3],
    [eligible.filter(isTf), 2],
    [eligible.filter((q) => !isTf(q) && !isKnowledge(q)), mode.length - 5],
  ];
  const picked: Question[] = [];
  for (const [group, n] of groups) picked.push(...shuffle(group, random).slice(0, n));
  // Top up from anything left if a group was short.
  if (picked.length < mode.length) {
    const used = new Set(picked.map((q) => q.id));
    picked.push(...shuffle(eligible.filter((q) => !used.has(q.id)), random).slice(0, mode.length - picked.length));
  }
  // Easy first, then mix the rest so True or False isn't all at the end.
  return shuffle(picked, random).sort((a, b) => a.difficulty - b.difficulty);
}
