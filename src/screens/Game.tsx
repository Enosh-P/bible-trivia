import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { Check, Heart, X } from 'lucide-react';
import { questionPool } from '../engine/content';
import { MODES, type ModeId } from '../engine/modes';
import { pickDaily, pickQuestions } from '../engine/picker';
import { isCorrect, pointsFor } from '../engine/scoring';
import type { Lang, Question } from '../engine/types';
import { formatRef } from '../i18n/books';
import { STRINGS } from '../i18n/strings';
import { db, recentQuestionIds, weakQuestionIds } from '../storage/db';
import { useApp, useT } from '../store';
import { cue } from '../feedback';
import { project, spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { TimerRing } from '../components/TimerRing';
import { ArtSticker } from '../components/ArtSticker';
import { IconTile, MODE_ICON, STROKE } from '../components/icons';
import { VerseText } from '../components/VerseCard';
import { ReportButton } from '../components/Report';
import { questionTarget } from '../online/reports';
import { verseForQuestion } from '../engine/verses';

export interface AnswerLog {
  q: Question;
  choice: number | boolean | null;
  correct: boolean;
}

export interface RoundResult {
  mode: ModeId;
  score: number;
  correct: number;
  total: number;
  bestCombo: number;
  log: AnswerLog[];
}

type Answered = { choice: number | boolean | null; correct: boolean } | null;

export function Game({ modeId, onExit, onDone }: { modeId: ModeId; onExit: () => void; onDone: (r: RoundResult) => void }) {
  const mode = MODES[modeId];
  const t = useT();
  const qLang = useApp((s) => s.qLang);
  const uiLang = useApp((s) => s.uiLang);
  const primary: Lang = qLang === 'both' ? uiLang : qLang;
  const secondary: Lang | null = qLang === 'both' ? (primary === 'en' ? 'ta' : 'en') : null;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lives, setLives] = useState(mode.lives ?? 0);
  const [log, setLog] = useState<AnswerLog[]>([]);
  const [qLeft, setQLeft] = useState(mode.perQuestion);
  const [roundLeft, setRoundLeft] = useState(mode.roundSeconds ?? 0);
  const finished = useRef(false);

  // Build the round.
  useEffect(() => {
    let alive = true;
    (async () => {
      const pool = await questionPool();
      const qs =
        modeId === 'daily'
          ? pickDaily(pool, mode)
          : pickQuestions(pool, mode, {
              weak: await weakQuestionIds().catch(() => undefined),
              recent: await recentQuestionIds().catch(() => undefined),
            });
      if (alive) setQuestions(qs);
    })();
    return () => {
      alive = false;
    };
  }, [modeId, mode]);

  const q = questions?.[index];

  const finish = useCallback(
    (finalLog: AnswerLog[], finalScore: number, finalBest: number) => {
      if (finished.current) return;
      finished.current = true;
      cue('complete');
      onDone({
        mode: modeId,
        score: finalScore,
        correct: finalLog.filter((l) => l.correct).length,
        total: finalLog.length,
        bestCombo: finalBest,
        log: finalLog,
      });
    },
    [modeId, onDone],
  );

  const goNext = useCallback(() => {
    if (!questions) return;
    const outOfLives = mode.lives !== undefined && lives <= 0;
    const outOfTime = mode.roundSeconds !== undefined && roundLeft <= 0;
    if (outOfLives || outOfTime || index + 1 >= questions.length) {
      finish(log, score, bestCombo);
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
    setQLeft(mode.perQuestion);
  }, [questions, mode, lives, roundLeft, index, log, score, bestCombo, finish]);

  const answer = useCallback(
    (choice: number | boolean | null) => {
      if (!q || answered) return;
      const ok = choice !== null && isCorrect(q, choice);
      const nextCombo = ok ? combo + 1 : 0;
      const pts = pointsFor({
        correct: ok,
        difficulty: q.difficulty,
        secondsLeft: mode.perQuestion ? qLeft : undefined,
        secondsTotal: mode.perQuestion || undefined,
        combo,
      });
      cue(ok ? 'correct' : 'wrong');
      setAnswered({ choice, correct: ok });
      setScore((s) => s + pts);
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      if (!ok && mode.lives !== undefined) setLives((l) => l - 1);
      setLog((l) => [...l, { q, choice, correct: ok }]);
      void db.answers.add({ questionId: q.id, book: q.book, correct: ok, mode: modeId, at: Date.now() }).catch(() => {});
    },
    [q, answered, combo, mode, qLeft, modeId],
  );

  // Auto-advance: quick after a right answer; wrong answers wait for "Next" so there's time to learn.
  useEffect(() => {
    if (!answered || mode.study) return;
    const fast = mode.roundSeconds !== undefined;
    if (!answered.correct && !fast) return;
    const id = setTimeout(goNext, fast ? 450 : 900);
    return () => clearTimeout(id);
  }, [answered, mode, goNext]);

  // Per-question timer.
  useEffect(() => {
    if (!q || answered || !mode.perQuestion) return;
    if (qLeft <= 0) {
      answer(null);
      return;
    }
    const id = setTimeout(() => {
      if (qLeft <= 4) cue('tick');
      setQLeft((s) => s - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [q, answered, qLeft, mode.perQuestion, answer]);

  // Whole-round timer (Speed).
  useEffect(() => {
    if (!questions || !mode.roundSeconds) return;
    if (roundLeft <= 0) {
      finish(log, score, bestCombo);
      return;
    }
    const id = setTimeout(() => setRoundLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [questions, roundLeft, mode.roundSeconds, finish, log, score, bestCombo]);

  const total = Number.isFinite(mode.length) ? Math.min(mode.length, questions?.length ?? 0) : null;
  const typeLabel = q ? { mcq: '', tf: t.trueOrFalse, who: t.whoSaid, book: t.whichBook, blank: t.fillBlank }[q.type] : '';

  return (
    <div className="game">
      <header className="game-top">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.quit}>
          <X size={18} strokeWidth={STROKE} />
        </Pressable>
        <div className="game-progress">
          {total ? (
            <div className="bar">
              <motion.div
                className={`bar-fill horse-${mode.horse}`}
                animate={{ width: `${((index + (answered ? 1 : 0)) / total) * 100}%` }}
                transition={spring.calm}
              />
            </div>
          ) : (
            <div className="caption">
              {mode.lives !== undefined && (
                <span className="lives" aria-label={`${t.lives}: ${lives}`}>
                  {Array.from({ length: mode.lives }, (_, i) => (
                    <motion.span key={i} animate={{ scale: i < lives ? 1 : 0.7, opacity: i < lives ? 1 : 0.25 }} transition={spring.flick}>
                      <Heart size={16} strokeWidth={STROKE} fill={i < lives ? 'currentColor' : 'none'} />
                    </motion.span>
                  ))}
                </span>
              )}
            </div>
          )}
        </div>
        <motion.div className="score-chip glass" key={score} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={spring.flick}>
          {score}
        </motion.div>
        {mode.perQuestion > 0 && <TimerRing progress={qLeft / mode.perQuestion} seconds={qLeft} horse={mode.horse} />}
        {mode.roundSeconds && <TimerRing progress={roundLeft / mode.roundSeconds} seconds={roundLeft} horse={mode.horse} />}
      </header>

      <AnimatePresence mode="popLayout" initial={false}>
        {q && (
          <motion.section
            key={q.id}
            className="question-wrap"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={spring.calm}
          >
            <div className="q-meta">
              <IconTile horse={mode.horse} icon={MODE_ICON[modeId]} size={30} />
              <span className="eyebrow">
                {total ? `${t.question} ${index + 1} ${t.of} ${total}` : `#${index + 1}`}
                {typeLabel ? ` · ${typeLabel}` : ''}
              </span>
              {combo >= 2 && (
                <motion.span className="combo" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.flick}>
                  ×{combo}
                </motion.span>
              )}
              <ReportButton target={questionTarget(q)} />
            </div>

            {q.art && <ArtSticker name={q.art} />}

            {q.type === 'tf' ? (
              <TrueFalseCard q={q} primary={primary} secondary={secondary} answered={answered} onAnswer={answer} />
            ) : (
              <>
                <QuestionText q={q} primary={primary} secondary={secondary} />
                <div className="options">
                  {q[primary].options!.map((opt, i) => (
                    <AnswerButton
                      key={i}
                      label={opt}
                      sub={secondary ? q[secondary].options![i] : undefined}
                      lang={primary}
                      subLang={secondary}
                      state={
                        !answered
                          ? 'idle'
                          : i === q.answer
                            ? answered.choice === i
                              ? 'correct'
                              : 'reveal'
                            : answered.choice === i
                              ? 'wrong'
                              : 'dim'
                      }
                      onPick={() => answer(i)}
                    />
                  ))}
                </div>
              </>
            )}

            <AnimatePresence>
              {answered && (!answered.correct || mode.study) && mode.roundSeconds === undefined && (
                <Feedback q={q} answered={answered} primary={primary} last={!!total && index + 1 >= total} onNext={goNext} lives={mode.lives !== undefined ? lives : undefined} />
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionText({ q, primary, secondary }: { q: Question; primary: Lang; secondary: Lang | null }) {
  const quote = q.type === 'who' || q.type === 'blank';
  const render = (s: string) => s.split('____').flatMap((part, i) => (i === 0 ? [part] : [<span key={i} className="blank" />, part]));
  return (
    <div className="q-text">
      <h2 lang={primary} className={quote ? 'verse q-quote' : 'q-main'}>
        {render(q[primary].q)}
      </h2>
      {secondary && (
        <p lang={secondary} className={`q-secondary ${quote ? 'verse' : ''}`}>
          {render(q[secondary].q)}
        </p>
      )}
    </div>
  );
}

type BtnState = 'idle' | 'correct' | 'wrong' | 'reveal' | 'dim';

/** An answer option. A right answer fills with a liquid ripple from where you tapped. */
function AnswerButton({ label, sub, lang, subLang, state, onPick }: { label: string; sub?: string; lang: Lang; subLang: Lang | null; state: BtnState; onPick: () => void }) {
  const origin = useRef({ x: 0, y: 0 });
  const reduce = useReducedMotion();
  return (
    <Pressable
      silent
      className={`answer glass is-${state}`}
      disabled={state !== 'idle'}
      onPointerDown={(e: RPointerEvent<HTMLButtonElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        origin.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onClick={(e) => {
        if (e.detail === 0) {
          // Keyboard: ripple from the centre.
          const r = e.currentTarget.getBoundingClientRect();
          origin.current = { x: r.width / 2, y: r.height / 2 };
        }
        onPick();
      }}
      animate={state === 'wrong' && !reduce ? { x: [0, -9, 8, -5, 3, 0] } : { x: 0 }}
      transition={state === 'wrong' ? { duration: 0.42, ease: 'easeOut' } : spring.snappy}
    >
      {(state === 'correct' || state === 'wrong') && (
        <motion.span
          className={`ripple ${state}`}
          style={{ left: origin.current.x, top: origin.current.y }}
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.7 }}
        />
      )}
      <span className="answer-text">
        <span lang={lang}>{label}</span>
        {sub && (
          <span lang={subLang ?? undefined} className="answer-sub">
            {sub}
          </span>
        )}
      </span>
      {state === 'correct' || state === 'reveal' ? (
        <Check className="answer-mark" size={20} strokeWidth={2} />
      ) : state === 'wrong' ? (
        <X className="answer-mark" size={20} strokeWidth={2} />
      ) : null}
    </Pressable>
  );
}

/** Swipeable statement card: right = true, left = false. Buttons do the same for accessibility. */
function TrueFalseCard({ q, primary, secondary, answered, onAnswer }: { q: Question; primary: Lang; secondary: Lang | null; answered: Answered; onAnswer: (v: boolean) => void }) {
  const t = STRINGS[useApp((s) => s.uiLang)];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-12, 12]);
  const trueGlow = useTransform(x, [20, 140], [0, 1]);
  const falseGlow = useTransform(x, [-140, -20], [1, 0]);
  const THRESHOLD = 130;

  const commit = useCallback(
    (v: boolean, velocity = 0) => {
      if (answered) return;
      onAnswer(v);
      // Slide off in the swipe direction, inheriting the finger's speed, then settle back for feedback.
      animate(x, v ? 70 : -70, { ...spring.flick, velocity });
    },
    [answered, onAnswer, x],
  );

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = x.get() + project(info.velocity.x, 0.99);
    if (projected > THRESHOLD) commit(true, info.velocity.x);
    else if (projected < -THRESHOLD) commit(false, info.velocity.x);
    else animate(x, 0, { ...spring.flick, velocity: info.velocity.x });
  }

  const resultClass = answered ? (answered.correct ? 'is-correct' : 'is-wrong') : '';

  return (
    <div className="tf">
      <motion.div
        className={`tf-card glass ${resultClass}`}
        style={{ x, rotate }}
        drag={answered ? false : 'x'}
        dragElastic={0.9}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={onDragEnd}
      >
        <motion.span className="tf-stamp true" style={{ opacity: trueGlow }}>
          {t.true}
        </motion.span>
        <motion.span className="tf-stamp false" style={{ opacity: falseGlow }}>
          {t.false}
        </motion.span>
        <h2 lang={primary} className="q-main">
          {q[primary].q}
        </h2>
        {secondary && (
          <p lang={secondary} className="q-secondary">
            {q[secondary].q}
          </p>
        )}
        {!answered && <p className="caption tf-hint">{t.swipeHint}</p>}
      </motion.div>
      <div className="tf-buttons">
        <Pressable silent className={`tf-btn glass horse-red ${answered?.choice === false ? 'is-picked' : ''}`} disabled={!!answered} onClick={() => commit(false)}>
          <X size={22} strokeWidth={STROKE} /> {t.false}
        </Pressable>
        <Pressable silent className={`tf-btn glass horse-pale ${answered?.choice === true ? 'is-picked' : ''}`} disabled={!!answered} onClick={() => commit(true)}>
          <Check size={22} strokeWidth={STROKE} /> {t.true}
        </Pressable>
      </div>
    </div>
  );
}

function Feedback({ q, answered, primary, last, onNext, lives }: { q: Question; answered: NonNullable<Answered>; primary: Lang; last: boolean; onNext: () => void; lives?: number }) {
  const t = useT();
  const explain = q[primary].explain;
  const correctLabel = q.type === 'tf' ? (q.answer ? t.true : t.false) : q[primary].options![q.answer as number];
  const heading = answered.choice === null ? t.timeUp : answered.correct ? t.correct : t.wrong;
  const out = last || lives === 0;
  const verse = verseForQuestion(q);
  return (
    <motion.div
      className={`feedback glass ${answered.correct ? 'is-correct' : 'is-wrong'}`}
      initial={{ y: 30, opacity: 0, scale: 0.97 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 30, opacity: 0 }}
      transition={spring.sheet}
      role="status"
    >
      <div className="feedback-head">
        <strong>{heading}</strong>
        <span className="caption">{formatRef(primary, q.book, q.chapter, q.verse, q.verseEnd)}</span>
      </div>
      {!answered.correct && (
        <p className="feedback-answer" lang={primary}>
          {t.answerWas}: <strong>{correctLabel}</strong>
        </p>
      )}
      {explain && (
        <p className="feedback-explain" lang={primary}>
          {explain}
        </p>
      )}
      {verse && <VerseText verse={verse} size="sm" />}
      <Pressable className="btn btn-primary" onClick={onNext} autoFocus>
        {out ? t.finish : t.next}
      </Pressable>
    </motion.div>
  );
}
