/**
 * Practice: worked out from the answers stored on the phone (IndexedDB).
 *
 * - To fix: questions answered wrong that haven't been answered right twice in a row since.
 * - Review: questions you know come back after 1, 3, 7, 14, then 30 days (spaced repetition).
 * - Weak spots: accuracy per book.
 * Recall cards (self-marked) and Books-drill questions are left out.
 */
export interface AnswerLike {
  questionId: string;
  book: string;
  correct: boolean;
  mode: string;
  at: number;
}

/** Days until a known question comes back, by how many times in a row it was right. */
export const REVIEW_DAYS = [1, 3, 7, 14, 30];
/** Right answers in a row that take a question off the "to fix" list. */
export const FIXED_AFTER = 2;
const DAY = 86_400_000;

export interface BookStat {
  book: string;
  answered: number;
  correct: number;
  pct: number;
}

export interface PracticeSummary {
  /** Newest mistakes first. */
  toFix: string[];
  /** Most overdue first. */
  due: string[];
  /** Books with at least `minAnswers` answers, weakest first. */
  books: BookStat[];
}

export function counts(id: string, mode: string) {
  return mode !== 'recall' && !id.startsWith('uw-') && !id.startsWith('gen-');
}

export function summarize(answers: AnswerLike[], now = Date.now(), minAnswers = 5): PracticeSummary {
  const byQ = new Map<string, AnswerLike[]>();
  const byBook = new Map<string, { answered: number; correct: number }>();
  for (const a of answers) {
    if (!counts(a.questionId, a.mode)) continue;
    const list = byQ.get(a.questionId) ?? [];
    list.push(a);
    byQ.set(a.questionId, list);
    const b = byBook.get(a.book) ?? { answered: 0, correct: 0 };
    b.answered++;
    if (a.correct) b.correct++;
    byBook.set(a.book, b);
  }

  const fix: { id: string; at: number }[] = [];
  const due: { id: string; over: number }[] = [];
  for (const [id, list] of byQ) {
    list.sort((x, y) => x.at - y.at);
    let run = 0; // right answers in a row at the end
    for (let i = list.length - 1; i >= 0 && list[i].correct; i--) run++;
    const everWrong = list.some((a) => !a.correct);
    const last = list[list.length - 1];
    if (everWrong && run < FIXED_AFTER) {
      fix.push({ id, at: last.at });
      continue;
    }
    const wait = REVIEW_DAYS[Math.min(run, REVIEW_DAYS.length) - 1] * DAY;
    const over = now - (last.at + wait);
    if (over >= 0) due.push({ id, over });
  }

  return {
    toFix: fix.sort((a, b) => b.at - a.at).map((x) => x.id),
    due: due.sort((a, b) => b.over - a.over).map((x) => x.id),
    books: [...byBook]
      .filter(([, s]) => s.answered >= minAnswers)
      .map(([book, s]) => ({ book, ...s, pct: Math.round((s.correct / s.answered) * 100) }))
      .sort((a, b) => a.pct - b.pct || b.answered - a.answered),
  };
}
