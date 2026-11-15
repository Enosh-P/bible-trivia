import { Fragment, useEffect, useState } from 'react';
import { verseWords } from '../engine/bible';
import { postSections, type Post } from '../engine/posts';
import { parseVerseRef, type VerseRef } from '../engine/verseRef';
import type { Lang } from '../engine/types';
import { formatRef } from '../i18n/books';
import { useApp } from '../store';
import { Markdown, PostImage } from './Markdown';

/** '2026-11-14' → 'Saturday, 14 November 2026' in the app language (no time zone shifting). */
export function postDate(day: string, lang: Lang, style: 'long' | 'short' = 'long'): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString(
    lang === 'ta' ? 'ta-IN' : undefined,
    style === 'long' ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' },
  );
}

const CREDIT: Record<Lang, string> = { en: 'KJV', ta: 'BSI O.V.' };

/** The verse a post points at, from the app's Bible text, in the reader's language(s). */
export function PostVerse({ verse }: { verse: VerseRef }) {
  const qLang = useApp((s) => s.qLang);
  const [words, setWords] = useState<{ en: string; ta: string } | null>(null);
  const { book, chapter, verse: from, verseEnd } = verse;
  useEffect(() => {
    let alive = true;
    setWords(null);
    verseWords(book, chapter, from, verseEnd)
      .then((w) => alive && setWords(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [book, chapter, from, verseEnd]);

  const wanted: Lang[] = qLang === 'both' ? ['ta', 'en'] : [qLang];
  let langs = wanted.filter((l) => words?.[l]);
  if (words && !langs.length) langs = (['en', 'ta'] as const).filter((l) => words[l]);
  const refLang = langs[0] ?? wanted[0];
  return (
    <blockquote className="post-verse glass verse-quote">
      {/* Offline without this book: the reference alone still says where to read. */}
      {words &&
        langs.map((l, i) => (
          <p key={l} className={`verse ${i > 0 ? 'verse-secondary' : ''} ${langs.length > 1 && l === 'ta' ? 'is-ta-both' : ''}`} lang={l}>
            {words[l]}
          </p>
        ))}
      <cite className="caption" lang={refLang}>
        {formatRef(refLang, book, chapter, from, verseEnd)}
        {words && ` · ${langs.map((l) => CREDIT[l]).join(' · ')}`}
      </cite>
    </blockquote>
  );
}

/**
 * A Daily Thought exactly as readers see it (the post screen and the editor's
 * preview both use this): cover, date, title(s), the linked verse, the text.
 * In "both" the Tamil comes first, then the English.
 */
export function PostView({ post }: { post: Pick<Post, 'title_en' | 'title_ta' | 'body_en' | 'body_ta' | 'cover_url' | 'verse_ref' | 'publish_on'> }) {
  const qLang = useApp((s) => s.qLang);
  const uiLang = useApp((s) => s.uiLang);
  const sections = postSections(post, qLang);
  const verse = parseVerseRef(post.verse_ref);
  const both = sections.length > 1;
  const titles = sections.filter((s) => s.title);
  const bodies = sections.filter((s) => s.body);
  const taClass = (lang: Lang) => (both && lang === 'ta' ? 'is-ta-both' : '');

  return (
    <article className="post">
      {post.cover_url && <PostImage url={post.cover_url} alt="" className="post-cover" />}
      <header className="post-head">
        <p className="eyebrow">{postDate(post.publish_on, uiLang)}</p>
        {titles.map((s, i) =>
          i === 0 ? (
            <h1 key={s.lang} className={`post-title ${taClass(s.lang)}`} lang={s.lang}>
              {s.title}
            </h1>
          ) : (
            <p key={s.lang} className={`post-title is-second ${taClass(s.lang)}`} lang={s.lang}>
              {s.title}
            </p>
          ),
        )}
      </header>
      {verse && <PostVerse verse={verse} />}
      {bodies.map((s, i) => (
        <Fragment key={s.lang}>
          {i > 0 && <hr className="post-rule" />}
          <div className={`post-body ${taClass(s.lang)}`}>
            <Markdown text={s.body} lang={s.lang} />
          </div>
        </Fragment>
      ))}
    </article>
  );
}
