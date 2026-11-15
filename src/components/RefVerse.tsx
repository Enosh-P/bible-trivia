import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { verseWords } from '../engine/bible';
import { formatRef } from '../i18n/books';
import type { Lang } from '../engine/types';
import { spring } from '../motion/springs';
import { useT } from '../store';

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
  const t = useT();
  // In Both mode the second language waits behind one tap, so the answer card stays short.
  const [second, setSecond] = useState(false);
  const [words, setWords] = useState<{ en: string; ta: string } | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setWords(undefined);
    setSecond(false);
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
      {secondary && words[secondary] && second && (
        <p lang={secondary} className="ref-verse-second">
          {words[secondary]}
        </p>
      )}
      <cite>
        {formatRef(primary, book, chapter, verse, verseEnd)} · {primary === 'ta' ? 'BSI – Tamil – O.V.' : 'KJV'}
      </cite>
      {secondary && words[secondary] && !second && (
        <button className="link ref-verse-more" onClick={() => setSecond(true)} lang={primary}>
          {secondary === 'ta' ? t.alsoInTamil : t.alsoInEnglish}
        </button>
      )}
    </motion.blockquote>
  );
}
