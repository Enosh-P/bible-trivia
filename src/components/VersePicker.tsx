import { useEffect, useState } from 'react';
import { BOOKS } from '../i18n/books';
import { chapterSizes } from '../engine/bible';
import { useApp, useT } from '../store';

/** A verse or a short run of verses. `to` is 0 for just the one verse. */
export interface VersePick {
  book: string;
  chapter: number;
  from: number;
  to: number;
}

/** At most this many verses after the first can be included. */
const MAX_EXTRA = 4;

const range = (n: number, start = 1) => Array.from({ length: Math.max(0, n - start + 1) }, (_, i) => start + i);

/**
 * Book → Chapter → Verse (→ To verse), with the chapter and verse counts taken
 * from the Bible text. When the book isn't on the phone yet (offline), the
 * numbers can be typed instead. Used by Memory verses and the Thoughts editor.
 */
export function VersePicker({
  value,
  onChange,
  active = true,
  offlineNote,
}: {
  value: VersePick;
  onChange: (v: VersePick) => void;
  /** false while hidden (a closed sheet), so nothing is fetched. */
  active?: boolean;
  /** Shown when the book's text can't be loaded. */
  offlineNote?: string;
}) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [sizes, setSizes] = useState<number[] | null | 'loading'>('loading');
  const { book, chapter, from, to } = value;

  // The book's chapters and verse counts.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    setSizes('loading');
    void chapterSizes(book).then((s) => alive && setSizes(s));
    return () => {
      alive = false;
    };
  }, [book, active]);

  const chapters = Array.isArray(sizes) ? sizes.length : 0;
  const verses = Array.isArray(sizes) ? (sizes[chapter - 1] ?? 0) : 0;
  const digits = (s: string) => Number(s.replace(/\D/g, '').slice(0, 3));

  return (
    <div className="verse-picker">
      <select className="field" value={book} onChange={(e) => onChange({ book: e.target.value, chapter: 1, from: 1, to: 0 })} aria-label={t.chooseBook}>
        {BOOKS.map((b) => (
          <option key={b.code} value={b.code}>
            {b[uiLang]}
          </option>
        ))}
      </select>
      {sizes === null ? (
        <div className="verse-picker-ref">
          <input className="field" inputMode="numeric" placeholder={t.chapterLabel} value={chapter || ''} onChange={(e) => onChange({ ...value, chapter: digits(e.target.value) })} aria-label={t.chapterLabel} />
          <input className="field" inputMode="numeric" placeholder={t.verseLabel} value={from || ''} onChange={(e) => onChange({ ...value, from: digits(e.target.value) })} aria-label={t.verseLabel} />
          <input className="field" inputMode="numeric" placeholder={t.toVerseLabel} value={to || ''} onChange={(e) => onChange({ ...value, to: digits(e.target.value) })} aria-label={t.toVerseLabel} />
        </div>
      ) : (
        <div className="verse-picker-ref">
          <label className="pick">
            <span className="eyebrow">{t.chapterLabel}</span>
            <select className="field" value={chapter} disabled={!chapters} onChange={(e) => onChange({ book, chapter: Number(e.target.value), from: 1, to: 0 })}>
              {range(Math.max(chapters, chapter, 1)).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="pick">
            <span className="eyebrow">{t.verseLabel}</span>
            <select
              className="field"
              value={from}
              disabled={!verses}
              onChange={(e) => {
                const f = Number(e.target.value);
                onChange({ ...value, from: f, to: to && (to <= f || to > f + MAX_EXTRA) ? 0 : to });
              }}
            >
              {range(Math.max(verses, from, 1)).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="pick">
            <span className="eyebrow">{t.toVerseLabel}</span>
            <select className="field" value={to > from ? to : 0} disabled={!verses} onChange={(e) => onChange({ ...value, to: Number(e.target.value) })}>
              <option value={0}>–</option>
              {range(Math.max(Math.min(verses, from + MAX_EXTRA), to), from + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {sizes === null && offlineNote && <p className="caption form-msg is-info">{offlineNote}</p>}
    </div>
  );
}
