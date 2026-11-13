import { BOOKS, BOOK_BY_CODE } from '../i18n/books';
import type { Question } from './types';
import { hashString, rng, shuffle } from './picker';

/**
 * Books of the Bible drill. Questions are made from their id, so the same id
 * always gives the same question (friend challenges and practice work too):
 *   gen-next-RUT   which book comes right after Ruth?
 *   gen-prev-RUT   which book comes just before Ruth?
 *   gen-test-RUT   Old or New Testament?
 *   gen-first-GEN.RUT.JHN.JOB   which of these comes first?
 */
const ORDER = BOOKS.map((b) => b.code);
const name = (code: string, lang: 'en' | 'ta') => BOOK_BY_CODE[code]?.[lang] ?? code;

function nearby(code: string, exclude: string[], random: () => number, n = 3): string[] {
  const i = ORDER.indexOf(code);
  const pool = ORDER.filter((c, j) => Math.abs(j - i) <= 6 && !exclude.includes(c));
  return shuffle(pool, random).slice(0, n);
}

function mcq(id: string, book: string, q: { en: string; ta: string }, options: string[], answerCode: string, explain: { en: string; ta: string }): Question {
  const random = rng(hashString(id));
  const order = shuffle(options, random);
  return {
    id,
    type: 'mcq',
    book,
    chapter: 0,
    difficulty: 1,
    answer: order.indexOf(answerCode),
    en: { q: q.en, options: order.map((c) => name(c, 'en')), explain: explain.en },
    ta: { q: q.ta, options: order.map((c) => name(c, 'ta')), explain: explain.ta },
    tags: ['drill'],
  };
}

export function drillQuestion(id: string): Question | null {
  const m = /^gen-(next|prev|test|first)-([0-9A-Z.]+)$/.exec(id);
  if (!m) return null;
  const [, kind, arg] = m;
  const random = rng(hashString(id));

  if (kind === 'first') {
    const codes = arg.split('.').filter((c) => ORDER.includes(c));
    if (codes.length < 2) return null;
    const first = [...codes].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
    return mcq(id, first, { en: 'Which of these comes first in the Bible?', ta: 'இவற்றில் வேதாகமத்தில் முதலில் வருவது எது?' }, codes, first, {
      en: `${name(first, 'en')} is book ${ORDER.indexOf(first) + 1} of 66.`,
      ta: `${name(first, 'ta')} 66 புஸ்தகங்களில் ${ORDER.indexOf(first) + 1}-வது.`,
    });
  }

  const code = arg;
  const i = ORDER.indexOf(code);
  if (i < 0) return null;

  if (kind === 'test') {
    const nt = BOOK_BY_CODE[code].testament === 'NT';
    return {
      id,
      type: 'mcq',
      book: code,
      chapter: 0,
      difficulty: 1,
      answer: nt ? 1 : 0,
      en: { q: `Is ${name(code, 'en')} in the Old or the New Testament?`, options: ['Old Testament', 'New Testament'] },
      ta: { q: `${name(code, 'ta')} பழைய ஏற்பாட்டிலா, புதிய ஏற்பாட்டிலா?`, options: ['பழைய ஏற்பாடு', 'புதிய ஏற்பாடு'] },
      tags: ['drill'],
    };
  }

  const j = kind === 'next' ? i + 1 : i - 1;
  if (j < 0 || j >= ORDER.length) return null;
  const answer = ORDER[j];
  const wrong = nearby(answer, [answer, code], random);
  return mcq(
    id,
    code,
    kind === 'next'
      ? { en: `Which book comes right after ${name(code, 'en')}?`, ta: `${name(code, 'ta')}-க்குப் பின் வரும் புஸ்தகம் எது?` }
      : { en: `Which book comes just before ${name(code, 'en')}?`, ta: `${name(code, 'ta')}-க்கு முன் வரும் புஸ்தகம் எது?` },
    [answer, ...wrong],
    answer,
    kind === 'next'
      ? { en: `${name(code, 'en')} → ${name(answer, 'en')}`, ta: `${name(code, 'ta')} → ${name(answer, 'ta')}` }
      : { en: `${name(answer, 'en')} → ${name(code, 'en')}`, ta: `${name(answer, 'ta')} → ${name(code, 'ta')}` },
  );
}

/** A round of drill question ids: a mix of all four kinds. */
export function drillRound(n = 10, random: () => number = Math.random): string[] {
  const ids: string[] = [];
  const kinds = ['next', 'prev', 'test', 'first', 'next', 'prev'];
  while (ids.length < n) {
    const kind = kinds[Math.floor(random() * kinds.length)];
    const code = ORDER[Math.floor(random() * ORDER.length)];
    const id =
      kind === 'first'
        ? `gen-first-${shuffle(ORDER, random).slice(0, 4).join('.')}`
        : `gen-${kind}-${code}`;
    if (!ids.includes(id) && drillQuestion(id)) ids.push(id);
  }
  return ids;
}
