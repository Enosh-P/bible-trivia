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
 *   gen-chap-RUT   how many chapters?
 *   gen-group-RUT  which group of books? (Law, History, Poetry, Prophets, Gospels, Letters …)
 *   gen-pos-RUT    which number book is it?
 *   gen-name-RUT   its name in the other language (Tamil ↔ English)
 */
const ORDER = BOOKS.map((b) => b.code);

/** Chapters in each book (1,189 in all). */
export const CHAPTERS: Record<string, number> = {
  GEN: 50, EXO: 40, LEV: 27, NUM: 36, DEU: 34, JOS: 24, JDG: 21, RUT: 4, '1SA': 31, '2SA': 24, '1KI': 22, '2KI': 25,
  '1CH': 29, '2CH': 36, EZR: 10, NEH: 13, EST: 10, JOB: 42, PSA: 150, PRO: 31, ECC: 12, SNG: 8, ISA: 66, JER: 52,
  LAM: 5, EZK: 48, DAN: 12, HOS: 14, JOL: 3, AMO: 9, OBA: 1, JON: 4, MIC: 7, NAM: 3, HAB: 3, ZEP: 3, HAG: 2,
  ZEC: 14, MAL: 4, MAT: 28, MRK: 16, LUK: 24, JHN: 21, ACT: 28, ROM: 16, '1CO': 16, '2CO': 13, GAL: 6, EPH: 6,
  PHP: 4, COL: 4, '1TH': 5, '2TH': 3, '1TI': 6, '2TI': 4, TIT: 3, PHM: 1, HEB: 13, JAS: 5, '1PE': 5, '2PE': 3,
  '1JN': 5, '2JN': 1, '3JN': 1, JUD: 1, REV: 22,
};

/** The usual groups of books, in order. */
export const GROUPS: { en: string; ta: string; books: string[] }[] = [
  { en: 'Law', ta: 'நியாயப்பிரமாணம்', books: ['GEN', 'EXO', 'LEV', 'NUM', 'DEU'] },
  { en: 'History', ta: 'வரலாறு', books: ['JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST'] },
  { en: 'Poetry and wisdom', ta: 'கவிதையும் ஞானமும்', books: ['JOB', 'PSA', 'PRO', 'ECC', 'SNG'] },
  { en: 'Major prophets', ta: 'பெரிய தீர்க்கதரிசிகள்', books: ['ISA', 'JER', 'LAM', 'EZK', 'DAN'] },
  { en: 'Minor prophets', ta: 'சிறிய தீர்க்கதரிசிகள்', books: ['HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL'] },
  { en: 'Gospels', ta: 'சுவிசேஷங்கள்', books: ['MAT', 'MRK', 'LUK', 'JHN'] },
  { en: 'Acts', ta: 'அப்போஸ்தலர் நடபடிகள்', books: ['ACT'] },
  { en: "Paul's letters", ta: 'பவுலின் நிருபங்கள்', books: ['ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM'] },
  { en: 'General letters', ta: 'பொது நிருபங்கள்', books: ['HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD'] },
  { en: 'Prophecy', ta: 'தீர்க்கதரிசனம்', books: ['REV'] },
];
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

/** A question whose options are plain text (numbers, group names) rather than books. */
function textMcq(id: string, book: string, q: { en: string; ta: string }, options: { en: string; ta: string }[], answer: number, explain?: { en: string; ta: string }): Question {
  const random = rng(hashString(id));
  const order = shuffle(options.map((_, i) => i), random);
  return {
    id,
    type: 'mcq',
    book,
    chapter: 0,
    difficulty: 1,
    answer: order.indexOf(answer),
    en: { q: q.en, options: order.map((i) => options[i].en), ...(explain ? { explain: explain.en } : {}) },
    ta: { q: q.ta, options: order.map((i) => options[i].ta), ...(explain ? { explain: explain.ta } : {}) },
    tags: ['drill'],
  };
}

/** Three wrong numbers near the right one (all different, all at least 1). */
function nearNumbers(n: number, random: () => number, max = Infinity): number[] {
  const spread = Math.max(3, Math.round(n * 0.4));
  const out = new Set<number>();
  for (let tries = 0; out.size < 3 && tries < 200; tries++) {
    const x = n + Math.round((random() * 2 - 1) * spread);
    if (x !== n && x >= 1 && x <= max) out.add(x);
  }
  for (let x = n + 1; out.size < 3; x++) if (x !== n) out.add(x);
  return [...out];
}

export function drillQuestion(id: string): Question | null {
  const m = /^gen-(next|prev|test|first|chap|group|pos|name)-([0-9A-Z.]+)$/.exec(id);
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

  if (kind === 'chap') {
    const n = CHAPTERS[code];
    const opts = [n, ...nearNumbers(n, random)].map((x) => ({ en: String(x), ta: String(x) }));
    return textMcq(id, code, { en: `How many chapters does ${name(code, 'en')} have?`, ta: `${name(code, 'ta')} புஸ்தகத்தில் எத்தனை அதிகாரங்கள்?` }, opts, 0, {
      en: `${name(code, 'en')} has ${n} chapter${n === 1 ? '' : 's'}.`,
      ta: `${name(code, 'ta')}: ${n} அதிகாரம்.`,
    });
  }

  if (kind === 'group') {
    const g = GROUPS.findIndex((x) => x.books.includes(code));
    const wrong = shuffle(GROUPS.map((_, k) => k).filter((k) => k !== g), random).slice(0, 3);
    const opts = [g, ...wrong].map((k) => ({ en: GROUPS[k].en, ta: GROUPS[k].ta }));
    return textMcq(id, code, { en: `Which group of books is ${name(code, 'en')} in?`, ta: `${name(code, 'ta')} எந்தப் பிரிவைச் சேர்ந்த புஸ்தகம்?` }, opts, 0);
  }

  if (kind === 'pos') {
    const n = i + 1;
    const opts = [n, ...nearNumbers(n, random, 66)].map((x) => ({ en: String(x), ta: String(x) }));
    return textMcq(id, code, { en: `${name(code, 'en')} is which book of the Bible (1 to 66)?`, ta: `${name(code, 'ta')} வேதாகமத்தின் எத்தனையாவது புஸ்தகம் (1 முதல் 66)?` }, opts, 0);
  }

  if (kind === 'name') {
    // English players pick the Tamil name; Tamil players pick the English one.
    const wrong = nearby(code, [code], random);
    const opts = [code, ...wrong].map((c) => ({ en: name(c, 'ta'), ta: name(c, 'en') }));
    return textMcq(id, code, { en: `What is ${name(code, 'en')} called in Tamil?`, ta: `${name(code, 'ta')} ஆங்கிலத்தில் எப்படி அழைக்கப்படுகிறது?` }, opts, 0);
  }

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
      ? { en: `Which book comes right after ${name(code, 'en')}?`, ta: `${name(code, 'ta')} புஸ்தகத்திற்குப் பின் வரும் புஸ்தகம் எது?` }
      : { en: `Which book comes just before ${name(code, 'en')}?`, ta: `${name(code, 'ta')} புஸ்தகத்திற்கு முன் வரும் புஸ்தகம் எது?` },
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
  const kinds = ['next', 'prev', 'test', 'first', 'chap', 'group', 'pos', 'name', 'next', 'chap'];
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
