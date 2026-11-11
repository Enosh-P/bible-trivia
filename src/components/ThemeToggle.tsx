import { motion } from 'motion/react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useApp, useT, type ThemePref } from '../store';
import { spring } from '../motion/springs';
import { STROKE } from './icons';

const OPTIONS: { v: ThemePref; icon: LucideIcon }[] = [
  { v: 'light', icon: Sun },
  { v: 'dark', icon: Moon },
  { v: 'system', icon: Monitor },
];

/** Light / Dark / System switch with a gliding thumb. */
export function ThemeToggle({ id = 'theme', className = '' }: { id?: string; className?: string }) {
  const t = useT();
  const theme = useApp((s) => s.theme);
  const set = useApp((s) => s.set);
  const label: Record<ThemePref, string> = { light: t.themeLight, dark: t.themeDark, system: t.themeSystem };
  return (
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label={t.theme}>
      {OPTIONS.map(({ v, icon: Icon }) => (
        <button key={v} role="radio" aria-checked={theme === v} aria-label={label[v]} title={label[v]} className={theme === v ? 'is-on' : ''} onClick={() => set({ theme: v })}>
          {theme === v && <motion.span layoutId={`theme-thumb-${id}`} className="theme-thumb" transition={spring.calm} />}
          <Icon size={16} strokeWidth={STROKE} />
        </button>
      ))}
    </div>
  );
}
