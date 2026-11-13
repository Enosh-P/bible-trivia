import ot from '../../content/packs/old-testament.json';
import nt from '../../content/packs/new-testament.json';
import type { Question, QuestionPack } from './types';
import { db } from '../storage/db';
import { bookOfId, loadMcqBook, loadMcqBooks, loadWhoSaid, pickBooks } from './mcq';
import { dayKey, shuffle } from './picker';
import { cachedBooks } from '../online/stock';
import { drillQuestion } from './drill';

export const PACKS = [ot, nt] as unknown as QuestionPack[];

export const ALL_QUESTIONS: Question[] = PACKS.flatMap((p) => p.questions);

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  ALL_QUESTIONS.map((q) => [q.id, q]),
);

/**
 * Bundled questions plus any downloaded from the database.
 * A downloaded question with the same id replaces the bundled one (it is newer).
 */
export async function questionPool(): Promise<Question[]> {
  try {
    const [remote, withdrawn] = await Promise.all([db.remoteQuestions.toArray(), db.withdrawn.toCollection().primaryKeys()]);
    if (!remote.length && !withdrawn.length) return ALL_QUESTIONS;
    const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
    for (const q of remote) byId.set(q.id, q);
    for (const id of withdrawn) byId.delete(id as string);
    return [...byId.values()];
  } catch {
    return ALL_QUESTIONS;
  }
}

/** Where a round's questions come from. */
export type RoundSource =
  | { kind: 'mix' } //                         starter questions + a few random books
  | { kind: 'who' } //                         Who Said It?: every quote
  | { kind: 'daily'; day?: string } //         the same books for everyone that day
  | { kind: 'book'; book: string; chapter: number | null } // Quiz by book
  | { kind: 'ids'; ids: string[] }; //         a friend challenge: exactly these questions

export async function roundPool(source: RoundSource): Promise<Question[]> {
  switch (source.kind) {
    case 'book': {
      const qs = await loadMcqBook(source.book);
      return source.chapter === null ? qs : qs.filter((q) => q.chapter === source.chapter);
    }
    case 'daily': {
      // Only the book questions, sorted, so every phone builds the same round.
      const qs = await loadMcqBooks(pickBooks(`daily:${source.day ?? dayKey()}`, 4));
      return qs.length ? qs.sort((a, b) => (a.id < b.id ? -1 : 1)) : questionPool();
    }
    case 'ids': {
      const books = [...new Set(source.ids.map(bookOfId).filter((b): b is string => Boolean(b)))];
      const [base, extra] = await Promise.all([questionPool(), loadMcqBooks(books)]);
      // Books-drill questions are made from their id.
      const drill = source.ids.map(drillQuestion).filter((q): q is Question => Boolean(q));
      return [...base, ...extra, ...drill];
    }
    case 'who': {
      const [base, who] = await Promise.all([questionPool(), loadWhoSaid().catch(() => [] as Question[])]);
      return [...base, ...who];
    }
    default: {
      // Offline: mix from the books already on the phone.
      const books = navigator.onLine ? pickBooks(`mix:${Math.random()}`) : shuffle([...(await cachedBooks())]).slice(0, 5);
      const [base, extra] = await Promise.all([questionPool(), loadMcqBooks(books)]);
      return [...base, ...extra];
    }
  }
}
