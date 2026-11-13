import { motion } from 'motion/react';
import { BarChart3, BookHeart, Gamepad2, Settings2, Users, type LucideIcon } from 'lucide-react';
import { myTurn, useAccount } from '../online/account';
import { spring } from '../motion/springs';
import { useT } from '../store';
import type { Horse } from '../engine/modes';
import { STROKE } from './icons';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';

export type Tab = 'play' | 'friends' | 'gospel' | 'progress' | 'settings';

const TABS: { id: Tab; icon: LucideIcon; horse: Horse }[] = [
  { id: 'play', icon: Gamepad2, horse: 'white' },
  { id: 'friends', icon: Users, horse: 'red' },
  { id: 'gospel', icon: BookHeart, horse: 'pale' },
  { id: 'progress', icon: BarChart3, horse: 'white' },
  { id: 'settings', icon: Settings2, horse: 'black' },
];

/** Floating glass tab bar. The active pill glides between tabs on a spring. */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const t = useT();
  // A dot on Friends when a request or a challenge is waiting for you.
  const needsYou = useAccount((s) => s.friends.some((f) => f.status === 'pending' && f.incoming) || s.challenges.some(myTurn));
  const label: Record<Tab, string> = {
    play: t.tabPlay,
    friends: t.tabFriends,
    gospel: t.tabGospel,
    progress: t.tabProgress,
    settings: t.tabSettings,
  };
  return (
    <nav className="tabbar glass glass-thick" aria-label="Main">
      {/* Shown only in the desktop sidebar */}
      <div className="tabbar-brand">
        <img src="/favicon.svg" alt="" width={34} height={34} className="brand-icon" />
        <span>{t.appName}</span>
      </div>
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
            {id === 'friends' && needsYou && <span className="tab-dot" aria-hidden />}
            <span className="tab-label">{label[id]}</span>
          </button>
        );
      })}
      <div className="sidebar-switches">
        <LangToggle compact />
        <ThemeToggle id="sidebar" />
      </div>
    </nav>
  );
}
