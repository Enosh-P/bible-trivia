import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookMarked, Dumbbell, History, Library, NotebookPen, PenLine, Star, type LucideIcon } from 'lucide-react';
import { db } from '../storage/db';
import { summarize, type PracticeSummary } from '../engine/practice';
import { VERSES } from '../engine/verses';
import { LEARNED } from '../engine/memory';
import { BOOK_BY_CODE } from '../i18n/books';
import type { Horse } from '../engine/modes';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { IconTile } from '../components/icons';
import { LangToggle } from '../components/LangToggle';
import { Progress } from './Progress';

/** One shared empty object, so the store selector doesn't change on every read. */
const NO_MEMORY: Record<string, number> = {};

/** At most this many questions in one practice round. */
export const PRACTICE_ROUND = 20;

export type PracticeAction =
  | { kind: 'ids'; ids: string[] }
  | { kind: 'drill' }
  | { kind: 'memory' }
  | { kind: 'notebook' }
  | { kind: 'book'; book: string };

/** The Practice tab: mistakes, reviews, saved questions, memory verses, the books drill, weak books, and your progress. */
export function Practice({ onAction }: { onAction: (a: PracticeAction) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const memory = useApp((s) => s.memory ?? NO_MEMORY);
  const [sum, setSum] = useState<PracticeSummary | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [wrongEver, setWrongEver] = useState(0);

  useEffect(() => {
    (async () => {
      const answers = await db.answers.toArray().catch(() => []);
      setSum(summarize(answers));
      setWrongEver(new Set(answers.filter((a) => !a.correct && !a.questionId.startsWith('uw-') && !a.questionId.startsWith('gen-')).map((a) => a.questionId)).size);
      setSaved((await db.saved.orderBy('at').reverse().toArray().catch(() => [])).map((r) => r.id));
    })();
  }, []);

  const learned = VERSES.filter((v) => (memory[v.id] ?? 0) >= LEARNED).length;
  const cards: { key: string; icon: LucideIcon; horse: Horse; title: string; sub: string; count?: number; onClick?: () => void }[] = [
    {
      key: 'fix',
      icon: Dumbbell,
      horse: 'red',
      title: t.fixMistakes,
      sub: sum?.toFix.length ? t.nToFix(sum.toFix.length) : t.nothingToFix,
      count: sum?.toFix.length,
      onClick: sum?.toFix.length ? () => onAction({ kind: 'ids', ids: sum.toFix.slice(0, PRACTICE_ROUND) }) : undefined,
    },
    {
      key: 'review',
      icon: History,
      horse: 'pale',
      title: t.reviewDue,
      sub: sum?.due.length ? t.nDue(sum.due.length) : t.nothingDue,
      count: sum?.due.length,
      onClick: sum?.due.length ? () => onAction({ kind: 'ids', ids: sum.due.slice(0, PRACTICE_ROUND) }) : undefined,
    },
    {
      key: 'saved',
      icon: Star,
      horse: 'white',
      title: t.savedQuestions,
      sub: saved.length ? t.nSaved(saved.length) : t.nothingSaved,
      count: saved.length,
      onClick: saved.length ? () => onAction({ kind: 'ids', ids: saved.slice(0, PRACTICE_ROUND) }) : undefined,
    },
    { key: 'memory', icon: PenLine, horse: 'pale', title: t.memoryTitle, sub: t.memoryLearned(learned, VERSES.length), onClick: () => onAction({ kind: 'memory' }) },
    { key: 'drill', icon: Library, horse: 'black', title: t.modeName.drill, sub: t.modeSub.drill, onClick: () => onAction({ kind: 'drill' }) },
    { key: 'notebook', icon: NotebookPen, horse: 'white', title: t.notebook, sub: t.nNotebook(wrongEver, saved.length), onClick: () => onAction({ kind: 'notebook' }) },
  ];

  return (
    <div className="screen" lang={uiLang}>
      <header className="home-head">
        <div className="home-head-row">
          <p className="caption">{t.practiceLead}</p>
          <LangToggle />
        </div>
        <h1 className="display">{t.tabProgress}</h1>
      </header>

      <div className="practice-grid">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.calm, delay: 0.03 * i }}>
            <Pressable className={`practice-card glass ${c.onClick ? '' : 'is-empty'}`} onClick={c.onClick} disabled={!c.onClick}>
              <div className="practice-card-top">
                <IconTile horse={c.horse} icon={c.icon} size={34} />
                {!!c.count && <span className="practice-count">{c.count > 99 ? '99+' : c.count}</span>}
              </div>
              <strong>{c.title}</strong>
              <span className="caption">{c.sub}</span>
            </Pressable>
          </motion.div>
        ))}
      </div>

      <section className="glass card-pad">
        <h2 className="eyebrow">
          <BookMarked size={14} /> {t.weakSpots}
        </h2>
        {sum && sum.books.length === 0 && <p className="caption">{t.weakSpotsEmpty}</p>}
        <div className="weak-list">
          {sum?.books.slice(0, 6).map((b) => (
            <Pressable key={b.book} className="weak-row" onClick={() => onAction({ kind: 'book', book: b.book })}>
              <span className="weak-name">{BOOK_BY_CODE[b.book]?.[uiLang] ?? b.book}</span>
              <span className="weak-bar">
                <span style={{ width: `${b.pct}%` }} className={b.pct < 50 ? 'is-low' : b.pct < 75 ? 'is-mid' : 'is-high'} />
              </span>
              <span className="weak-pct">{b.pct}%</span>
            </Pressable>
          ))}
        </div>
        {sum && sum.books.length > 0 && <p className="caption">{t.weakSpotsHint}</p>}
      </section>

      <Progress embedded />
    </div>
  );
}
