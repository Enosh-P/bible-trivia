import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { verseWords } from '../engine/bible';
import { formatRef } from '../i18n/books';
import type { Lang } from '../engine/types';
import { spring } from '../motion/springs';

/** The verse a question comes from, in bold, with the reference (and Tamil underneath in Both mode). */
export function RefVerse({
  book,
  chapter,
  verse,
  verseEnd,
  primary,
  secondary,
}: {
  book: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  primary: Lang;
  secondary: Lang | null;
}) {
  const [words, setWords] = useState<{ en: string; ta: string } | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setWords(undefined);
    verseWords(book, chapter, verse ?? 0, verseEnd)
      .then((w) => alive && setWords(w))
      .catch(() => alive && setWords(null));
    return () => {
      alive = false;
    };
  }, [book, chapter, verse, verseEnd]);

  if (!words) return null; // no verse number, still loading, or offline without this book
  return (
    <motion.blockquote className="ref-verse" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm}>
      <p lang={primary}>{words[primary]}</p>
      {secondary && words[secondary] && <p lang={secondary} className="ref-verse-second">{words[secondary]}</p>}
      <cite>
        {formatRef(primary, book, chapter, verse, verseEnd)} · {primary === 'ta' ? 'BSI – Tamil – O.V.' : 'KJV'}
      </cite>
    </motion.blockquote>
  );
}
