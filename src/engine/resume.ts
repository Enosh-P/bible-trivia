import type { ModeId } from './modes';
import { dayKey } from './picker';

/**
 * Games in progress, saved on the phone after every question, so a closed
 * game (the X, or the app closed) can be picked up again. Several can be
 * kept (newest first); Home shows the newest, with "Show all" for the rest.
 */
export interface GameSnapshot {
  /** Which game this is (one entry per game played). */
  id: string;
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

const KEY = 'bt-resume-list';
const OLD_KEY = 'bt-resume';
const MAX_AGE = 7 * 86_400_000;
const MAX_GAMES = 8;

function readAll(): Record<string, GameSnapshot> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, GameSnapshot>;
    // The earlier single saved game.
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null') as GameSnapshot | null;
    if (old) {
      all[old.id ?? `old-${old.at}`] = { ...old, id: old.id ?? `old-${old.at}` };
      localStorage.removeItem(OLD_KEY);
    }
    return all;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, GameSnapshot>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked: no resume, nothing else breaks */
  }
}

function usable(s: GameSnapshot) {
  if (!s?.ids?.length || s.index >= s.ids.length) return false;
  if (Date.now() - s.at > MAX_AGE) return false;
  // Today's Challenge belongs to its day.
  return !(s.mode === 'daily' && s.day !== dayKey());
}

export function saveSnapshot(s: Omit<GameSnapshot, 'day' | 'at'>) {
  const all = readAll();
  all[s.id] = { ...s, day: dayKey(), at: Date.now() };
  // Keep the newest few.
  const keep = Object.values(all)
    .filter(usable)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_GAMES);
  writeAll(Object.fromEntries(keep.map((g) => [g.id, g])));
}

/** Games worth resuming, newest first. */
export function loadSnapshots(): GameSnapshot[] {
  return Object.values(readAll())
    .filter(usable)
    .sort((a, b) => b.at - a.at);
}

export function clearSnapshot(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}
