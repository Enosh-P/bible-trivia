import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Clock, Flame, Heart, ListOrdered, Play, Trophy } from 'lucide-react';
import { MODES, MODE_ORDER, type ModeId } from '../engine/modes';
import { levelFromXp } from '../engine/scoring';
import { dayKey } from '../engine/picker';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { VerseOfTheDay } from '../components/VerseCard';
import { LangToggle } from '../components/LangToggle';
import { IconTile, MODE_ICON, STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { ModeArt } from '../art/ModeArt';

export function Home({ onPlay }: { onPlay: (m: ModeId) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const xp = useApp((s) => s.xp);
  const streak = useApp((s) => s.streak);
  const { level, into, need } = levelFromXp(xp);
  const [intro, setIntro] = useState<ModeId | null>(null);
  const dailyDone = useApp((s) => s.dailyDoneOn === dayKey());

  return (
    <div className="screen" lang={uiLang}>
      <header className="home-head">
        <div className="home-head-row">
          <p className="caption">{t.greeting}</p>
          <LangToggle />
        </div>
        <div className="home-title-row">
          <h1 className="display">{t.appName}</h1>
          <div className="home-badges">
            <span className="badge" title={t.streak} aria-label={`${streak} ${t.streak}`}>
              <Flame size={15} strokeWidth={STROKE} className="badge-flame" /> {streak}
            </span>
            <span className="badge" title={t.level} aria-label={`${t.level} ${level}`}>
              <Trophy size={15} strokeWidth={STROKE} className="badge-trophy" /> {level}
              <span className="badge-bar" aria-hidden>
                <span style={{ width: `${(into / need) * 100}%` }} />
              </span>
            </span>
          </div>
        </div>
      </header>

      {!dailyDone && (
        <div className="home-top">
          <DailyCard onPlay={() => onPlay('daily')} />
          <VerseOfTheDay />
        </div>
      )}
      {dailyDone && <VerseOfTheDay />}

      <h2 className="eyebrow section-title">{t.modes}</h2>
      <div className="mode-grid">
        {MODE_ORDER.map((id, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.calm, delay: 0.03 * i }}
          >
            <Pressable className={`mode-card glass horse-${MODES[id].horse}`} onClick={() => setIntro(id)}>
              <ModeArt mode={id} className="mode-art" />
              <span className="mode-name">{t.modeName[id]}</span>
            </Pressable>
          </motion.div>
        ))}
      </div>

      <ModeIntro
        mode={intro}
        onClose={() => setIntro(null)}
        onStart={(m) => {
          setIntro(null);
          onPlay(m);
        }}
      />
    </div>
  );
}

/** Tapping a game tile: what the game is, how to play, and a Start button. */
function ModeIntro({ mode, onClose, onStart }: { mode: ModeId | null; onClose: () => void; onStart: (m: ModeId) => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const m = mode ? MODES[mode] : null;
  const facts: { icon: typeof Clock; text: string }[] = [];
  if (m && mode !== 'recall') {
    if (Number.isFinite(m.length)) facts.push({ icon: ListOrdered, text: t.questionsN(m.length) });
    else if (!m.lives) facts.push({ icon: ListOrdered, text: t.untilOut });
    if (m.roundSeconds) facts.push({ icon: Clock, text: t.roundSeconds(m.roundSeconds) });
    else if (m.perQuestion) facts.push({ icon: Clock, text: t.secondsEach(m.perQuestion) });
    else facts.push({ icon: Clock, text: t.noTimer });
    if (m.lives) facts.push({ icon: Heart, text: t.livesN(m.lives) });
  }
  return (
    <Sheet open={mode !== null} onClose={onClose} label={mode ? t.modeName[mode] : ''}>
      {mode && m && (
        <div className="mode-intro" lang={uiLang}>
          <ModeArt mode={mode} className="mode-intro-art" />
          <div className="mode-intro-title">
            <IconTile horse={m.horse} icon={MODE_ICON[mode]} size={30} />
            <h2 className="title">{t.modeName[mode]}</h2>
          </div>
          {facts.length > 0 && (
            <div className="mode-facts">
              {facts.map((f) => (
                <span key={f.text} className="chip-fact">
                  <f.icon size={14} strokeWidth={STROKE} /> {f.text}
                </span>
              ))}
            </div>
          )}
          <h3 className="eyebrow">{t.howToPlay}</h3>
          <ol className="mode-how">
            {t.modeHow[mode].map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <Pressable className="btn btn-primary" onClick={() => onStart(mode)}>
            <Play size={18} strokeWidth={STROKE} /> {t.startGame}
          </Pressable>
        </div>
      )}
    </Sheet>
  );
}

export function DailyCard({ onPlay, big }: { onPlay: () => void; big?: boolean }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const done = useApp((s) => s.dailyDoneOn === dayKey());
  const dailyScore = useApp((s) => s.dailyScore);
  return (
    <Pressable className={`daily-card glass ${big ? 'is-big' : ''}`} onClick={onPlay} disabled={done}>
      <IconTile horse="white" icon={MODE_ICON.daily} size={big ? 48 : 38} />
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
