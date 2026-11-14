import type { QuestionType } from './types';

export type Horse = 'white' | 'red' | 'black' | 'pale';

export type ModeId =
  | 'classic'
  | 'daily'
  | 'truefalse'
  | 'who'
  | 'book'
  | 'blank'
  | 'study'
  | 'speed'
  | 'survival'
  | 'recall'
  | 'quiz'
  | 'practice'
  | 'drill';

export interface ModeDef {
  id: ModeId;
  horse: Horse;
  /** Which question types this mode draws from. */
  types: QuestionType[];
  /** How many questions in a round. `Infinity` for endless modes. */
  length: number;
  /** Seconds per question. 0 = no timer. */
  perQuestion: number;
  /** Seconds for the whole round (Speed). */
  roundSeconds?: number;
  lives?: number;
  /** Show the explanation after each answer and wait for "Next". */
  study?: boolean;
}

const MC: QuestionType[] = ['mcq', 'who', 'book', 'blank'];

/*
 * Horse → mode mapping (Revelation 6):
 *   white  conquest  → Classic, Daily
 *   red    war       → Speed, Survival
 *   black  balances  → True/False, Which Book
 *   pale   chlōros   → Who Said It, Fill the Blank, Study
 */
export const MODES: Record<ModeId, ModeDef> = {
  classic: { id: 'classic', horse: 'white', types: [...MC, 'tf'], length: 10, perQuestion: 20 },
  daily: { id: 'daily', horse: 'white', types: [...MC, 'tf'], length: 7, perQuestion: 20 },
  truefalse: { id: 'truefalse', horse: 'black', types: ['tf'], length: 10, perQuestion: 20 },
  book: { id: 'book', horse: 'black', types: ['book'], length: 8, perQuestion: 20 },
  who: { id: 'who', horse: 'pale', types: ['who'], length: 8, perQuestion: 20 },
  blank: { id: 'blank', horse: 'pale', types: ['blank'], length: 8, perQuestion: 25 },
  study: { id: 'study', horse: 'pale', types: [...MC, 'tf'], length: 10, perQuestion: 0, study: true },
  speed: { id: 'speed', horse: 'red', types: [...MC, 'tf'], length: Infinity, perQuestion: 0, roundSeconds: 60 },
  survival: { id: 'survival', horse: 'red', types: [...MC, 'tf'], length: Infinity, perQuestion: 15, lives: 3 },
  // Recall uses its own screen and the human-written question packs, not this engine.
  // Quiz by book: multiple choice from one book or chapter (src/engine/mcq.ts).
  quiz: { id: 'quiz', horse: 'pale', types: ['mcq', 'blank', 'who'], length: 10, perQuestion: 25 },
  // Practice tab: your mistakes, reviews and saved questions; no timer, explanation after each.
  practice: { id: 'practice', horse: 'pale', types: [...MC, 'tf'], length: 20, perQuestion: 0, study: true },
  // Books of the Bible drill (questions made in src/engine/drill.ts).
  drill: { id: 'drill', horse: 'black', types: ['mcq'], length: 10, perQuestion: 15 },
  recall: { id: 'recall', horse: 'pale', types: [], length: 15, perQuestion: 0, study: true },
};

export const MODE_ORDER: ModeId[] = ['quiz', 'classic', 'drill', 'recall', 'truefalse', 'who', 'book', 'blank', 'speed', 'survival', 'study'];
