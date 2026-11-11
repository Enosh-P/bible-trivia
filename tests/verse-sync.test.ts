import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { verseOfTheDay } from '../src/engine/verses';

// Writes the app's Verse of the Day for 60 days; the push function's choice is
// compared against this file by `deno run` (see scripts in the notifications docs).
describe('verse of the day for notifications', () => {
  it('records the app choice for comparison', () => {
    const out: Record<string, string> = {};
    for (let i = 0; i < 60; i++) {
      const day = new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);
      out[day] = verseOfTheDay(day).id;
    }
    if (process.env.VERSE_SYNC_OUT) writeFileSync(process.env.VERSE_SYNC_OUT, JSON.stringify(out));
    expect(Object.keys(out)).toHaveLength(60);
  });
});
