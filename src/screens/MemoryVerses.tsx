import { Fragment, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { VERSES, type Verse } from '../engine/verses';
import { LEARNED, makeRound, sameWord } from '../engine/memory';
import { formatRef, BOOKS } from '../i18n/books';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { cue } from '../feedback';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { LangToggle } from '../components/LangToggle';
import { syncSoon } from '../online/practiceSync';
import { chapterSizes, verseWords } from '../engine/bible';

/** One shared empty object, so the store selector doesn't change on every read. */
const NO_MEMORY: Record<string, number> = {};

const NO_VERSES: Verse[] = [];

const ORDER = BOOKS.map((b) => b.code);
const byRef = (a: Verse, b: Verse) => ORDER.indexOf(a.book) - ORDER.indexOf(b.book) || a.chapter - b.chapter || a.verse - b.verse;
const SORTED = [...VERSES].sort(byRef);

/** A verse's words in the chosen language, or the other one if only that was added. */
export function verseText(v: Verse, lang: 'en' | 'ta'): { text: string; lang: 'en' | 'ta' } {
  if (v[lang]?.trim()) return { text: v[lang], lang };
  const other = lang === 'en' ? 'ta' : 'en';
  return { text: v[other], lang: other };
}

const ref = (v: Verse, lang: 'en' | 'ta') => formatRef(lang, v.book, v.chapter, v.verse, (v as Verse & { verseEnd?: number }).verseEnd);

/** Learn verses by heart: each round hides more words. */
export function MemoryVerses({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const memory = useApp((s) => s.memory ?? NO_MEMORY);
  const lang = qLang === 'both' ? uiLang : qLang;
  const mine = useApp((s) => (s.myVerses as Verse[] | undefined) ?? NO_VERSES);
  const [verse, setVerse] = useState<Verse | null>(null);
  const [adding, setAdding] = useState(false);
  const all = [...mine, ...SORTED];
  const learned = all.filter((v) => (memory[v.id] ?? 0) >= LEARNED).length;
  const isMine = (v: Verse) => v.id.startsWith('my-');

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={() => (verse ? setVerse(null) : onExit())} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.memoryTitle}</p>
          <h1 className="title">{verse ? ref(verse, lang) : t.memoryLearned(learned, all.length)}</h1>
        </div>
        <LangToggle compact />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={verse?.id ?? 'list'} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring.calm} className="recall-body">
          {verse ? (
            <>
              <MemoryRound verse={verse} lang={verseText(verse, lang).lang} />
              {isMine(verse) && (
                <button
                  className="link danger memory-remove"
                  onClick={() => {
                    useApp.setState((s) => ({ myVerses: (s.myVerses ?? []).filter((v) => v.id !== verse.id), practiceUpdatedAt: Date.now() }));
                    syncSoon();
                    setVerse(null);
                  }}
                >
                  <Trash2 size={14} strokeWidth={STROKE} /> {t.removeVerse}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="caption">{t.memoryHelp}</p>
              <Pressable className="btn btn-primary" onClick={() => setAdding(true)}>
                <Plus size={18} strokeWidth={STROKE} /> {t.addVerse}
              </Pressable>
              {mine.length > 0 && <h2 className="eyebrow section-title">{t.myVerses}</h2>}
              <div className="memory-list">
                {all.map((v, i) => {
                  const shown = verseText(v, lang);
                  const level = memory[v.id] ?? 0;
                  return (
                    <Fragment key={v.id}>
                    {i === mine.length && mine.length > 0 && <h2 className="eyebrow section-title">{t.versesOfTheDay}</h2>}
                    <Pressable className="memory-item glass" onClick={() => setVerse(v)}>
                      <div className="grow">
                        <strong>{ref(v, lang)}</strong>
                        <span className="caption memory-preview" lang={shown.lang}>
                          {shown.text}
                        </span>
                      </div>
                      {level >= LEARNED ? (
                        <span className="memory-done" aria-label={t.memoryDone}>
                          <Check size={16} strokeWidth={2.4} />
                        </span>
                      ) : (
                        <span className="memory-dots" aria-label={`${level}/${LEARNED}`}>
                          {Array.from({ length: LEARNED }, (_, i) => (
                            <i key={i} className={i < level ? 'on' : ''} />
                          ))}
                        </span>
                      )}
                    </Pressable>
                    </Fragment>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <AddVerse
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={(v) => {
          setAdding(false);
          setVerse(v);
        }}
      />
    </div>
  );
}

/** Add your own verse: pick book, chapter and verse(s); the words come from the Bible text (both languages). */
function AddVerse({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (v: Verse) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const [book, setBook] = useState('JHN');
  const [sizes, setSizes] = useState<number[] | null | 'loading'>('loading');
  const [chapter, setChapter] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(0); // 0 = just the one verse
  const [en, setEn] = useState('');
  const [ta, setTa] = useState('');
  const ok = chapter > 0 && from > 0 && (en.trim().length > 3 || ta.trim().length > 3);

  // The book's chapters and verse counts.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setSizes('loading');
    void chapterSizes(book).then((s) => alive && setSizes(s));
    return () => {
      alive = false;
    };
  }, [book, open]);

  // The words of the chosen verse(s), filled in by themselves.
  useEffect(() => {
    if (!open || !Array.isArray(sizes)) return;
    let alive = true;
    void verseWords(book, chapter, from, to > from ? to : undefined)
      .then((w) => {
        if (!alive || !w) return;
        setEn(w.en);
        setTa(w.ta);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [book, chapter, from, to, sizes, open]);

  const chapters = Array.isArray(sizes) ? sizes.length : 0;
  const verses = Array.isArray(sizes) ? (sizes[chapter - 1] ?? 0) : 0;
  const range = (n: number, start = 1) => Array.from({ length: Math.max(0, n - start + 1) }, (_, i) => start + i);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ok) return;
    const verseEnd = to > from ? to : undefined;
    const v = { id: `my-${Date.now().toString(36)}`, book, chapter, verse: from, ...(verseEnd ? { verseEnd } : {}), en: en.trim(), ta: ta.trim() };
    useApp.setState((s) => ({ myVerses: [v, ...(s.myVerses ?? [])], practiceUpdatedAt: Date.now() }));
    syncSoon();
    onAdded(v as Verse);
  }

  const offline = sizes === null;
  return (
    <Sheet open={open} onClose={onClose} label={t.addVerse}>
      <form className="add-verse" onSubmit={save} lang={uiLang}>
        <h2 className="title">{t.addVerse}</h2>
        <p className="caption">{t.addVerseHelp}</p>
        <select
          className="field"
          value={book}
          onChange={(e) => {
            setBook(e.target.value);
            setChapter(1);
            setFrom(1);
            setTo(0);
            setEn('');
            setTa('');
          }}
          aria-label={t.chooseBook}
        >
          {BOOKS.map((b) => (
            <option key={b.code} value={b.code}>
              {b[uiLang]}
            </option>
          ))}
        </select>
        {offline ? (
          <div className="add-verse-ref">
            <input className="field" inputMode="numeric" placeholder={t.chapterLabel} value={chapter || ''} onChange={(e) => setChapter(Number(e.target.value.replace(/\D/g, '')))} aria-label={t.chapterLabel} />
            <input className="field" inputMode="numeric" placeholder={t.verseLabel} value={from || ''} onChange={(e) => setFrom(Number(e.target.value.replace(/\D/g, '')))} aria-label={t.verseLabel} />
            <input className="field" inputMode="numeric" placeholder={t.toVerseLabel} value={to || ''} onChange={(e) => setTo(Number(e.target.value.replace(/\D/g, '')))} aria-label={t.toVerseLabel} />
          </div>
        ) : (
          <div className="add-verse-ref">
            <label className="pick">
              <span className="eyebrow">{t.chapterLabel}</span>
              <select
                className="field"
                value={chapter}
                disabled={!chapters}
                onChange={(e) => {
                  setChapter(Number(e.target.value));
                  setFrom(1);
                  setTo(0);
                }}
              >
                {range(chapters || 1).map((n) => (
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
                  setFrom(f);
                  if (to && (to <= f || to > f + 4)) setTo(0);
                }}
              >
                {range(verses || 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="pick">
              <span className="eyebrow">{t.toVerseLabel}</span>
              <select className="field" value={to} disabled={!verses} onChange={(e) => setTo(Number(e.target.value))}>
                <option value={0}>–</option>
                {range(Math.min(verses, from + 4), from + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {offline && <p className="caption form-msg is-info">{t.verseOffline}</p>}
        <textarea className="field" rows={3} lang="en" placeholder={t.verseEnglish} value={en} onChange={(e) => setEn(e.target.value)} />
        <textarea className="field" rows={3} lang="ta" placeholder={t.verseTamil} value={ta} onChange={(e) => setTa(e.target.value)} />
        <Pressable className="btn btn-primary" type="submit" disabled={!ok}>
          <Plus size={18} strokeWidth={STROKE} /> {t.addVerse}
        </Pressable>
      </form>
    </Sheet>
  );
}

function MemoryRound({ verse, lang }: { verse: Verse; lang: 'en' | 'ta' }) {
  const t = useT();
  const level = useApp((s) => s.memory?.[verse.id] ?? 0);
  const finishRound = useApp((s) => s.finishRound);
  const [attempt, setAttempt] = useState(0);
  // The level this round was started at (the stored level moves up when it's finished).
  const [roundLevel, setRoundLevel] = useState(level);
  const round = useMemo(() => makeRound(verseText(verse, lang).text, roundLevel, `${verse.id}:${lang}:${roundLevel}:${attempt}`), [verse, lang, roundLevel, attempt]);
  const [filled, setFilled] = useState(0);
  const [used, setUsed] = useState<boolean[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const [result, setResult] = useState<'up' | 'again' | null>(null);

  const blanks = round.pieces.filter((p) => p.blank);
  const next = blanks[filled]?.blank;

  function reset(newAttempt = attempt + 1) {
    setAttempt(newAttempt);
    setRoundLevel(useApp.getState().memory?.[verse.id] ?? 0);
    setFilled(0);
    setUsed([]);
    setMistakes(0);
    setResult(null);
  }

  function pick(i: number) {
    if (used[i] || !next || result) return;
    if (sameWord(round.bank[i], next)) {
      cue('tap');
      const u = [...used];
      u[i] = true;
      setUsed(u);
      const done = filled + 1;
      setFilled(done);
      if (done === blanks.length) {
        const up = mistakes <= 1;
        cue(up ? 'correct' : 'complete');
        setResult(up ? 'up' : 'again');
        finishRound({ xp: up ? 10 : 3, correct: done - mistakes, total: done, score: 0 });
        if (up) {
          useApp.setState((s) => ({ memory: { ...(s.memory ?? {}), [verse.id]: Math.min(LEARNED, roundLevel + 1) }, practiceUpdatedAt: Date.now() }));
          syncSoon();
        }
      }
    } else {
      cue('wrong');
      setMistakes((m) => m + 1);
      setShake(i);
      setTimeout(() => setShake(null), 400);
    }
  }

  let b = 0;
  return (
    <div className="memory-round">
      <div className="memory-level">
        {Array.from({ length: 4 }, (_, i) => (
          <i key={i} className={i < level ? 'on' : i === roundLevel ? 'now' : ''} />
        ))}
        <span className="caption">{roundLevel >= LEARNED ? t.memoryDone : t.memoryStep(roundLevel + 1)}</span>
      </div>

      <div className="glass card-pad memory-verse" lang={lang}>
        {round.pieces.map((p, i) => {
          if (!p.blank) return <span key={i}>{p.text} </span>;
          const index = b++;
          const shown = index < filled;
          const before = p.text.slice(0, p.text.indexOf(p.blank));
          const after = p.text.slice(p.text.indexOf(p.blank) + p.blank.length);
          return (
            <span key={i}>
              {before}
              {shown ? (
                <motion.span className="memory-word" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={spring.flick}>
                  {p.blank}
                </motion.span>
              ) : (
                <span className={`memory-blank ${index === filled ? 'is-next' : ''}`} style={{ minWidth: `${Math.min(8, Math.max(2, p.blank.length)) * 0.55}em` }} />
              )}
              {after}{' '}
            </span>
          );
        })}
      </div>

      {!result ? (
        <div className="memory-bank" lang={lang}>
          {round.bank.map((w, i) => (
            <motion.button
              key={`${attempt}-${i}`}
              className={`memory-chip ${used[i] ? 'is-used' : ''}`}
              onClick={() => pick(i)}
              disabled={used[i]}
              animate={shake === i ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
            >
              {w}
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.div className="glass card-pad memory-result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm}>
          <strong>{result === 'up' ? (level >= LEARNED ? t.memoryLearnedOne : t.memoryUp) : t.memoryAgain(mistakes)}</strong>
          <Pressable className="btn btn-primary" onClick={() => reset()}>
            {result === 'up' ? <Check size={18} strokeWidth={STROKE} /> : <RotateCcw size={18} strokeWidth={STROKE} />}
            {result === 'up' && level < LEARNED ? t.memoryNext : t.memoryTryAgain}
          </Pressable>
        </motion.div>
      )}
      {!verse.id.startsWith('my-') && <p className="caption credit">{lang === 'ta' ? 'BSI – Tamil – O.V.' : 'KJV'}</p>}
    </div>
  );
}
