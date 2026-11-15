import data from '../../content/gospel.json';
import type { Lang } from './types';

/*
 * Gospel questions and answers. They live in the database (table gospel_faqs,
 * edited by admins in Admin -> Gospel Q&A); the ones the app shipped with are
 * the fallback until the database has been set up or reached once.
 */

export type FaqTopic = 'god' | 'life' | 'sin' | 'salvation' | 'following' | 'other';
export const FAQ_TOPICS: FaqTopic[] = ['god', 'life', 'sin', 'salvation', 'following', 'other'];

export interface GospelFaq {
  id: string;
  topic: FaqTopic;
  sort: number;
  question_en: string;
  question_ta: string;
  /** Simple formatting: paragraphs, **bold**, *italic*, lists (same as Daily Thoughts). */
  answer_en: string;
  answer_ta: string;
  /** 'JHN 3:16' or 'JHN 3:16-18' */
  verse_refs: string[];
  /** Further-reading source ids (content/gospel.json). */
  reading: string[];
  status: 'draft' | 'published';
  updated_at?: string;
}

export type FaqDraft = Omit<GospelFaq, 'id' | 'updated_at'> & { id?: string };

const SHIPPED_TOPIC: Record<string, FaqTopic> = {
  exists: 'god',
  religions: 'god',
  meaning: 'life',
  suffering: 'sin',
  'good-person': 'sin',
  'why-cross': 'salvation',
  'how-saved': 'salvation',
  'too-sinful': 'salvation',
  family: 'following',
  assurance: 'following',
};

type Shipped = { id: string; verses: string[]; reading: string[]; q: { en: string; ta: string }; a: { en: string; ta: string } };

/** The questions the app shipped with (same as the database starts with). */
export const SHIPPED_FAQS: GospelFaq[] = (data.faqs as Shipped[]).map((f, i) => ({
  id: f.id,
  topic: SHIPPED_TOPIC[f.id] ?? 'other',
  sort: (i + 1) * 10,
  question_en: f.q.en,
  question_ta: f.q.ta,
  answer_en: f.a.en,
  answer_ta: f.a.ta,
  verse_refs: f.verses.map((v) => {
    const [b, c, n] = v.split('.');
    return `${b} ${c}:${n}`;
  }),
  reading: f.reading,
  status: 'published',
}));

/** Topic order, then the admin's order within a topic. */
export function sortFaqs<T extends Pick<GospelFaq, 'topic' | 'sort' | 'id'>>(faqs: T[]): T[] {
  return [...faqs].sort(
    (a, b) => FAQ_TOPICS.indexOf(a.topic) - FAQ_TOPICS.indexOf(b.topic) || a.sort - b.sort || (a.id < b.id ? -1 : 1),
  );
}

/** The question / answer in a language, falling back to the other one if it wasn't written. */
export function faqText(f: Pick<GospelFaq, 'question_en' | 'question_ta' | 'answer_en' | 'answer_ta'>, lang: Lang) {
  const other: Lang = lang === 'en' ? 'ta' : 'en';
  const q = f[`question_${lang}`] || f[`question_${other}`];
  const a = f[`answer_${lang}`] || f[`answer_${other}`];
  const qLang: Lang = f[`question_${lang}`] ? lang : other;
  const aLang: Lang = f[`answer_${lang}`] ? lang : other;
  return { q, a, qLang, aLang };
}

/** Every word typed must appear in the question or answer, in either language. */
export function faqMatches(f: Pick<GospelFaq, 'question_en' | 'question_ta' | 'answer_en' | 'answer_ta'>, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${f.question_en} ${f.question_ta} ${f.answer_en} ${f.answer_ta}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function emptyFaq(topic: FaqTopic = 'other', sort = 1000): FaqDraft {
  return { topic, sort, question_en: '', question_ta: '', answer_en: '', answer_ta: '', verse_refs: [], reading: [], status: 'draft' };
}

/** Why it can't be published yet, or null. */
export function faqProblem(d: FaqDraft): 'question' | 'answer' | null {
  if (!d.question_en.trim() && !d.question_ta.trim()) return 'question';
  const pairs: [string, string][] = [
    [d.question_en, d.answer_en],
    [d.question_ta, d.answer_ta],
  ];
  // Each language that has a question needs its answer.
  if (pairs.some(([q, a]) => q.trim() && !a.trim())) return 'answer';
  return null;
}
