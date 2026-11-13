import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpenCheck, Check, ChevronLeft, Eye, RotateCcw, X } from 'lucide-react';
import { BOOKS, formatRef } from '../i18n/books';
import { loadRecallBook, loadRecallIndex, recallRound, type RecallCard, type RecallIndex } from '../engine/recall';
import { db } from '../storage/db';
import { useApp, useT } from '../store';
import { cue } from '../feedback';
import { spring } from '../motion/springs';
import { LangToggle } from '../components/LangToggle';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { ReportButton } from '../components/Report';
import { recallTarget } from '../online/reports';

type Step =
  | { kind: 'books' }
  | { kind: 'chapters'; book: string }
  | { kind: 'cards'; book: string; chapter: number | null; cards: RecallCard[]; i: number; shown: boolean; knew: string[]; missed: RecallCard[] }
  | { kind: 'done'; book: string; chapter: number | null; knew: number; missed: RecallCard[] };

/** Recall: human-written questions; reveal the answer and mark whether you knew it. */
export function Recall({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const finishRound = useApp((s) => s.finishRound);
  const [index, setIndex] = useState<RecallIndex | null>(null);
  const [error, setError] = useState(false);
  const [step, setStep] = useState<Step>({ kind: 'books' });

  useEffect(() => {
    loadRecallIndex().then(setIndex).catch(() => setError(true));
  }, []);

  async function start(book: string, chapter: number | null, only?: RecallCard[]) {
    try {
      const cards = only ?? (await recallRound(book, chapter));
      setStep({ kind: 'cards', book, chapter, cards, i: 0, shown: false, knew: [], missed: [] });
    } catch {
      setError(true);
    }
  }

  function mark(knew: boolean) {
    if (step.kind !== 'cards') return;
    const card = step.cards[step.i];
    cue(knew ? 'correct' : 'wrong');
    void db.answers.add({ questionId: card.id, book: card.book, correct: knew, mode: 'recall', at: Date.now() }).catch(() => {});
    const next = { ...step, knew: knew ? [...step.knew, card.id] : step.knew, missed: knew ? step.missed : [...step.missed, card] };
    if (step.i + 1 < step.cards.length) {
      setStep({ ...next, i: step.i + 1, shown: false });
    } else {
      cue('complete');
      finishRound({ xp: next.knew.length * 5, correct: next.knew.length, total: step.cards.length, score: next.knew.length * 5 });
      setStep({ kind: 'done', book: step.book, chapter: step.chapter, knew: next.knew.length, missed: next.missed });
    }
  }

  const back = () => {
    // The X during a round closes Recall completely; the arrow steps back through the lists.
    if (step.kind === 'chapters') setStep({ kind: 'books' });
    else onExit();
  };

  const bookName = (code: string) => BOOKS.find((b) => b.code === code)?.[uiLang] ?? code;

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={back} aria-label={step.kind === 'cards' || step.kind === 'done' ? t.quit : t.back}>
          {step.kind === 'cards' || step.kind === 'done' ? <X size={18} strokeWidth={STROKE} /> : <ChevronLeft size={20} strokeWidth={STROKE} />}
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.modeName.recall}</p>
          <h1 className="title">{step.kind === 'books' ? t.chooseBook : bookName(step.book) + (step.kind !== 'chapters' && step.chapter ? ` ${step.chapter}` : '')}</h1>
        </div>
        <LangToggle compact />
        <IconTile horse="pale" icon={BookOpenCheck} size={40} />
      </header>

      {error && <p className="caption note">{t.offlineNotLoaded}</p>}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step.kind + ('book' in step ? step.book : '') + (step.kind === 'cards' ? step.i : '')}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={spring.calm}
          className="recall-body"
        >
          {step.kind === 'books' && index && (
            <BookGrid counts={index.books} lang={uiLang} onPick={(book) => setStep({ kind: 'chapters', book })} />
          )}

          {step.kind === 'chapters' && (
            <ChapterPicker chapters={() => loadRecallBook(step.book).then((cards) => cards.map((c) => c.chapter))} onPick={(ch) => start(step.book, ch)} />
          )}

          {step.kind === 'cards' && (
            <Card
              card={step.cards[step.i]}
              n={step.i + 1}
              total={step.cards.length}
              shown={step.shown}
              onShow={() => setStep({ ...step, shown: true })}
              onMark={mark}
            />
          )}

          {step.kind === 'done' && (
            <div className="recall-done glass">
              <IconTile horse="pale" icon={Check} size={52} />
              <h2 className="display">
                {step.knew}/{step.knew + step.missed.length}
              </h2>
              <p className="caption">{t.recallKnewIt}</p>
              <div className="result-actions">
                {step.missed.length > 0 && (
                  <Pressable className="btn btn-primary" onClick={() => start(step.book, step.chapter, step.missed)}>
                    <RotateCcw size={18} strokeWidth={STROKE} /> {t.practiseMissed} ({step.missed.length})
                  </Pressable>
                )}
                <Pressable className="btn glass" onClick={() => start(step.book, step.chapter)}>
                  {t.newRound}
                </Pressable>
                <Pressable className="btn glass" onClick={() => setStep({ kind: 'books' })}>
                  {t.chooseBook}
                </Pressable>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {index && <p className="caption credit">{index.attribution}</p>}
    </div>
  );
}

