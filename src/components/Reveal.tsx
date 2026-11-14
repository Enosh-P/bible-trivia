import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpenText, Eye } from 'lucide-react';
import type { Lang, Question } from '../engine/types';
import { verseForQuestion } from '../engine/verses';
import { useT } from '../store';
import { spring } from '../motion/springs';
import { STROKE } from './icons';
import { RefVerse } from './RefVerse';
import { VerseText } from './VerseCard';

/** "Show answer" and "Show verse" for looking back at a question (results, notebook). */
export function Reveal({ q, primary, secondary, choice }: { q: Question; primary: Lang; secondary: Lang | null; choice?: number | boolean | null }) {
  const t = useT();
  const [answer, setAnswer] = useState(false);
  const [verse, setVerse] = useState(false);
  const label = (lang: Lang, v: number | boolean) => (q.type === 'tf' ? (v ? t.true : t.false) : (q[lang].options?.[v as number] ?? ''));
  const right = label(primary, q.answer);
  const rightSecond = secondary ? label(secondary, q.answer) : '';
  const yours = choice === undefined ? null : choice === null ? t.timeUp : label(primary, choice);
  const wrong = yours !== null && choice !== q.answer;
  const known = verseForQuestion(q);
  const hasVerse = Boolean(q.verse) || Boolean(known);

  return (
    <div className="reveal">
      <div className="reveal-buttons">
        <button className={`reveal-btn ${answer ? 'is-on' : ''}`} onClick={() => setAnswer((a) => !a)} aria-expanded={answer}>
          <Eye size={15} strokeWidth={STROKE} /> {answer ? t.hideAnswer : t.showAnswer}
        </button>
        {hasVerse && (
          <button className={`reveal-btn ${verse ? 'is-on' : ''}`} onClick={() => setVerse((v) => !v)} aria-expanded={verse}>
            <BookOpenText size={15} strokeWidth={STROKE} /> {verse ? t.hideVerse : t.showVerse}
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {answer && (
          <motion.div key="a" className="reveal-answer" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring.calm}>
            {wrong && (
              <p className="reveal-yours">
                {t.yourAnswer}: <s lang={primary}>{yours}</s>
              </p>
            )}
            <p>
              {t.answerLabel}: <strong lang={primary}>{right}</strong>
              {rightSecond && rightSecond !== right && (
                <span className="answer-sub" lang={secondary!}>
                  {' · '}
                  {rightSecond}
                </span>
              )}
            </p>
          </motion.div>
        )}
        {verse && (
          <motion.div key="v" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring.calm}>
            {q.verse ? (
              <RefVerse book={q.book} chapter={q.chapter} verse={q.verse} verseEnd={q.verseEnd} primary={primary} secondary={secondary} />
            ) : (
              known && <VerseText verse={known} size="sm" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
