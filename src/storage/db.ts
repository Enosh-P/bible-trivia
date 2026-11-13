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
  saved: EntityTable<{ id: string; at: number }, 'id'>;
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