export function BookGrid({ counts, lang, onPick }: { counts: Record<string, number>; lang: 'en' | 'ta'; onPick: (b: string) => void }) {
  const t = useT();
  return (
    <>
      {(['OT', 'NT'] as const).map((tm) => (
        <section key={tm}>
          <h2 className="eyebrow section-title">{tm === 'OT' ? t.ot : t.nt}</h2>
          <div className="recall-books">
            {BOOKS.filter((b) => b.testament === tm).map((b) => (
              <Pressable key={b.code} className="recall-book glass" onClick={() => onPick(b.code)}>
                <span className="recall-book-name" lang={lang}>
                  {b[lang]}
                </span>
                <span className="caption">{counts[b.code] ?? 0}</span>
              </Pressable>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

export function ChapterPicker({ chapters: load, onPick }: { chapters: () => Promise<number[]>; onPick: (ch: number | null) => void }) {
  const t = useT();
  const [chapters, setChapters] = useState<number[]>([]);
  useEffect(() => {
    load()
      .then((list) => setChapters([...new Set(list)].filter((c) => c > 0).sort((a, b) => a - b)))
      .catch(() => {});
    // load is recreated on each render; the book is fixed for this picker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="recall-chapters">
      <Pressable className="btn btn-primary" onClick={() => onPick(null)}>
        {t.wholeBook}
      </Pressable>
      <h2 className="eyebrow section-title">{t.orChapter}</h2>
      <div className="chapter-grid">
        {chapters.map((c) => (
          <Pressable key={c} className="chapter-chip glass" onClick={() => onPick(c)}>
            {c}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

function Card({ card, n, total, shown, onShow, onMark }: { card: RecallCard; n: number; total: number; shown: boolean; onShow: () => void; onMark: (knew: boolean) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  // Tamil when chosen and available; English always as the fallback.
  const hasTamil = Boolean(card.qTa && card.aTa);
  const wantsTamil = qLang !== 'en';
  const en = { lang: 'en' as const, q: card.q, a: card.a };
  const ta = hasTamil ? { lang: 'ta' as const, q: card.qTa!, a: card.aTa! } : null;
  const main = ta && (qLang === 'ta' || (qLang === 'both' && uiLang === 'ta')) ? ta : en;
  const second = qLang === 'both' && ta ? (main === ta ? en : ta) : null;
  const showsTamil = Boolean(ta) && wantsTamil;
  return (
    <div className="recall-card-wrap">
      <div className="bar">
        <motion.div className="bar-fill horse-pale" animate={{ width: `${((n - 1) / total) * 100}%` }} transition={spring.calm} />
      </div>
      <motion.article className="recall-card glass" layout transition={spring.calm}>
        <div className="recall-meta">
          <span className="eyebrow">
            {n}/{total} · {formatRef(uiLang, card.book, card.chapter, card.verse, card.verseEnd)}
          </span>
          <ReportButton target={recallTarget(card)} />
        </div>
        {showsTamil && !card.taReviewed && <span className="caption mt-note">{t.machineTamil}</span>}
        {wantsTamil && !hasTamil && <span className="caption mt-note">{t.recallEnglishOnly}</span>}
        <h2 className="q-main" lang={main.lang}>
          {main.q}
        </h2>
        {second && (
          <p className="q-secondary" lang={second.lang}>
            {second.q}
          </p>
        )}
        <AnimatePresence initial={false}>
          {shown && (
            <motion.div
              className="recall-answer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={spring.calm}
            >
              <div className="recall-answer-box">
                <p className="verse" lang={main.lang}>
                  {main.a}
                </p>
                {second && (
                  <p className="verse recall-answer-second" lang={second.lang}>
                    {second.a}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      {!shown ? (
        <Pressable className="btn btn-primary recall-show" onClick={onShow} autoFocus>
          <Eye size={18} strokeWidth={STROKE} /> {t.showAnswer}
        </Pressable>
      ) : (
        <div className="tf-buttons">
          <Pressable silent className="tf-btn glass horse-red" onClick={() => onMark(false)}>
            <X size={22} strokeWidth={STROKE} /> {t.notYet}
          </Pressable>
          <Pressable silent className="tf-btn glass horse-pale" onClick={() => onMark(true)} autoFocus>
            <Check size={22} strokeWidth={STROKE} /> {t.iKnewIt}
          </Pressable>
        </div>
      )}
    </div>
  );
}
