import { motion } from 'motion/react';
import { useApp, useT, type QuestionSeconds } from '../store';
import { spring } from '../motion/springs';

export const TIME_CHOICES = [30, 45, 60] as const;

/** Seconds per question for timed games (not Speed): the player's choice, else 45. */
export function useQuestionSeconds(): QuestionSeconds {
  return useApp((s) => s.questionSeconds ?? 45);
}

/** "Time per question: 30 s · 45 s · 60 s", shown before a timed game starts. */
export function TimePicker({ id = 'q-time' }: { id?: string }) {
  const t = useT();
  const seconds = useQuestionSeconds();
  const setApp = useApp((s) => s.set);
  return (
    <div className="quiz-time">
      <span className="caption">{t.timePerQuestion}</span>
      <div className="lang-switch" role="radiogroup" aria-label={t.timePerQuestion}>
        {TIME_CHOICES.map((s) => (
          <button key={s} role="radio" aria-checked={seconds === s} className={seconds === s ? 'is-on' : ''} onClick={() => setApp({ questionSeconds: s })}>
            {seconds === s && <motion.span layoutId={`${id}-thumb`} className="lang-thumb" transition={spring.calm} />}
            <span className="lang-label">{s} s</span>
          </button>
        ))}
      </div>
    </div>
  );
}
