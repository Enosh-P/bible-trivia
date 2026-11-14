import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BOOKS } from '../i18n/books';
import { correctByBook } from '../storage/db';
import { levelFromXp } from '../engine/scoring';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { StatArt } from '../art/StatArt';
import { WeekStrip } from './Daily';

/** Correct answers needed to fully light up a book. */
const MASTERY = 5;

/** Your stats, week strip and book map. Shown under Practice (`embedded`). */
export function Progress({ embedded = false }: { embedded?: boolean }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const { xp, totalAnswered, totalCorrect } = useApp();
  const [byBook, setByBook] = useState<Record<string, number>>({});

  useEffect(() => {
    correctByBook().then(setByBook).catch(() => {});
  }, []);

  const touched = Object.keys(byBook).length;
  const acc = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const { level } = levelFromXp(xp);

  return (
    <div className={embedded ? 'progress-embedded' : 'screen'} lang={uiLang}>
      {embedded ? <h2 className="eyebrow section-title">{t.progressTitle}</h2> : <h1 className="display">{t.progressTitle}</h1>}
      <WeekStrip compact={embedded} />
      <div className="stat-grid">
        <div className="stat glass col">
          <StatArt kind="answered" />
          <strong>{totalAnswered}</strong>
          <span className="caption">{t.answered}</span>
        </div>
        <div className="stat glass col">
          <StatArt kind="accuracy" />
          <strong>{acc}%</strong>
          <span className="caption">{t.accuracy}</span>
        </div>
        <div className="stat glass col">
          <StatArt kind="books" />
          <strong>
            {touched}/66
          </strong>
          <span className="caption">{t.booksMastered}</span>
        </div>
      </div>

      <section className="glass mastery">
        <div className="mastery-head">
          <h2 className="title">{t.masteryMap}</h2>
          <span className="caption">
            {t.level} {level}
          </span>
        </div>
        <p className="caption">{t.masteryHint}</p>
        {(['OT', 'NT'] as const).map((tm) => (
          <div key={tm}>
            <h3 className="eyebrow section-title">{tm === 'OT' ? t.ot : t.nt}</h3>
            <div className="book-grid">
              {BOOKS.filter((b) => b.testament === tm).map((b, i) => {
                const level = Math.min(1, (byBook[b.code] ?? 0) / MASTERY);
                return (
                  <motion.div
                    key={b.code}
                    className="book-cell"
                    title={b[uiLang]}
                    style={{ ['--m' as string]: level }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring.calm, delay: i * 0.008 }}
                  >
                    <span>{b.code}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
