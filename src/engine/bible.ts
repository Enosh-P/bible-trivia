/**
 * The whole Bible text, one file per book (public/packs/bible/<BOOK>.json,
 * KJV + BSI Tamil O.V.), fetched only when a verse from that book is shown and
 * then kept offline by the service worker.
 */
type BookText = { en: string[][]; ta: string[][] };

const cache = new Map<string, Promise<BookText>>();

function loadBook(book: string): Promise<BookText> {
  let p = cache.get(book);
  if (!p) {
    p = fetch(`/packs/bible/${book}.json`).then((r) => {
      if (!r.ok) throw new Error(`${book} ${r.status}`);
      return r.json() as Promise<BookText>;
    });
    p.catch(() => cache.delete(book));
    cache.set(book, p);
  }
  return p;
}

/** The words of a verse (or a short range) in both languages, or null if unknown. */
export async function verseWords(book: string, chapter: number, verse: number, verseEnd?: number): Promise<{ en: string; ta: string } | null> {
  if (!chapter || !verse) return null;
  const text = await loadBook(book);
  const end = Math.min(verseEnd && verseEnd > verse ? verseEnd : verse, verse + 4); // at most 5 verses
  const pick = (lang: 'en' | 'ta') =>
    (text[lang][chapter - 1] ?? [])
      .slice(verse - 1, end)
      .filter(Boolean)
      .join(' ');
  const en = pick('en');
  const ta = pick('ta');
  return en || ta ? { en, ta } : null;
}
