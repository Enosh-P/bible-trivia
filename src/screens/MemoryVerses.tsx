import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, PenLine, RotateCcw } from 'lucide-react';
import { VERSES, type Verse } from '../engine/verses';
import { LEARNED, makeRound, sameWord } from '../engine/memory';
import { formatRef, BOOKS } from '../i18n/books';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { cue } from '../feedback';
import { Pressable } from '../components/Pressable';
import { IconTile, STROKE } from '../components/icons';
import { LangToggle } from '../components/LangToggle';

/** One shared empty object, so the store selector doesn't change on every read. */
const NO_MEMORY: Record<string, number> = {};

const ORDER = BOOKS.map((b) => b.code);
const SORTED = [...VERSES].sort((a, b) => ORDER.indexOf(a.book) - ORDER.indexOf(b.book) || a.chapter - b.chapter || a.verse - b.verse);

/** Learn verses by heart: each round hides more words. */
export function MemoryVerses({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const memory = useApp((s) => s.memory ?? NO_MEMORY);
  const lang = qLang === 'both' ? uiLang : qLang;
  const [verse, setVerse] = useState<Verse | null>(null);
  const learned = SORTED.filter((v) => (memory[v.id] ?? 0) >= LEARNED).length;

  return (
    <div className="screen recall" lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={() => (verse ? setVerse(null) : onExit())} aria-label={t.back}>
          <ChevronLeft size={20} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.memoryTitle}</p>
          <h1 className="title">{verse ? formatRef(lang, verse.book, verse.chapter, verse.verse) : t.memoryLearned(learned, SORTED.length)}</h1>
        </div>
        <LangToggle compact />
        <IconTile horse="pale" icon={PenLine} size={40} />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={verse?.id ?? 'list'} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring.calm} className="recall-body">
          {verse ? (
            <MemoryRound verse={verse} lang={lang} />
          ) : (
            <>
              <p className="caption">{t.memoryHelp}</p>
              <div className="memory-list">
                {SORTED.map((v) => {
                  const level = memory[v.id] ?? 0;
                  return (
                    <Pressable key={v.id} className="memory-item glass" onClick={() => setVerse(v)}>
                      <div className="grow">
                        <strong>{formatRef(lang, v.book, v.chapter, v.verse)}</strong>
                        <span className="caption memory-preview" lang={lang}>
                          {v[lang]}
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
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function MemoryRound({ verse, lang }: { verse: Verse; lang: 'en' | 'ta' }) {
  const t = useT();
  const level = useApp((s) => s.memory?.[verse.id] ?? 0);
  const finishRound = useApp((s) => s.finishRound);
  const [attempt, setAttempt] = useState(0);
  // The level this round was started at (the stored level moves up when it's finished).
  const [roundLevel, setRoundLevel] = useState(level);
  const round = useMemo(() => makeRound(verse[lang], roundLevel, `${verse.id}:${lang}:${roundLevel}:${attempt}`), [verse, lang, roundLevel, attempt]);
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
        if (up) useApp.setState((s) => ({ memory: { ...(s.memory ?? {}), [verse.id]: Math.min(LEARNED, roundLevel + 1) } }));
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
      <p className="caption credit">{lang === 'ta' ? 'BSI – Tamil – O.V.' : 'KJV'}</p>
    </div>
  );
}
