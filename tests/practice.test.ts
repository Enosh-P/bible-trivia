import { describe, expect, it } from 'vitest';
import { summarize } from '../src/engine/practice';
import { drillQuestion, drillRound } from '../src/engine/drill';
import * as drillMeta from '../src/engine/drill';

const DAY = 86_400_000;
const now = 100 * DAY;
const a = (questionId: string, correct: boolean, daysAgo: number, book = 'GEN', mode = 'classic') => ({ questionId, book, correct, mode, at: now - daysAgo * DAY });

describe('practice', () => {
  it('keeps a mistake until it is answered right twice in a row', () => {
    expect(summarize([a('q1', false, 3)], now).toFix).toEqual(['q1']);
    expect(summarize([a('q1', false, 3), a('q1', true, 2)], now).toFix).toEqual(['q1']);
    expect(summarize([a('q1', false, 3), a('q1', true, 2), a('q1', true, 1)], now).toFix).toEqual([]);
    expect(summarize([a('q1', false, 3), a('q1', true, 2), a('q1', false, 1)], now).toFix).toEqual(['q1']);
  });
  it('brings known questions back after 1, 3, 7 … days', () => {
    expect(summarize([a('q2', true, 0.5)], now).due).toEqual([]);
    expect(summarize([a('q2', true, 1.5)], now).due).toEqual(['q2']);
    expect(summarize([a('q2', true, 3), a('q2', true, 2)], now).due).toEqual([]); // two in a row: 3 days
    expect(summarize([a('q2', true, 6), a('q2', true, 4)], now).due).toEqual(['q2']);
  });
  it('lists weak books, weakest first, and ignores Recall and drill answers', () => {
    const answers = [
      ...Array.from({ length: 5 }, (_, i) => a(`g${i}`, i < 4, 1, 'GEN')),
      ...Array.from({ length: 5 }, (_, i) => a(`j${i}`, i < 2, 1, 'JDG')),
      a('uw-RUT-x', false, 1, 'RUT', 'recall'),
      a('gen-next-RUT', false, 1, 'RUT', 'drill'),
    ];
    const s = summarize(answers, now);
    expect(s.books.map((b) => [b.book, b.pct])).toEqual([['JDG', 40], ['GEN', 80]]);
    expect(s.toFix).not.toContain('uw-RUT-x');
    expect(s.toFix).not.toContain('gen-next-RUT');
  });
});

describe('books drill', () => {
  it('makes the same question from the same id', () => {
    const q = drillQuestion('gen-next-RUT')!;
    expect(q.en.options![q.answer as number]).toBe('1 Samuel');
    expect(drillQuestion('gen-next-RUT')).toEqual(q);
    expect(drillQuestion('gen-prev-RUT')!.en.options![drillQuestion('gen-prev-RUT')!.answer as number]).toBe('Judges');
    expect(drillQuestion('gen-test-JHN')!.answer).toBe(1);
    const f = drillQuestion('gen-first-REV.GEN.JHN.PSA')!;
    expect(f.en.options![f.answer as number]).toBe('Genesis');
    expect(new Set(q.en.options).size).toBe(4);
  });
  it('knows chapter counts, groups, positions and names', () => {
    const { CHAPTERS, GROUPS } = drillMeta;
    expect(Object.values(CHAPTERS).reduce((a, b) => a + b, 0)).toBe(1189);
    expect(Object.keys(CHAPTERS)).toHaveLength(66);
    expect(GROUPS.flatMap((g) => g.books)).toHaveLength(66);
    const chap = drillQuestion('gen-chap-PSA')!;
    expect(chap.en.options![chap.answer as number]).toBe('150');
    expect(new Set(chap.en.options).size).toBe(4);
    const group = drillQuestion('gen-group-HAB')!;
    expect(group.en.options![group.answer as number]).toBe('Minor prophets');
    const pos = drillQuestion('gen-pos-MAT')!;
    expect(pos.en.options![pos.answer as number]).toBe('40');
    const nm = drillQuestion('gen-name-RUT')!;
    expect(nm.en.options![nm.answer as number]).toBe('ரூத்');
    expect(nm.ta.options![nm.answer as number]).toBe('Ruth');
  });

  it('has no next book after Revelation', () => {
    expect(drillQuestion('gen-next-REV')).toBeNull();
    expect(drillQuestion('gen-prev-GEN')).toBeNull();
  });
  it('makes a full round of valid questions', () => {
    const ids = drillRound(10);
    expect(ids).toHaveLength(10);
    for (const id of ids) expect(drillQuestion(id)).not.toBeNull();
  });
});
