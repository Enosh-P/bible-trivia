import { useId } from 'react';
import { motion } from 'motion/react';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import type { QuestionLang } from '../store';

/** English / Tamil / both with a gliding thumb, one tap away (sets the question and app language together). */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const qLang = useApp((s) => s.qLang);
  const set = useApp((s) => s.set);
  const id = useId(); // several switches can be on screen at once (Home and the sidebar)
  const options: { v: QuestionLang; label: string; lang?: string }[] = [
    { v: 'en', label: compact ? 'EN' : 'English', lang: 'en' },
    { v: 'ta', label: compact ? 'த' : 'தமிழ்', lang: 'ta' },
    // The same short label in both languages, so the switch never outgrows the screen.
    { v: 'both', label: t.langBothShort },
  ];
  return (
    <div className={`lang-switch ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label={t.language}>
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={qLang === o.v} className={qLang === o.v ? 'is-on' : ''} onClick={() => set({ qLang: o.v })} lang={o.lang}>
          {qLang === o.v && <motion.span layoutId={`lang-thumb-${id}`} className="lang-thumb" transition={spring.calm} />}
          <span className="lang-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
