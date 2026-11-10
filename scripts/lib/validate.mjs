// One place that decides whether a question is good enough to store.
// Used by the generator, the database importer and the test suite.

export const TYPES = ['mcq', 'tf', 'who', 'book', 'blank'];
export const ART_KEYS = ['ark', 'fish', 'lion', 'sling', 'bush', 'star', 'loaves', 'horse', 'tree'];
const TAMIL = /[஀-௿]/;

/** Normalised English question text, for spotting duplicates. */
export function fingerprint(q) {
  return (q.en?.q ?? '')
    .toLowerCase()
    .replace(/[“”"'’‘.,;:!?()\-–—…]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a list of problems; an empty list means the question is valid.
 * `books` is { CODE: chapterCount }.
 */
export function problems(q, books) {
  const p = [];
  const need = (cond, msg) => cond || p.push(msg);

  need(typeof q.id === 'string' && /^[0-9A-Z]{3}-\d{3}-\d{2,3}$|^[0-9a-z]{3}-\d{3}$/.test(q.id), `bad id ${q.id}`);
  need(TYPES.includes(q.type), `bad type ${q.type}`);
  need(books[q.book] !== undefined, `unknown book ${q.book}`);
  need(Number.isInteger(q.chapter) && q.chapter >= 1 && q.chapter <= (books[q.book] ?? 0), `chapter ${q.chapter} out of range`);
  if (q.verse != null) need(Number.isInteger(q.verse) && q.verse >= 1 && q.verse <= 176, `bad verse ${q.verse}`);
  if (q.verseEnd != null) need(Number.isInteger(q.verseEnd) && q.verseEnd > (q.verse ?? 0), `bad verseEnd ${q.verseEnd}`);
  need([1, 2, 3].includes(q.difficulty), `bad difficulty ${q.difficulty}`);
  if (q.art != null) need(ART_KEYS.includes(q.art), `unknown art ${q.art}`);

  for (const lang of ['en', 'ta']) {
    const t = q[lang];
    if (!t || typeof t.q !== 'string' || !t.q.trim()) {
      p.push(`missing ${lang} question`);
      continue;
    }
    if (lang === 'ta') need(TAMIL.test(t.q), 'ta question has no Tamil script');
    need(t.q.length <= 400, `${lang} question too long`);
    if (q.type === 'tf') {
      need(t.options === undefined, `${lang}: true/false must not have options`);
    } else {
      need(Array.isArray(t.options) && t.options.length === 4, `${lang}: needs exactly 4 options`);
      if (Array.isArray(t.options)) {
        need(new Set(t.options.map((o) => o.trim().toLowerCase())).size === 4, `${lang}: options repeat`);
        need(t.options.every((o) => typeof o === 'string' && o.trim() && o.length <= 120), `${lang}: empty or long option`);
      }
    }
    if (q.type === 'blank') need(t.q.includes('____'), `${lang}: blank question needs ____`);
    if (t.explain != null) need(typeof t.explain === 'string' && t.explain.length <= 600, `${lang}: explanation too long`);
  }

  if (q.type === 'tf') need(typeof q.answer === 'boolean', 'true/false answer must be boolean');
  else need(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, `answer index ${q.answer} out of range`);

  return p;
}
