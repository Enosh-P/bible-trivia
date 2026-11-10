import { describe, expect, it } from 'vitest';
import { ALL_QUESTIONS } from '../src/engine/content';
import { MODES } from '../src/engine/modes';
import { pickDaily, pickQuestions, rng } from '../src/engine/picker';
import { levelFromXp, nextStreak, pointsFor } from '../src/engine/scoring';
import { project, rubberband } from '../src/motion/springs';

describe('picker', () => {
  it('daily challenge is the same for everyone on a day, and differs across days', () => {
    const a = pickDaily(ALL_QUESTIONS, MODES.daily, '2026-11-10').map((q) => q.id);
    const b = pickDaily(ALL_QUESTIONS, MODES.daily, '2026-11-10').map((q) => q.id);
    const c = pickDaily(ALL_QUESTIONS, MODES.daily, '2026-11-11').map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(7);
  });

  it('only picks the question types a mode allows', () => {
    for (const mode of Object.values(MODES).filter((m) => m.id !== 'recall')) {
      const qs = pickQuestions(ALL_QUESTIONS, mode, { random: rng(1) });
      expect(qs.length).toBeGreaterThan(0);
      for (const q of qs) expect(mode.types).toContain(q.type);
      if (Number.isFinite(mode.length)) expect(qs.length).toBeLessThanOrEqual(mode.length);
    }
  });

  it('every finite mode has enough questions for a full round', () => {
    for (const mode of Object.values(MODES).filter((m) => m.id !== 'recall')) {
      if (!Number.isFinite(mode.length)) continue;
      const pool = ALL_QUESTIONS.filter((q) => mode.types.includes(q.type));
      expect(pool.length, mode.id).toBeGreaterThanOrEqual(mode.length);
    }
  });
});

describe('scoring', () => {
  it('gives nothing for a wrong answer', () => {
    expect(pointsFor({ correct: false, difficulty: 3, combo: 4 })).toBe(0);
  });
  it('rewards difficulty, speed and combo', () => {
    const base = pointsFor({ correct: true, difficulty: 1, combo: 0 });
    expect(base).toBe(10);
    expect(pointsFor({ correct: true, difficulty: 3, combo: 0 })).toBeGreaterThan(base);
    expect(pointsFor({ correct: true, difficulty: 1, combo: 0, secondsLeft: 20, secondsTotal: 20 })).toBe(15);
    expect(pointsFor({ correct: true, difficulty: 1, combo: 5 })).toBe(15);
    expect(pointsFor({ correct: true, difficulty: 1, combo: 50 })).toBe(15);
  });
  it('levels up', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
  });
  it('tracks streaks', () => {
    expect(nextStreak({ streak: 3, lastDay: '2026-11-09' }, '2026-11-10', '2026-11-09').streak).toBe(4);
    expect(nextStreak({ streak: 3, lastDay: '2026-11-07' }, '2026-11-10', '2026-11-09').streak).toBe(1);
    expect(nextStreak({ streak: 3, lastDay: '2026-11-10' }, '2026-11-10', '2026-11-09').streak).toBe(3);
  });
});

describe('motion helpers', () => {
  it('projects momentum forward in the flick direction', () => {
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(-1000)).toBeLessThan(0);
  });
  it('rubber-bands with diminishing returns', () => {
    const a = rubberband(100, 400);
    const b = rubberband(200, 400);
    expect(a).toBeLessThan(100);
    expect(b - a).toBeLessThan(a);
  });
});
