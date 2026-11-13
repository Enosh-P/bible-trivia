import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ListChecks } from 'lucide-react';
import { BOOK_BY_CODE } from '../i18n/books';
import { loadMcqBook, loadMcqIndex, type McqIndex } from '../engine/mcq';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { LangToggle } from '../components/LangToggle';
import { BookGrid, ChapterPicker } from './Recall';

/** Quiz by Book: choose a book, then the whole book or one chapter. */
export function QuizPick({ onExit, onStart }: { onExit: () => void; onStart: (book: string, chapter: number | null) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [index, setIndex] = useState<McqIndex | null>(null);
  const [error, setError] = useState(false);
  const [book, setBook] = useState<string | null>(null);

  useEffect(() => {
    loadMcqIndex().then(setIndex).catch(() => setError(true));
  }, []);

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={() => (book ? setBook(null) : onExit())} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.modeName.quiz}</p>
          <h1 className="title">{book ? BOOK_BY_CODE[book]?.[uiLang] ?? book : t.chooseBook}</h1>
        </div>
        <LangToggle compact />
        <IconTile horse="pale" icon={ListChecks} size={40} />
      </header>

      {error && <p className="caption note">{t.offlineNotLoaded}</p>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={book ?? 'books'}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={spring.calm}
          className="recall-body"
        >
          {!book && index && <BookGrid counts={index.books} lang={uiLang} onPick={setBook} />}
          {book && (
            <ChapterPicker chapters={() => loadMcqBook(book).then((qs) => qs.map((q) => q.chapter))} onPick={(ch) => onStart(book, ch)} />
          )}
        </motion.div>
      </AnimatePresence>

      {index && <p className="caption credit">{index.attribution}. {index.whoAttribution}</p>}
    </div>
  );
}
