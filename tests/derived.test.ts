import { describe, expect, it } from 'vitest';
import { baseIdOf, trueFalseFrom, whichBookFromSaying, whichBookFromVerse } from '../src/engine/derived';
import type { Question } from '../src/engine/types';
import { VERSES } from '../src/engine/verses';

const mcq: Question = {
  id: 'bq-ACT-abc',
  type: 'mcq',
  book: 'ACT',
  chapter: 1,
  verse: 1,
  difficulty: 2,
  answer: 2,
  en: { q: 'Who wrote the book of Acts?', options: ['Paul', 'Peter', 'Luke', 'John'] },
  ta: { q: 'அப்போஸ்தலர் நடபடிகளை எழுதியது யார்?', options: ['பவுல்', 'பேதுரு', 'லூக்கா', 'யோவான்'] },
};

describe('true or false from book questions', () => {
  it('suggests one answer and knows whether it is right', () => {
    const tf = trueFalseFrom(mcq)!;
    expect(tf.type).toBe('tf');
    expect(tf.id).toBe('tf~bq-ACT-abc');
    const shown = tf.en.q.split('→ ')[1];
    expect(tf.answer).toBe(shown === 'Luke');
    expect(tf.ta.q).toContain('→ ');
    expect(tf.en.explain).toContain('Luke');
    expect(trueFalseFrom(mcq)).toEqual(tf); // same id, same question
  });
  it('fills the blank to make a sentence', () => {
    const blank: Question = { ...mcq, id: 'bq-PRO-b', type: 'blank', en: { q: 'Diligent hands will ____', options: ['rule', 'sleep', 'beg', 'fall'] }, ta: { q: 'ஜாக்கிரதையுள்ள கை ____', options: ['ஆளும்', 'தூங்கும்', 'பிச்சையெடுக்கும்', 'விழும்'] }, answer: 0 };
    const tf = trueFalseFrom(blank)!;
    expect(tf.en.q).not.toContain('____');
    expect(tf.en.q.startsWith('Diligent hands will ')).toBe(true);
  });
  it('skips EXCEPT / NOT questions', () => {
    expect(trueFalseFrom({ ...mcq, en: { ...mcq.en, q: 'All of these are gifts EXCEPT' } })).toBeNull();
  });
  it('is about half true over many questions', () => {
    let truths = 0;
    for (let i = 0; i < 400; i++) if (trueFalseFrom({ ...mcq, id: `bq-ACT-${i}` })!.answer === true) truths++;
    expect(truths).toBeGreaterThan(150);
    expect(truths).toBeLessThan(250);
  });
});

describe('which book', () => {
  it('asks which book a saying or a verse is from', () => {
    const who: Question = { ...mcq, id: 'bq-LUK-w', type: 'who', book: 'LUK', en: { q: '“God be merciful to me a sinner.”', options: ['a', 'b', 'c', 'd'] }, ta: { q: '“தேவனே, பாவியாகிய என்மேல் கிருபையாயிரும்.”', options: ['a', 'b', 'c', 'd'] } };
    const q = whichBookFromSaying(who)!;
    expect(q.type).toBe('book');
    expect(q.en.options![q.answer as number]).toBe('Luke');
    expect(q.ta.options![q.answer as number]).toBe('லூக்கா');
    expect(new Set(q.en.options).size).toBe(4);
    const v = whichBookFromVerse(VERSES[0]);
    expect(v.id).toBe(`wb~v~${VERSES[0].id}`);
    expect(v.en.options).toContain('Genesis');
  });
  it('finds the question an id is made from', () => {
    expect(baseIdOf('tf~bq-GEN-x')).toBe('bq-GEN-x');
    expect(baseIdOf('wb~bq-LUK-w')).toBe('bq-LUK-w');
    expect(baseIdOf('wb~v~GEN.1.1')).toBeNull();
  });
});
