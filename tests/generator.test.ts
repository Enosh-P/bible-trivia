import { describe, expect, it, beforeAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Point the generator at a temporary folder before importing it.
const dir = mkdtempSync(join(tmpdir(), 'bt-books-'));
process.env.BT_BOOKS_DIR = dir;

type Gen = typeof import('../scripts/generate-questions.mjs');
let gen: Gen;
beforeAll(async () => {
  gen = await import('../scripts/generate-questions.mjs');
});

const loc = (q: string, options: string[] = []) => ({ q, options, explain: 'Because the text says so.' });
const fakeMessage = (questions: unknown[]) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify({ questions }) }],
  usage: { input_tokens: 1, output_tokens: 1 },
});

describe('question generator', () => {
  it('builds a structured-output request with the cached system prompt', () => {
    const { count, params } = gen.requestParams('GEN', 1, 'high') as { count: number; params: any };
    expect(count).toBeGreaterThan(0);
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.output_config.effort).toBe('high');
    expect(params.messages[0].content).toContain('Genesis chapter 1');
  });

  it('keeps good questions, rejects bad and duplicate ones, and numbers them', () => {
    const good = {
      type: 'mcq', verse: 3, verseEnd: null, difficulty: 1, answerIndex: 2, answerTrue: null, art: null,
      en: loc('What did God create by saying "Let there be light"?', ['Water', 'Stars', 'Light', 'Land']),
      ta: loc('“வெளிச்சம் உண்டாகக்கடவது” என்று சொல்லி தேவன் எதை உண்டாக்கினார்?', ['தண்ணீர்', 'நட்சத்திரங்கள்', 'வெளிச்சம்', 'பூமி']),
    };
    const tf = {
      type: 'tf', verse: 31, verseEnd: null, difficulty: 1, answerIndex: null, answerTrue: true, art: null,
      en: loc('God saw everything He had made, and it was very good.'),
      ta: loc('தேவன் தாம் உண்டாக்கின எல்லாவற்றையும் பார்த்தார், அது மிகவும் நன்றாயிருந்தது.'),
    };
    const noTamil = { ...good, en: loc('Which day were the stars made?', ['First', 'Second', 'Third', 'Fourth']), ta: loc('Which day?', ['1', '2', '3', '4']) };
    const duplicate = { ...good };
    const res = gen.toQuestions('GEN', 1, fakeMessage([good, tf, noTamil, duplicate]) as any) as { questions: any[] };
    const rejects: any[] = [];
    const added = gen.store('GEN', 1, res.questions, rejects);
    expect(added).toBe(2);
    expect(rejects.map((r) => r.issues.join())).toEqual([expect.stringContaining('no Tamil'), 'duplicate']);
    const saved = JSON.parse(readFileSync(join(dir, 'GEN.json'), 'utf8')).questions;
    expect(saved.map((q: any) => q.id)).toEqual(['GEN-001-01', 'GEN-001-02']);
    expect(saved.every((q: any) => q.status === 'review' && q.source === 'generated')).toBe(true);
    expect(saved[1]).not.toHaveProperty('en.options');
    expect(saved[1].answer).toBe(true);
  });

  it('reports cut-off or refused responses instead of saving them', () => {
    expect(gen.toQuestions('GEN', 1, { stop_reason: 'refusal', content: [] } as any)).toEqual({ error: 'refusal' });
    expect((gen.toQuestions('GEN', 1, { stop_reason: 'max_tokens', content: [] } as any) as any).error).toContain('max_tokens');
  });
});
