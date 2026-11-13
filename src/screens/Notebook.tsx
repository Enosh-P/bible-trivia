import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, NotebookPen, Star } from 'lucide-react';
import { db } from '../storage/db';
import { roundPool } from '../engine/content';
import { counts, summarize } from '../engine/practice';
import type { Question } from '../engine/types';
import { BOOKS, BOOK_BY_CODE } from '../i18n/books';
import { useApp, useT } from '../store';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { LangToggle } from '../components/LangToggle';
import { ReportButton } from '../components/Report';
import { questionTarget } from '../online/reports';

type Entry = { q: Question; wrong: boolean; fixed: boolean; saved: boolean };

/** Read-only list: every question you got wrong (and the ones you saved), with the right answer. */
export function Notebook({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const primary = qLang === 'both' ? uiLang : qLang;
  const both = qLang === 'both' ? (primary === 'en' ? 'ta' : 'en') : null;
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [tab, setTab] = useState<'mistakes' | 'saved'>('mistakes');
  const [book, setBook] = useState('');

  useEffect(() => {
    (async () => {
      const answers = (await db.answers.toArray().catch(() => [])).filter((a) => counts(a.questionId, a.mode));
      const open = new Set(summarize(answers).toFix);
      const wrong = [...new Set(answers.filter((a) => !a.correct).sort((a, b) => b.at - a.at).map((a) => a.questionId))];
      const saved = (await db.saved.orderBy('at').reverse().toArray().catch(() => [])).map((r) => r.id);
      const ids = [...new Set([...wrong, ...saved])];
      const pool = await roundPool({ kind: 'ids', ids }).catch(() => []);
      const byId = new Map(pool.map((q) => [q.id, q]));
      const savedSet = new Set(saved);
      const wrongSet = new Set(wrong);
      setEntries(
        ids
          .map((id) => byId.get(id))
          .filter((q): q is Question => Boolean(q))
          .map((q) => {
            const w = wrongSet.has(q.id);
            return { q, wrong: w, fixed: w && !open.has(q.id), saved: savedSet.has(q.id) };
          }),
      );
    })();
  }, []);

  const list = useMemo(
    () => (entries ?? []).filter((e) => (tab === 'saved' ? e.saved : e.wrong) && (!book || e.q.book === book)),
    [entries, tab, book],
  );
  const books = useMemo(() => {
    const set = new Set((entries ?? []).map((e) => e.q.book));
    return BOOKS.filter((b) => set.has(b.code));
  }, [entries]);

  const answerText = (q: Question, lang: 'en' | 'ta') => (q.type === 'tf' ? (q.answer ? t.true : t.false) : q[lang].options?.[q.answer as number] ?? '');

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.tabProgress}</p>
          <h1 className="title">{t.notebook}</h1>
        </div>
        <LangToggle compact />
        <IconTile horse="white" icon={NotebookPen} size={40} />
      </header>

      <div className="notebook-filters">
        <div className="segmented small" role="tablist">
          {(['mistakes', 'saved'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
              {k === 'mistakes' ? t.mistakesTab : t.savedQuestions}
            </button>
          ))}
        </div>
        <select className="field notebook-book" value={book} onChange={(e) => setBook(e.target.value)} aria-label={t.chooseBook}>
          <option value="">{t.allBooks}</option>
          {books.map((b) => (
            <option key={b.code} value={b.code}>
              {b[uiLang]}
            </option>
          ))}
        </select>
      </div>

      {entries && list.length === 0 && <p className="caption">{t.notebookEmpty}</p>}
      <div className="notebook-list">
        {list.map(({ q, fixed, saved }) => {
          const secondary = both && q[both].q !== q[primary].q ? both : null;
          return (
          <article key={q.id} className="glass card-pad notebook-item">
            <div className="notebook-meta">
              <span className="caption">{q[primary].explain || BOOK_BY_CODE[q.book]?.[uiLang]}</span>
              {fixed && tab === 'mistakes' && (
                <span className="notebook-fixed">
                  <CheckCircle2 size={14} strokeWidth={STROKE} /> {t.fixed}
                </span>
              )}
              {saved && <Star size={14} strokeWidth={STROKE} className="save-btn is-on" fill="currentColor" />}
              <ReportButton target={questionTarget(q)} compact />
            </div>
            <p className="notebook-q" lang={primary}>
              {q[primary].q}
            </p>
            {secondary && (
              <p className="q-secondary" lang={secondary}>
                {q[secondary].q}
              </p>
            )}
            <p className="notebook-a">
              <span className="caption">{t.answerLabel}: </span>
              <strong lang={primary}>{answerText(q, primary)}</strong>
              {secondary && (
                <>
                  {' · '}
                  <span className="answer-sub" lang={secondary}>
                    {answerText(q, secondary)}
                  </span>
                </>
              )}
            </p>
          </article>
          );
        })}
      </div>
    </div>
  );
}
