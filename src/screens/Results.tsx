import { motion } from 'motion/react';
import { Check, Home as HomeIcon, RotateCcw, Share2, X } from 'lucide-react';
import { MODES } from '../engine/modes';
import { formatRef } from '../i18n/books';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { IconTile, MODE_ICON, STROKE } from '../components/icons';
import type { RoundResult } from './Game';

export function Results({ result, xp, onAgain, onHome }: { result: RoundResult; xp: number; onAgain: () => void; onHome: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const lang = qLang === 'both' ? uiLang : qLang;
  const mode = MODES[result.mode];
  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0;

  async function share() {
    const grid = result.log.map((l) => (l.correct ? '🟩' : '🟥')).join('');
    const text = `${t.appName} — ${t.modeName[result.mode]}\n${grid}\n${result.correct}/${result.total} · ${result.score}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="screen results" lang={uiLang}>
      <motion.div
        className="result-hero glass glass-thick liquid"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.flick}
      >
        <IconTile horse={mode.horse} icon={MODE_ICON[result.mode]} size={56} />
        <p className="eyebrow">{t.resultsTitle}</p>
        <h1 className="display">{result.score}</h1>
        <p className="caption">{t.modeName[result.mode]}</p>
        <div className="result-stats">
          <div>
            <strong>{pct}%</strong>
            <span className="caption">{t.accuracy}</span>
          </div>
          <div>
            <strong>+{xp}</strong>
            <span className="caption">{t.xpGained}</span>
          </div>
          <div>
            <strong>×{result.bestCombo}</strong>
            <span className="caption">{t.bestCombo}</span>
          </div>
        </div>
      </motion.div>

      <div className="result-actions">
        <Pressable className="btn glass" onClick={onHome}>
          <HomeIcon size={18} strokeWidth={STROKE} /> {t.home}
        </Pressable>
        <Pressable className="btn glass" onClick={share}>
          <Share2 size={18} strokeWidth={STROKE} /> {t.share}
        </Pressable>
        {result.mode !== 'daily' && (
          <Pressable className="btn btn-primary" onClick={onAgain}>
            <RotateCcw size={18} strokeWidth={STROKE} /> {t.playAgain}
          </Pressable>
        )}
      </div>

      <h2 className="eyebrow section-title">{t.review}</h2>
      <ul className="review">
        {result.log.map((l, i) => (
          <motion.li
            key={l.q.id + i}
            className="review-item glass"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.calm, delay: 0.15 + i * 0.03 }}
          >
            <IconTile horse={l.correct ? 'pale' : 'red'} icon={l.correct ? Check : X} size={30} />
            <div className="grow">
              <p lang={lang}>{l.q[lang].q.replace('____', '___')}</p>
              <span className="caption" lang={lang}>
                {formatRef(lang, l.q.book, l.q.chapter, l.q.verse, l.q.verseEnd)}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
