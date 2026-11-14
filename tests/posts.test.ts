import { describe, expect, it } from 'vitest';
import { excerpt, parseInline, parseMarkdown, plainText, safeImageUrl } from '../src/engine/markdown';
import { formatVerseRef, parseVerseRef } from '../src/engine/verseRef';
import { compressionSteps, extensionFor, fitWithin, MAX_SIDE } from '../src/engine/image';
import { emptyDraft, matchesSearch, postSections, postState, postSummary, publishProblem, visiblePosts, type Post } from '../src/engine/posts';

describe('markdown', () => {
  it('splits paragraphs on empty lines and keeps single line breaks', () => {
    expect(parseMarkdown('One\ntwo\n\nThree')).toEqual([
      { t: 'p', c: [{ t: 'text', v: 'One' }, { t: 'br' }, { t: 'text', v: 'two' }] },
      { t: 'p', c: [{ t: 'text', v: 'Three' }] },
    ]);
  });
  it('reads bold and italic, also nested and in Tamil', () => {
    expect(parseInline('a **bold** and *slanted* word')).toEqual([
      { t: 'text', v: 'a ' },
      { t: 'bold', c: [{ t: 'text', v: 'bold' }] },
      { t: 'text', v: ' and ' },
      { t: 'italic', c: [{ t: 'text', v: 'slanted' }] },
      { t: 'text', v: ' word' },
    ]);
    expect(parseInline('**தேவன் *அன்பாகவே* இருக்கிறார்**')).toEqual([
      { t: 'bold', c: [{ t: 'text', v: 'தேவன் ' }, { t: 'italic', c: [{ t: 'text', v: 'அன்பாகவே' }] }, { t: 'text', v: ' இருக்கிறார்' }] },
    ]);
  });
  it('leaves lone stars and maths alone', () => {
    expect(parseInline('2 * 3 * 4')).toEqual([{ t: 'text', v: '2 * 3 * 4' }]);
    expect(parseInline('a ** b')).toEqual([{ t: 'text', v: 'a ** b' }]);
    expect(parseInline('snake_case_name')).toEqual([{ t: 'text', v: 'snake_case_name' }]);
  });
  it('reads bullet and numbered lists', () => {
    expect(parseMarkdown('- one\n- **two**\n\n3. three\n4) four')).toEqual([
      { t: 'ul', items: [[{ t: 'text', v: 'one' }], [{ t: 'bold', c: [{ t: 'text', v: 'two' }] }]] },
      { t: 'ol', start: 3, items: [[{ t: 'text', v: 'three' }], [{ t: 'text', v: 'four' }]] },
    ]);
  });
  it('shows a picture on its own line as a block, with its description', () => {
    expect(parseMarkdown('Before\n![A lamp on a hill](https://x.supabase.co/storage/v1/object/public/post-images/a.webp)\nAfter')).toEqual([
      { t: 'p', c: [{ t: 'text', v: 'Before' }] },
      { t: 'image', alt: 'A lamp on a hill', url: 'https://x.supabase.co/storage/v1/object/public/post-images/a.webp' },
      { t: 'p', c: [{ t: 'text', v: 'After' }] },
    ]);
  });
  it('never turns unsafe addresses or HTML into anything but text', () => {
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
    expect(safeImageUrl('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(safeImageUrl('https://example.org/a.jpg')).toBe('https://example.org/a.jpg');
    expect(parseInline('![x](javascript:alert(1))')).toEqual([{ t: 'text', v: '![x](javascript:alert(1))' }]);
    const html = '<img src=x onerror=alert(1)> <script>alert(1)</script>';
    expect(parseMarkdown(html)).toEqual([{ t: 'p', c: [{ t: 'text', v: html }] }]);
  });
  it('makes plain text and short previews', () => {
    const src = '**Peace** be *with* you.\n\n- one\n- two\n\n![pic](https://e.org/p.webp)';
    expect(plainText(src)).toBe('Peace be with you. one two');
    expect(excerpt('word '.repeat(50), 30)).toBe('word word word word word word…');
    expect(excerpt('short')).toBe('short');
  });
});

describe('verse_ref', () => {
  it('reads one verse and a range', () => {
    expect(parseVerseRef('JHN 3:16')).toEqual({ book: 'JHN', chapter: 3, verse: 16 });
    expect(parseVerseRef('JHN 3:16-18')).toEqual({ book: 'JHN', chapter: 3, verse: 16, verseEnd: 18 });
    expect(parseVerseRef(' 1co 13:4–7 ')).toEqual({ book: '1CO', chapter: 13, verse: 4, verseEnd: 7 });
  });
  it('refuses what is not a reference', () => {
    for (const bad of [null, '', 'John 3:16', 'JHN 3', 'XXX 1:1', 'JHN 0:1', 'JHN 3:16-', 'JHN 3:16; drop table']) expect(parseVerseRef(bad)).toBeNull();
  });
  it('drops an end that is not after the start, and round-trips', () => {
    expect(parseVerseRef('PSA 23:4-4')).toEqual({ book: 'PSA', chapter: 23, verse: 4 });
    expect(formatVerseRef({ book: 'PSA', chapter: 23, verse: 1, verseEnd: 3 })).toBe('PSA 23:1-3');
    expect(formatVerseRef({ book: 'PSA', chapter: 23, verse: 1, verseEnd: 0 })).toBe('PSA 23:1');
    expect(formatVerseRef(parseVerseRef('ROM 8:28-30')!)).toBe('ROM 8:28-30');
  });
  it('matches the pattern the database checks', () => {
    const db = /^[A-Z0-9]{3} [0-9]{1,3}:[0-9]{1,3}(-[0-9]{1,3})?$/;
    for (const r of [{ book: '1SA', chapter: 17, verse: 45 }, { book: 'PSA', chapter: 119, verse: 105, verseEnd: 106 }]) expect(formatVerseRef(r)).toMatch(db);
  });
});

describe('image resize maths', () => {
  it('fits the longest side into 1600 and keeps the shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(4032, 2268)).toEqual({ width: 1600, height: 900 });
  });
  it('never enlarges a small picture and never returns zero', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 3)).toEqual({ width: 1600, height: 1 });
    expect(fitWithin(0, 0)).toEqual({ width: 0, height: 0 });
  });
  it('tries lower quality first, then smaller pictures', () => {
    const steps = compressionSteps();
    expect(steps[0]).toEqual({ max: MAX_SIDE, quality: 0.82 });
    for (let i = 1; i < steps.length; i++) expect(steps[i].max).toBeLessThanOrEqual(steps[i - 1].max);
    expect(steps[steps.length - 1].max).toBe(800);
    expect(extensionFor('image/webp')).toBe('webp');
    expect(extensionFor('image/jpeg')).toBe('jpg');
  });
});

