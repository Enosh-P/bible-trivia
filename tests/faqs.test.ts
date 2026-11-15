import { describe, expect, it } from 'vitest';
import { SHIPPED_FAQS, emptyFaq, faqMatches, faqProblem, faqText, sortFaqs, FAQ_TOPICS } from '../src/engine/faqs';
import { parseVerseRef } from '../src/engine/verseRef';

describe('Gospel Q&A', () => {
  it('ships the 10 original questions with topics and readable verse references', () => {
    expect(SHIPPED_FAQS).toHaveLength(10);
    for (const f of SHIPPED_FAQS) {
      expect(FAQ_TOPICS).toContain(f.topic);
      expect(f.question_en && f.question_ta && f.answer_en && f.answer_ta).toBeTruthy();
      for (const r of f.verse_refs) expect(parseVerseRef(r), r).not.toBeNull();
    }
  });

  it('sorts by topic, then by the admin order', () => {
    const sorted = sortFaqs([
      { id: 'b', topic: 'salvation' as const, sort: 20 },
      { id: 'a', topic: 'god' as const, sort: 50 },
      { id: 'c', topic: 'salvation' as const, sort: 10 },
    ]);
    expect(sorted.map((f) => f.id)).toEqual(['a', 'c', 'b']);
  });

  it('finds questions by words in either language', () => {
    const f = SHIPPED_FAQS.find((x) => x.id === 'exists')!;
    expect(faqMatches(f, 'god exist')).toBe(true);
    expect(faqMatches(f, 'தேவன்')).toBe(true);
    expect(faqMatches(f, 'baptism')).toBe(false);
    expect(faqMatches(f, '  ')).toBe(true);
  });

  it('falls back to the other language when one was not written', () => {
    const d = { ...emptyFaq(), question_en: 'Q?', answer_en: 'A.' };
    expect(faqText(d, 'ta')).toMatchObject({ q: 'Q?', qLang: 'en', a: 'A.', aLang: 'en' });
  });

  it('needs a question, and an answer for each language that has one, before publishing', () => {
    expect(faqProblem(emptyFaq())).toBe('question');
    expect(faqProblem({ ...emptyFaq(), question_ta: 'கேள்வி?' })).toBe('answer');
    expect(faqProblem({ ...emptyFaq(), question_ta: 'கேள்வி?', answer_ta: 'பதில்.' })).toBeNull();
  });
});
