import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
// @ts-expect-error plain JS build scripts
import { splitRef, shuffleOptions, folderToBook } from '../scripts/import-bible-mcq.mjs';
// @ts-expect-error plain JS build scripts
import { speakerName, firstQuote } from '../scripts/lib/who-said.mjs';
import { toQuestion } from '../src/engine/mcq';

describe('multiple-choice import', () => {
  it('takes the verse reference out of the question', () => {
    expect(splitRef('Why will the Psalmist exalt the Lord (Ps. 30:1)?')).toEqual({ q: 'Why will the Psalmist exalt the Lord?', chapter: 30, verse: 1 });
    expect(splitRef('After being made king where was Joash taken (2 Kgs 11:19f)?')).toMatchObject({ chapter: 11, verse: 19 });
    expect(splitRef('What happened (Gen. 1:9)?   The waters were ____').q).toBe('What happened? The waters were ____');
  });
  it('maps dataset folders to book codes', () => {
    expect(folderToBook('1_kings')).toBe('1KI');
    expect(folderToBook('song_of_solomon')).toBe('SNG');
    expect(folderToBook('people')).toBeNull();
  });
  it('shuffles options but keeps the right answer', () => {
    const s = shuffleOptions('abc', ['A', 'B', 'C', 'D'], 2);
    expect(s.options[s.answer]).toBe('C');
    expect(shuffleOptions('abc', ['A', 'B', 'C', 'D'], 2)).toEqual(s); // stable
  });
});

describe('who said it', () => {
  it('cleans speaker names', () => {
    expect(speakerName('Peter (Simon)')).toBe('Peter');
    expect(speakerName('Ahab, king of Israel')).toBe('Ahab');
    expect(speakerName('Jews, the')).toBe('The Jews');
    expect(speakerName('Abimelech 1')).toBe('Abimelech');
  });
  it('pulls the quoted words out of a verse', () => {
    expect(firstQuote('Rachel said to Jacob, “Give me children, or else I will die.”')).toBe('Give me children, or else I will die.');
    expect(firstQuote('No quote here.')).toBeNull();
  });
});

describe('question packs', () => {
  it('turns pack rows into questions', () => {
    const q = toQuestion('GEN', ['x1', 3, 1, 4, '“Hello”', ['Adam', 'Eve', 'Cain', 'Abel'], 1]);
    expect(q).toMatchObject({ id: 'bq-GEN-x1', type: 'who', chapter: 3, verse: 1, answer: 1 });
    expect(q.en.explain).toBe('Genesis 3:1');
    expect(q.ta.q).toBe('“Hello”'); // English until translated
  });
  it('every pack row is valid', () => {
    const dir = 'public/packs/mcq/';
    if (!existsSync(dir + 'index.json')) return;
    const index = JSON.parse(readFileSync(dir + 'index.json', 'utf8'));
    let n = 0;
    for (const book of Object.keys(index.books)) {
      for (const r of JSON.parse(readFileSync(`${dir}${book}.json`, 'utf8')).rows) {
        expect(r[5].length).toBeGreaterThanOrEqual(3);
        expect(r[6]).toBeGreaterThanOrEqual(0);
        expect(r[6]).toBeLessThan(r[5].length);
        expect(new Set(r[5]).size).toBe(r[5].length);
        n++;
      }
    }
    expect(n).toBe(index.total);
  });
});