describe('posts', () => {
  const post = (over: Partial<Post>): Post => ({
    id: 'p1',
    author_id: null,
    title_en: 'Light',
    title_ta: 'ஒளி',
    body_en: 'You are the **light** of the world.',
    body_ta: 'நீங்கள் உலகத்துக்கு வெளிச்சமாயிருக்கிறீர்கள்.',
    cover_url: null,
    verse_ref: 'MAT 5:14',
    publish_on: '2026-11-14',
    status: 'published',
    created_at: '2026-11-10T00:00:00Z',
    updated_at: '2026-11-10T00:00:00Z',
    ...over,
  });

  it('shows the chosen language; in both, Tamil then English', () => {
    expect(postSections(post({}), 'en').map((s) => s.lang)).toEqual(['en']);
    expect(postSections(post({}), 'ta').map((s) => s.lang)).toEqual(['ta']);
    expect(postSections(post({}), 'both').map((s) => s.lang)).toEqual(['ta', 'en']);
  });
  it('falls back to the other language when one is empty', () => {
    const onlyEn = post({ title_ta: '', body_ta: ' ' });
    expect(postSections(onlyEn, 'ta').map((s) => s.lang)).toEqual(['en']);
    expect(postSections(onlyEn, 'both').map((s) => s.lang)).toEqual(['en']);
    expect(postSummary(onlyEn, 'both', 'ta').title).toBe('Light');
    expect(postSections(post({ title_en: '', body_en: '', title_ta: '', body_ta: '' }), 'en')).toEqual([]);
  });
  it('hides drafts and posts dated after the reader\'s own day, newest first', () => {
    const list = [
      post({ id: 'old', publish_on: '2026-11-01' }),
      post({ id: 'draft', status: 'draft' }),
      post({ id: 'tomorrow', publish_on: '2026-11-15' }),
      post({ id: 'today' }),
    ];
    expect(visiblePosts(list, '2026-11-14').map((p) => p.id)).toEqual(['today', 'old']);
    expect(visiblePosts(list, '2026-11-15').map((p) => p.id)).toEqual(['tomorrow', 'today', 'old']);
    expect(postState(list[2], '2026-11-14')).toBe('scheduled');
    expect(postState(list[1], '2026-11-14')).toBe('draft');
    expect(postState(list[3], '2026-11-14')).toBe('published');
  });
  it('searches by word in either language, ignoring formatting', () => {
    expect(matchesSearch(post({}), 'LIGHT world')).toBe(true);
    expect(matchesSearch(post({}), 'வெளிச்ச')).toBe(true);
    expect(matchesSearch(post({}), 'light darkness')).toBe(false);
    expect(matchesSearch(post({}), '  ')).toBe(true);
  });
  it('needs one complete language and a date before publishing', () => {
    const d = emptyDraft('2026-11-14');
    expect(publishProblem(d)).toBe('title');
    expect(publishProblem({ ...d, title_ta: 'ஒளி' })).toBe('body');
    expect(publishProblem({ ...d, title_ta: 'ஒளி', body_en: 'text' })).toBe('body');
    expect(publishProblem({ ...d, title_ta: 'ஒளி', body_ta: 'உரை' })).toBeNull();
    expect(publishProblem({ ...d, title_en: 'a', body_en: 'b', publish_on: '' })).toBe('date');
  });
});
