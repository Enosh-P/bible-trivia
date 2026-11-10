import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle2, Target } from 'lucide-react';
import { BOOKS } from '../i18n/books';
import { correctByBook } from '../storage/db';
import { levelFromXp } from '../engine/scoring';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { IconTile } from '../components/icons';

/** Correct answers needed to fully light up a book. */
const MASTERY = 5;

export function Progress() {
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
    <div className="screen" lang={uiLang}>
      <h1 className="display">{t.progressTitle}</h1>
      <div className="stat-grid">
        <div className="stat glass col">
          <IconTile horse="white" icon={CheckCircle2} size={34} />
          <strong>{totalAnswered}</strong>
          <span className="caption">{t.answered}</span>
        </div>
        <div className="stat glass col">
          <IconTile horse="pale" icon={Target} size={34} />
          <strong>{acc}%</strong>
          <span className="caption">{t.accuracy}</span>
        </div>
        <div className="stat glass col">
          <IconTile horse="black" icon={BookOpen} size={34} />
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
