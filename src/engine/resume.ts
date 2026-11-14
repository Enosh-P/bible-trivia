import type { ModeId } from './modes';
import { dayKey } from './picker';

/**
 * A game in progress, saved on the phone after every question, so a closed
 * game (the X, or the app closed) can be picked up again from Home.
 */
export interface GameSnapshot {
  mode: ModeId;
  /** The round's questions, in order. */
  ids: string[];
  /** The question to show next. */
  index: number;
  score: number;
  combo: number;
  bestCombo: number;
  lives: number;
  roundLeft: number;
  log: { id: string; choice: number | boolean | null; correct: boolean }[];
  scope?: { book: string; chapter: number | null };
  challengeId?: string;
  day: string;
  at: number;
}

const KEY = 'bt-resume';
const MAX_AGE = 3 * 86_400_000;

export function saveSnapshot(s: Omit<GameSnapshot, 'day' | 'at'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, day: dayKey(), at: Date.now() }));
  } catch {
    /* storage full or blocked: no resume, nothing else breaks */
  }
}

/** The saved game, if there is one worth resuming. */
export function loadSnapshot(): GameSnapshot | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GameSnapshot | null;
    if (!s || !s.ids?.length || s.index >= s.ids.length) return null;
    if (Date.now() - s.at > MAX_AGE) return null;
    // Today's Challenge belongs to its day.
    if (s.mode === 'daily' && s.day !== dayKey()) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* fine */
  }
}
