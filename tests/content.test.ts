import { describe, expect, it } from 'vitest';
import { ALL_QUESTIONS, PACKS } from '../src/engine/content';
import { BOOK_BY_CODE, BOOKS } from '../src/i18n/books';
import { ART_KEYS } from '../src/art/Illustrations';

/** Validates every question in content/packs. Run before merging new content. */
describe('question content', () => {
  it('has 66 books', () => {
    expect(BOOKS).toHaveLength(66);
    expect(new Set(BOOKS.map((b) => b.code)).size).toBe(66);
  });

  it('has unique ids', () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const pack of PACKS) {
    for (const q of pack.questions) {
      it(`${pack.id}/${q.id} is valid in both languages`, () => {
        expect(BOOK_BY_CODE[q.book], `unknown book ${q.book}`).toBeTruthy();
        expect(q.chapter).toBeGreaterThan(0);
        expect([1, 2, 3]).toContain(q.difficulty);
        expect(q.en.q.trim()).not.toBe('');
        expect(q.ta.q.trim()).not.toBe('');
        // Tamil text should actually contain Tamil script.
        expect(q.ta.q).toMatch(/[஀-௿]/);
        if (q.art) expect(ART_KEYS).toContain(q.art);

        if (q.type === 'tf') {
          expect(typeof q.answer).toBe('boolean');
          expect(q.en.options).toBeUndefined();
        } else {
          expect(typeof q.answer).toBe('number');
          expect(q.en.options?.length).toBe(4);
          expect(q.ta.options?.length).toBe(4);
          expect(q.answer as number).toBeGreaterThanOrEqual(0);
          expect(q.answer as number).toBeLessThan(4);
          expect(new Set(q.en.options).size).toBe(4);
          expect(new Set(q.ta.options).size).toBe(4);
        }
        if (q.type === 'blank') {
          expect(q.en.q).toContain('____');
          expect(q.ta.q).toContain('____');
        }
      });
    }
  }
});

import { VERSES, verseOfTheDay } from '../src/engine/verses';

describe('verses', () => {
  it('are valid and bilingual', () => {
    const ids = new Set<string>();
    for (const v of VERSES) {
      expect(BOOK_BY_CODE[v.book], v.id).toBeTruthy();
      expect(v.id).toBe(`${v.book}.${v.chapter}.${v.verse}`);
      expect(v.en.trim()).not.toBe('');
      expect(v.ta).toMatch(/[஀-௿]/);
      expect(ids.has(v.id)).toBe(false);
      ids.add(v.id);
    }
  });
  it('verse of the day is stable for a day and does not repeat within a cycle', () => {
    expect(verseOfTheDay('2026-11-10').id).toBe(verseOfTheDay('2026-11-10').id);
    const seen = new Set<string>();
    const start = Date.parse('2026-01-01T00:00:00Z');
    // Find the first day of a cycle, then check one full cycle is all distinct.
    let d = start;
    while (Math.floor(d / 86_400_000) % VERSES.length !== 0) d += 86_400_000;
    for (let i = 0; i < VERSES.length; i++) {
      seen.add(verseOfTheDay(new Date(d + i * 86_400_000).toISOString().slice(0, 10)).id);
    }
    expect(seen.size).toBe(VERSES.length);
  });
});

import { FAQS, GOSPEL_STEPS, SOURCE_BY_ID } from '../src/engine/gospel';

describe('gospel & FAQ', () => {
  const verseIds = new Set(VERSES.map((v) => v.id));
  it('every step and answer is bilingual and cites verses we have', () => {
    for (const item of [...GOSPEL_STEPS, ...FAQS]) {
      const texts = 'title' in item ? [item.title, item.body] : [item.q, item.a];
      for (const t of texts) {
        expect(t.en.trim(), item.id).not.toBe('');
        expect(t.ta, item.id).toMatch(/[஀-௿]/);
      }
      for (const v of item.verses) expect(verseIds.has(v), `${item.id} → ${v}`).toBe(true);
    }
  });
  it('further-reading ids exist', () => {
    for (const f of FAQS) for (const r of f.reading) expect(SOURCE_BY_ID[r], `${f.id} → ${r}`).toBeTruthy();
  });
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { problems, fingerprint } from '../scripts/lib/validate.mjs';
import { chapterCount, totalTarget, PRIORITY } from '../scripts/lib/targets.mjs';

describe('book files (content/books)', () => {
  const dir = new URL('../content/books/', import.meta.url);
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  const CH = Object.fromEntries(PRIORITY.map((b: string) => [b, chapterCount(b)]));
  it('targets add up to at least 10,000 questions', () => {
    expect(totalTarget()).toBeGreaterThanOrEqual(10000);
  });
  it('every question passes validation and none repeat', () => {
    const seenIds = new Set<string>(ALL_QUESTIONS.map((q) => q.id));
    const seenText = new Set<string>(ALL_QUESTIONS.map(fingerprint));
    for (const f of files) {
      for (const q of JSON.parse(readFileSync(new URL(f, dir), 'utf8')).questions) {
        expect(problems(q, CH), q.id).toEqual([]);
        expect(seenIds.has(q.id), `duplicate id ${q.id}`).toBe(false);
        expect(seenText.has(fingerprint(q)), `duplicate question ${q.id}`).toBe(false);
        seenIds.add(q.id);
        seenText.add(fingerprint(q));
      }
    }
  });
});
