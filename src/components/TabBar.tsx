import { motion } from 'motion/react';
import { BarChart3, BookHeart, Gamepad2, Settings2, Sun, type LucideIcon } from 'lucide-react';
import { spring } from '../motion/springs';
import { useT } from '../store';
import type { Horse } from '../engine/modes';
import { STROKE } from './icons';

export type Tab = 'play' | 'daily' | 'gospel' | 'progress' | 'settings';

const TABS: { id: Tab; icon: LucideIcon; horse: Horse }[] = [
  { id: 'play', icon: Gamepad2, horse: 'white' },
  { id: 'daily', icon: Sun, horse: 'red' },
  { id: 'gospel', icon: BookHeart, horse: 'pale' },
  { id: 'progress', icon: BarChart3, horse: 'white' },
  { id: 'settings', icon: Settings2, horse: 'black' },
];

/** Floating glass tab bar. The active pill glides between tabs on a spring. */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useT();
  const label: Record<Tab, string> = {
    play: t.tabPlay,
    daily: t.tabDaily,
    gospel: t.tabGospel,
    progress: t.tabProgress,
    settings: t.tabSettings,
  };
  return (
    <nav className="tabbar glass glass-thick liquid" aria-label="Main">
      {TABS.map(({ id, icon: Icon, horse }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            className={`tab horse-${horse} ${active ? 'is-active' : ''}`}
            onPointerDown={() => onChange(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(id)}
            aria-current={active ? 'page' : undefined}
          >
            {active && <motion.span layoutId="tab-pill" className="tab-pill" transition={spring.calm} />}
            <Icon size={22} strokeWidth={STROKE} className="tab-icon" />
            <span className="tab-label">{label[id]}</span>
          </button>
        );
      })}
    </nav>
  );
}
