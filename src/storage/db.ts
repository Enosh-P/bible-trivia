import Dexie, { type EntityTable } from 'dexie';
import type { Question } from '../engine/types';

/** One answer the player gave. Drives mastery, review queue and stats. */
export interface AnswerRecord {
  id?: number;
  questionId: string;
  book: string;
  correct: boolean;
  mode: string;
  at: number;
  /** Unique across devices ("<device>-<n>"), so syncing never doubles an answer. */
  clientKey?: string;
  /** 0 until sent to the account (Supabase practice_answers). */
  synced?: 0 | 1;
}

/** One finished round. */
export interface RoundRecord {
  id?: number;
  mode: string;
  day: string;
  score: number;
  correct: number;
  total: number;
  xp: number;
  at: number;
}

/** A starred question. `saved: 0` means un-starred (kept so other devices hear about it). */
export interface SavedRow {
  id: string;
  at: number;
  saved?: 0 | 1;
  updatedAt?: number;
}

/** This device's id, part of every answer's clientKey. */
export function deviceId(): string {
  const KEY = 'bt-device';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return 'nostore';
  }
}

export const db = new Dexie('bible-trivia') as Dexie & {
  answers: EntityTable<AnswerRecord, 'id'>;
  rounds: EntityTable<RoundRecord, 'id'>;
  /** Questions downloaded from Supabase (newer than the bundled packs). */
  remoteQuestions: EntityTable<Question, 'id'>;
  /** Question ids reviewers took out of circulation (also hides bundled ones). */
  withdrawn: EntityTable<{ id: string }, 'id'>;
  /** Reports made offline, sent when the device is back online. */
  pendingReports: EntityTable<{ id?: number; report: unknown; at: number }, 'id'>;
  /** Recall cards per book, as last downloaded from Supabase (offline copy). */
  recallBooks: EntityTable<{ book: string; cards: unknown[]; at: number }, 'book'>;
  /** Results played offline (daily challenge, friend challenges), sent when back online. */
  outbox: EntityTable<{ id?: number; job: unknown; at: number }, 'id'>;
  /** Questions starred during a game, to practise later. */
  saved: EntityTable<SavedRow, 'id'>;
};

db.version(1).stores({
  answers: '++id, questionId, book, at',
  rounds: '++id, mode, day, at',
});
db.version(2).stores({
  remoteQuestions: 'id, book, type',
});
db.version(3).stores({
  withdrawn: 'id',
});
db.version(4).stores({
  pendingReports: '++id, at',
});
db.version(5).stores({
  recallBooks: 'book',
});
db.version(6).stores({
  outbox: '++id, at',
});
db.version(7).stores({
  saved: 'id, at',
});
// v8: answers and saved questions sync with the account.
db.version(8)
  .stores({
    answers: '++id, questionId, book, at, synced, &clientKey',
    saved: 'id, at, updatedAt',
  })
  .upgrade(async (tx) => {
    const dev = deviceId();
    await tx
      .table('answers')
      .toCollection()
      .modify((a: AnswerRecord) => {
        a.clientKey ??= `${dev}-${a.id}`;
        a.synced ??= 0;
      });
    await tx
      .table('saved')
      .toCollection()
      .modify((r: SavedRow) => {
        r.saved ??= 1;
        r.updatedAt ??= r.at;
      });
  });

/** Records one answer (it's sent to the account by src/online/practiceSync.ts). */
export function recordAnswer(a: Omit<AnswerRecord, 'id' | 'clientKey' | 'synced'>) {
  const clientKey = `${deviceId()}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return db.answers.add({ ...a, clientKey, synced: 0 });
}

/** Starred questions, newest first. */
export async function savedIds(): Promise<string[]> {
  const rows = await db.saved.orderBy('at').reverse().toArray();
  return rows.filter((r) => r.saved !== 0).map((r) => r.id);
}

/** Question ids answered wrong (and not answered right since). */
export async function weakQuestionIds(): Promise<Set<string>> {
  const all = await db.answers.orderBy('at').toArray();
  const last = new Map<string, boolean>();
  for (const a of all) last.set(a.questionId, a.correct);
  return new Set([...last].filter(([, ok]) => !ok).map(([id]) => id));
}

/** Question ids seen in the last 2 days. */
export async function recentQuestionIds(): Promise<Set<string>> {
  const since = Date.now() - 2 * 24 * 3600 * 1000;
  const rows = await db.answers.where('at').above(since).toArray();
  return new Set(rows.map((r) => r.questionId));
}

/** Correct answers per book code. */
export async function correctByBook(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await db.answers.each((a) => {
    if (a.correct) out[a.book] = (out[a.book] ?? 0) + 1;
  });
  return out;
}
