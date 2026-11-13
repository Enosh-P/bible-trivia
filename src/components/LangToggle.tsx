import { useApp, useT } from '../store';
import type { QuestionLang } from '../store';

/** English / Tamil / both, one tap away (sets the question and app language together). */
export function LangToggle({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const qLang = useApp((s) => s.qLang);
  const set = useApp((s) => s.set);
  const options: { v: QuestionLang; label: string; lang?: string }[] = [
    { v: 'en', label: compact ? 'EN' : 'English' },
    { v: 'ta', label: compact ? 'த' : 'தமிழ்', lang: 'ta' },
    { v: 'both', label: compact ? 'EN+த' : t.both },
  ];
  return (
    <div className={`lang-switch ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label={t.language}>
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={qLang === o.v} className={qLang === o.v ? 'is-on' : ''} onClick={() => set({ qLang: o.v })} lang={o.lang}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
