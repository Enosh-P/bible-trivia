import type { Question } from './types';

export const BASE_POINTS = 10;
export const MAX_TIME_BONUS = 5;
export const MAX_COMBO = 5;

export function isCorrect(q: Question, choice: number | boolean): boolean {
  return q.answer === choice;
}

/**
 * Points for one answer.
 * - 10 base, × difficulty weight (1, 1.5, 2)
 * - up to +5 for answering fast (when timed)
 * - combo multiplier for consecutive correct answers (caps at ×1.5)
 */
export function pointsFor(opts: {
  correct: boolean;
  difficulty: 1 | 2 | 3;
  secondsLeft?: number;
  secondsTotal?: number;
  combo: number;
}): number {
  if (!opts.correct) return 0;
  const weight = [1, 1.5, 2][opts.difficulty - 1];
  let pts = BASE_POINTS * weight;
  if (opts.secondsTotal && opts.secondsLeft !== undefined) {
    pts += MAX_TIME_BONUS * Math.max(0, Math.min(1, opts.secondsLeft / opts.secondsTotal));
  }
  const comboMult = 1 + Math.min(opts.combo, MAX_COMBO) * 0.1;
  return Math.round(pts * comboMult);
}

/** XP needed to finish level n (n ≥ 1). Grows gently. */
export function xpForLevel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.35));
}

export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

/** Streak update when a round is finished on `today`. */
export function nextStreak(prev: { streak: number; lastDay?: string }, today: string, yesterday: string) {
  if (prev.lastDay === today) return prev;
  const streak = prev.lastDay === yesterday ? prev.streak + 1 : 1;
  return { streak, lastDay: today };
}
