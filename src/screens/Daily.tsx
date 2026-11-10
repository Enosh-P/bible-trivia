import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { db } from '../storage/db';
import { dayKey } from '../engine/picker';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { IconTile } from '../components/icons';
import { DailyCard } from './Home';
import { VerseOfTheDay } from '../components/VerseCard';

/** Daily tab: today's challenge plus the last 7 days as a streak strip. */
export function Daily({ onPlay }: { onPlay: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const streak = useApp((s) => s.streak);
  const [played, setPlayed] = useState<Set<string>>(new Set());

  useEffect(() => {
    db.rounds
      .where('mode')
      .equals('daily')
      .toArray()
      .then((rows) => setPlayed(new Set(rows.map((r) => r.day))))
      .catch(() => {});
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return (
    <div className="screen" lang={uiLang}>
      <h1 className="display">{t.dailyTitle}</h1>
      <DailyCard onPlay={onPlay} big />
      <VerseOfTheDay />
      <div className="glass week">
        <div className="week-head">
          <IconTile horse="red" icon={Flame} size={30} />
          <strong>
            {streak} {t.streak}
          </strong>
        </div>
        <div className="week-days">
          {days.map((d, i) => {
            const key = dayKey(d);
            const on = played.has(key);
            return (
              <div key={key} className="week-day">
                <motion.span
                  className={`week-dot ${on ? 'is-on' : ''} ${key === dayKey() ? 'is-today' : ''}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring.flick, delay: i * 0.04 }}
                />
                <span className="caption">{d.toLocaleDateString(uiLang === 'ta' ? 'ta-IN' : undefined, { weekday: 'narrow' })}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
