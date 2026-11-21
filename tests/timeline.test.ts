import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aliveIn, astro, rangeLabel, refLabel, span, yearLabel, type Timeline } from '../src/engine/timeline';
import { withApproved, type Approved } from '../src/online/timeline';

const tl = JSON.parse(readFileSync(new URL('../content/timeline/timeline.json', import.meta.url), 'utf8')) as Timeline;

describe('Bible timeline', () => {
  it('has every person in a known group, with years and Tamil', () => {
    const cats = new Set(tl.cats.map((c) => c.id));
    for (const p of tl.people) {
      expect(cats.has(p.cat), p.id).toBe(true);
      const [s, e] = span(p);
      expect(s <= e, p.id).toBe(true);
      expect(p.name.ta, p.id).not.toBe('');
      expect(p.title.ta, p.id).not.toBe('');
    }
  });
  it('writes years both ways', () => {
    expect(yearLabel(astro(-1446), 'en')).toBe('1446 BC');
    expect(yearLabel(astro(30), 'ta')).toBe('கி.பி. 30');
    expect(rangeLabel(astro(-5), astro(30), 'en')).toBe('5 BC – AD 30');
    expect(refLabel({ b: 'GEN', c: 11, c2: 25 }, 'en')).toBe('Genesis 11–25');
    expect(refLabel({ b: 'EXO', to: 'DEU' }, 'en')).toBe('Exodus – Deuteronomy');
  });
  it('knows who was alive in a year', () => {
    const names = aliveIn(tl, astro(-1446)).map((p) => p.name.en);
    expect(names).toContain('Moses');
    expect(names).not.toContain('David');
  });
  it('adds approved reader suggestions', () => {
    const rows: Approved[] = [
      { id: 'a', kind: 'event', added_by: 'A', explanation: 'x', refs: [{ b: 'EXO', c: 17, v: 6 }], data: { person: 'moses', personName: { en: 'Moses', ta: '' }, y: -1445, text: { en: 'Strikes the rock', ta: '' } } },
      { id: 'b', kind: 'person', added_by: 'B', explanation: 'y', refs: [{ b: 'GEN', c: 14 }], data: { name: { en: 'Melchizedek', ta: 'மெல்கிசேதேக்கு' }, title: { en: 'King of Salem', ta: '' }, cat: 'pri', active: { from: -2085, to: -2085, en: 'Blesses Abram', ta: '' } } },
      { id: 'c', kind: 'correction', added_by: 'C', explanation: 'z', refs: [{ b: 'GEN', c: 25, v: 7 }], data: { person: 'abraham', personName: { en: 'Abraham', ta: '' }, patch: { title: { en: 'Friend of God', ta: '' } } } },
    ];
    const out = withApproved(tl, rows);
    expect(out.people.find((p) => p.id === 'moses')!.events.some((e) => e.addedBy === 'A')).toBe(true);
    expect(out.people.some((p) => p.name.en === 'Melchizedek')).toBe(true);
    expect(out.people.find((p) => p.id === 'abraham')!.title.en).toBe('Friend of God');
    // the original isn't changed
    expect(tl.people.find((p) => p.id === 'abraham')!.title.en).not.toBe('Friend of God');
  });
});
