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

/** Every 5 streak days earns a heart; at most this many are kept. */
export const HEART_EVERY = 5;
export const MAX_HEARTS = 3;

/** Whole days from one "YYYY-MM-DD" to another. */
export function daysBetween(from: string, to: string): number {
  const utc = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export interface StreakState {
  streak: number;
  lastDay?: string;
  hearts?: number;
}

/**
 * Streak update when a round is finished on `today`.
 * Missed days are healed with hearts, one heart per day, if there are enough;
 * otherwise the streak starts again. Reaching 5, 10, 15… days earns a heart.
 */
export function nextStreak(prev: StreakState, today: string): StreakState & { healed: number; earned: boolean } {
  const hearts = prev.hearts ?? 0;
  if (prev.lastDay === today) return { ...prev, hearts, healed: 0, earned: false };
  const missed = prev.lastDay ? daysBetween(prev.lastDay, today) - 1 : Infinity;
  let streak = 1;
  let left = hearts;
  let healed = 0;
  if (missed <= 0) streak = prev.streak + 1;
  else if (missed <= hearts) {
    healed = missed;
    left = hearts - missed;
    streak = prev.streak + 1;
  }
  const earned = streak > 1 && streak % HEART_EVERY === 0 && left < MAX_HEARTS;
  return { streak, lastDay: today, hearts: earned ? left + 1 : left, healed, earned };
}

/** The streak as it stands today (before playing): 0 once it can no longer be saved. */
export function liveStreak(s: StreakState, today: string): number {
  if (!s.lastDay) return 0;
  const missed = daysBetween(s.lastDay, today) - 1;
  return missed <= (s.hearts ?? 0) ? s.streak : 0;
}
