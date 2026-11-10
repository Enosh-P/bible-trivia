import { motion } from 'motion/react';
import { ChevronRight, Flame, Trophy } from 'lucide-react';
import { MODES, MODE_ORDER, type ModeId } from '../engine/modes';
import { levelFromXp } from '../engine/scoring';
import { dayKey } from '../engine/picker';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { VerseOfTheDay } from '../components/VerseCard';
import { HorseHead, IconTile, MODE_ICON, STROKE } from '../components/icons';

export function Home({ onPlay }: { onPlay: (m: ModeId) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const xp = useApp((s) => s.xp);
  const streak = useApp((s) => s.streak);
  const { level, into, need } = levelFromXp(xp);

  return (
    <div className="screen" lang={uiLang}>
      <header className="home-head">
        <div>
          <p className="caption">{t.greeting}</p>
          <h1 className="display">{t.appName}</h1>
        </div>
        <IconTile horse="black" icon={HorseHead} size={48} />
      </header>

      <div className="stat-row">
        <div className="stat glass">
          <IconTile horse="red" icon={Flame} size={34} />
          <div>
            <strong>{streak}</strong>
            <span className="caption">{t.streak}</span>
          </div>
        </div>
        <div className="stat glass">
          <IconTile horse="pale" icon={Trophy} size={34} />
          <div className="grow">
            <strong>
              {t.level} {level}
            </strong>
            <div className="bar small">
              <motion.div className="bar-fill horse-pale" initial={{ width: 0 }} animate={{ width: `${(into / need) * 100}%` }} transition={spring.calm} />
            </div>
          </div>
        </div>
      </div>

      <DailyCard onPlay={() => onPlay('daily')} />

      <VerseOfTheDay />

      <h2 className="eyebrow section-title">{t.modes}</h2>
      <div className="mode-grid">
        {MODE_ORDER.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.calm, delay: 0.03 * i }}
          >
            <Pressable className={`mode-card glass horse-${MODES[id].horse}`} onClick={() => onPlay(id)}>
              <IconTile horse={MODES[id].horse} icon={MODE_ICON[id]} size={42} />
              <span className="mode-name">{t.modeName[id]}</span>
              <span className="caption">{t.modeSub[id]}</span>
            </Pressable>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function DailyCard({ onPlay, big }: { onPlay: () => void; big?: boolean }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const done = useApp((s) => s.dailyDoneOn === dayKey());
  const dailyScore = useApp((s) => s.dailyScore);
  return (
    <Pressable className={`daily-card glass ${big ? 'is-big' : ''}`} onClick={onPlay} disabled={done}>
      <IconTile horse="white" icon={MODE_ICON.daily} size={big ? 56 : 46} />
      <div className="grow">
        <span className="eyebrow">{new Date().toLocaleDateString(uiLang === 'ta' ? 'ta-IN' : undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        <h2 className="title">{t.dailyTitle}</h2>
        <span className="caption">{done ? `${t.dailyDone} · ${dailyScore ?? 0}` : t.dailySub}</span>
        {!done && (
          <span className="daily-go">
            {t.dailyPlay}
            <ChevronRight size={18} strokeWidth={STROKE} />
          </span>
        )}
      </div>
    </Pressable>
  );
}
