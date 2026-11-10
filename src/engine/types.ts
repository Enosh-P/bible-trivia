export type Lang = 'en' | 'ta';

export type ArtKey = 'ark' | 'fish' | 'lion' | 'sling' | 'bush' | 'star' | 'loaves' | 'horse' | 'tree';

/** How a question is asked. Every type renders as multiple choice except `tf`. */
export type QuestionType =
  | 'mcq' //   general multiple choice
  | 'tf' //    true / false statement
  | 'who' //   "Who said it?"
  | 'book' //  "Which book?"
  | 'blank'; // fill the blank in a verse

export type Difficulty = 1 | 2 | 3;

export interface LocalizedText {
  /** The question or statement. For `blank`, the gap is written as "____". */
  q: string;
  /** Answer options (same order in both languages). Omitted for `tf`. */
  options?: string[];
  /** Short explanation shown after answering. */
  explain?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  /** USFM-style book code, e.g. GEN, JHN, REV. */
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  difficulty: Difficulty;
  /** Index into `options`, or a boolean for `tf`. Same for both languages. */
  answer: number | boolean;
  en: LocalizedText;
  ta: LocalizedText;
  tags?: string[];
  /** Optional cartoon illustration key (see src/art). */
  art?: ArtKey;
}

export interface QuestionPack {
  id: string;
  title: { en: string; ta: string };
  questions: Question[];
}
