import { motion } from 'motion/react';
import { ScrollText, Share2 } from 'lucide-react';
import { verseOfTheDay, type Verse } from '../engine/verses';
import { formatRef } from '../i18n/books';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { IconTile, STROKE } from './icons';
import { Pressable } from './Pressable';
import type { Lang } from '../engine/types';

/** Verse text in the player's question language (both, when they chose both). */
export function VerseText({ verse, size = 'md' }: { verse: Verse; size?: 'md' | 'sm' }) {
  const qLang = useApp((s) => s.qLang);
  const uiLang = useApp((s) => s.uiLang);
  const primary: Lang = qLang === 'both' ? uiLang : qLang;
  const secondary: Lang | null = qLang === 'both' ? (primary === 'en' ? 'ta' : 'en') : null;
  return (
    <blockquote className={`verse-quote is-${size}`}>
      <p className="verse" lang={primary}>
        {verse[primary]}
      </p>
      {secondary && (
        <p className="verse verse-secondary" lang={secondary}>
          {verse[secondary]}
        </p>
      )}
      <cite className="caption" lang={primary}>
        {formatRef(primary, verse.book, verse.chapter, verse.verse)}
        {primary === 'ta' ? ' · BSI O.V.' : ' · KJV'}
      </cite>
    </blockquote>
  );
}

export function VerseOfTheDay() {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const verse = verseOfTheDay();

  async function share() {
    const text = `${verse[uiLang]}\n— ${formatRef(uiLang, verse.book, verse.chapter, verse.verse)}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* cancelled */
    }
  }

  return (
    <motion.section className="verse-card glass" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm}>
      <div className="verse-card-head">
        <IconTile horse="pale" icon={ScrollText} size={34} />
        <span className="eyebrow">{t.verseOfDay}</span>
        <Pressable className="chip verse-share" onClick={share} aria-label={t.share}>
          <Share2 size={16} strokeWidth={STROKE} />
        </Pressable>
      </div>
      <VerseText verse={verse} />
    </motion.section>
  );
}
