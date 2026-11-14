import { BOOKS, BOOK_BY_CODE } from '../i18n/books';
import type { Question } from './types';
import type { Verse } from './verses';
import { hashString, rng, shuffle } from './picker';

/**
 * Questions made from ones the app already has (both languages, no new translation):
 *   True or False:  "tf~<question id>"      a multiple-choice question with one suggested
 *                                           answer, right about half the time
 *   Which Book?:    "wb~<question id>"      a saying (Who Said It) - which book is it from?
 *                   "wb~v~<verse id>"       a well-known verse - which book is it from?
 * The id says how to make the question, so the same id always gives the same question
 * (friend challenges, practice and resumed games work too).
 */

/** Questions that read badly as true/false ("all of the following EXCEPT", "which is NOT"). */
const NEGATIVE = /\b(except|not|never|false|least)\b/i;
const ORDER = BOOKS.map((b) => b.code);

export function trueFalseFrom(q: Question): Question | null {
  if ((q.type !== 'mcq' && q.type !== 'blank' && q.type !== 'who') || typeof q.answer !== 'number') return null;
  const en = q.en;
  const ta = q.ta;
  if (!en.options || !ta.options || NEGATIVE.test(en.q)) return null;
  const random = rng(hashString(`tf~${q.id}`));
  const right = q.answer;
  const truth = random() < 0.5;
  const wrongs = en.options.map((_, i) => i).filter((i) => i !== right);
  const pick = truth ? right : wrongs[Math.floor(random() * wrongs.length)];

  const statement = (lang: 'en' | 'ta') => {
    const L = q[lang];
    const option = L.options![pick];
    if (q.type === 'blank' && L.q.includes('____')) return L.q.replace('____', option);
    if (q.type === 'who') return `${L.q} — ${option}`;
    return `${L.q}\n→ ${option}`;
  };
  const answerLine = (lang: 'en' | 'ta') => `${lang === 'ta' ? 'சரியான விடை' : 'Right answer'}: ${q[lang].options![right]}`;

  return {
    id: `tf~${q.id}`,
    type: 'tf',
    book: q.book,
    chapter: q.chapter,
    ...(q.verse ? { verse: q.verse } : {}),
    difficulty: q.difficulty,
    answer: truth,
    en: { q: statement('en'), explain: answerLine('en') },
    ta: { q: statement('ta'), explain: answerLine('ta') },
    tags: [...(q.tags ?? []), 'derived'],
  };
}

/** Three wrong books near the right one (same part of the Bible, so it isn't too easy). */
function nearbyBooks(code: string, random: () => number): string[] {
  const i = ORDER.indexOf(code);
  const near = ORDER.filter((c, j) => c !== code && Math.abs(j - i) <= 8);
  return shuffle(near, random).slice(0, 3);
}

function bookQuestion(id: string, code: string, chapter: number, verse: number | undefined, text: { en: string; ta: string }): Question {
  const random = rng(hashString(id));
  const options = shuffle([code, ...nearbyBooks(code, random)], random);
  const name = (c: string, lang: 'en' | 'ta') => BOOK_BY_CODE[c]?.[lang] ?? c;
  return {
    id,
    type: 'book',
    book: code,
    chapter,
    ...(verse ? { verse } : {}),
    difficulty: 2,
    answer: options.indexOf(code),
    en: { q: text.en, options: options.map((c) => name(c, 'en')) },
    ta: { q: text.ta, options: options.map((c) => name(c, 'ta')) },
    tags: ['derived'],
  };
}

/** A saying from Who Said It: which book is it in? */
export function whichBookFromSaying(q: Question): Question | null {
  if (q.type !== 'who') return null;
  return bookQuestion(`wb~${q.id}`, q.book, q.chapter, q.verse, { en: q.en.q, ta: q.ta.q });
}

/** A well-known verse: which book is it in? */
export function whichBookFromVerse(v: Verse): Question {
  return bookQuestion(`wb~v~${v.id}`, v.book, v.chapter, v.verse, { en: v.en, ta: v.ta });
}

/** The question an id like "tf~bq-GEN-x" or "wb~bq-GEN-x" is made from (null for "wb~v~"). */
export function baseIdOf(id: string): string | null {
  const m = /^(?:tf|wb)~(?!v~)(.+)$/.exec(id);
  return m ? m[1] : null;
}
