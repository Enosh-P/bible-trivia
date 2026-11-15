import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Clock, Flame, Heart, LayoutGrid, List, ListOrdered, Play, Trophy, X } from 'lucide-react';
import { MODES, type ModeId } from '../engine/modes';
import { HEART_EVERY, MAX_HEARTS, levelFromXp, liveStreak } from '../engine/scoring';
import { dayKey } from '../engine/picker';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { VerseOfTheDay } from '../components/VerseCard';
import { LangToggle } from '../components/LangToggle';
import { IconTile, MODE_ICON, STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { MemoryArt, ModeArt } from '../art/ModeArt';
import { usePosts } from '../online/posts';
import { InstallBanner } from '../components/Install';
import { clearSnapshot, loadSnapshots, type GameSnapshot } from '../engine/resume';
import { BOOK_BY_CODE } from '../i18n/books';
import { ThoughtCard } from '../components/ThoughtCard';
import type { Post } from '../engine/posts';

/** The games in three plain groups, so a new player knows where to start. */
const GROUPS: { id: 'quick' | 'learn' | 'challenge'; modes: ModeId[] }[] = [
  { id: 'quick', modes: ['knowledge', 'classic', 'truefalse', 'who', 'book', 'blank'] },
  { id: 'learn', modes: ['quiz', 'drill', 'recall', 'study'] },
  { id: 'challenge', modes: ['speed', 'survival'] },
];
const NO_POSTS: string[] = [];

export function Home({ onPlay, onMemory, onResume, onShowSaved, onOpenPost, onShowPosts }: { onPlay: (m: ModeId) => void; onMemory: () => void; onResume: (s: GameSnapshot) => void; onShowSaved: () => void; onOpenPost: (p: Post) => void; onShowPosts: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const xp = useApp((s) => s.xp);
  const streak = useApp((s) => liveStreak(s, dayKey()));
  const hearts = useApp((s) => s.hearts ?? 0);
  const healed = useApp((s) => (s.healedNote?.day === dayKey() ? s.healedNote.count : 0));
  const [heartsOpen, setHeartsOpen] = useState(false);
  // List (long rows with a description) or grid (square tiles); remembered on this phone.
  const view = useApp((st) => st.homeView ?? 'list');
  const setApp = useApp((st) => st.set);
  const [levelOpen, setLevelOpen] = useState(false);
  const { level, into, need } = levelFromXp(xp);
  const [intro, setIntro] = useState<ModeId | null>(null);
  const dailyDone = useApp((s) => s.dailyDoneOn === dayKey());
  // An unread Daily Thought sits beside the verse: swipe between the two.
  const latestPost = usePosts((s) => s.posts[0]);
  const readPosts = useApp((s) => s.readPosts ?? NO_POSTS);
  const hasThought = Boolean(latestPost && !readPosts.includes(latestPost.id));
  const groupText = {
    quick: [t.groupQuick, t.groupQuickSub],
    learn: [t.groupLearn, t.groupLearnSub],
    challenge: [t.groupChallenge, t.groupChallengeSub],
  } as const;

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
            <button className="badge" onClick={() => setHeartsOpen(true)} aria-label={`${streak} ${t.streak}, ${hearts} ${t.heartsTitle}`}>
              <Flame size={17} strokeWidth={2} className={`badge-flame ${streak ? '' : 'is-off'}`} fill="currentColor" /> {streak}
              <span className="badge-sep" aria-hidden />
              <Heart size={16} strokeWidth={2} className={`badge-heart ${hearts ? '' : 'is-off'}`} fill="currentColor" /> {hearts}
            </button>
            <button className="badge" onClick={() => setLevelOpen(true)} aria-label={`${t.level} ${level}, ${xp} XP`}>
              <Trophy size={17} strokeWidth={2} className="badge-trophy" fill="currentColor" /> {level}
              <span className="badge-bar" aria-hidden>
                <span style={{ width: `${(into / need) * 100}%` }} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <ResumeCard onResume={onResume} onShowAll={onShowSaved} />

      <InstallBanner />

      {healed > 0 && (
        <motion.div className="glass heal-note" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring.calm} role="status">
          <Heart size={18} strokeWidth={STROKE} className="badge-heart" fill="currentColor" />
          <span className="grow">{t.heartSaved(healed)}</span>
          <button className="icon-btn" aria-label={t.close} onClick={() => useApp.setState({ healedNote: undefined })}>
            <X size={16} strokeWidth={STROKE} />
          </button>
        </motion.div>
      )}

      {!dailyDone && <DailyCard onPlay={() => onPlay('daily')} />}

      {hasThought ? (
        <div className="home-swipe">
          <VerseOfTheDay />
          <ThoughtCard onOpen={onOpenPost} onShowAll={onShowPosts} />
        </div>
      ) : (
        <>
          <VerseOfTheDay />
          <ThoughtCard onOpen={onOpenPost} onShowAll={onShowPosts} />
        </>
      )}

      {GROUPS.map((g, gi) => (
        <section key={g.id} className="mode-group">
          <div className="group-head">
            <div className="group-title-row">
              <h2 className="group-title">{groupText[g.id][0]}</h2>
              {gi === 0 && (
                <div className="view-toggle glass" role="radiogroup" aria-label={t.gamesView}>
                  {(['list', 'grid'] as const).map((v) => (
                    <button key={v} role="radio" aria-checked={view === v} aria-label={v === 'list' ? t.viewList : t.viewGrid} title={v === 'list' ? t.viewList : t.viewGrid} className={view === v ? 'is-on' : ''} onClick={() => setApp({ homeView: v })}>
                      {v === 'list' ? <List size={17} strokeWidth={STROKE} /> : <LayoutGrid size={17} strokeWidth={STROKE} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="caption">{groupText[g.id][1]}</p>
          </div>
          <div className={`mode-list is-${view}`}>
            {/* Memory verses leads the Learn group. */}
            {g.id === 'learn' && (
              <Pressable className="mode-row glass horse-pale" onClick={onMemory}>
                <MemoryArt className="mode-row-art" />
                <span className="menu-text">
                  <strong>{t.memoryTitle}</strong>
                  <span className="caption">{t.memoryDesc}</span>
                </span>
                <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />
              </Pressable>
            )}
            {g.modes.map((id, i) => (
              <motion.div key={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.calm, delay: 0.03 * (gi * 3 + i) }}>
                <Pressable className={`mode-row glass horse-${MODES[id].horse}`} onClick={() => setIntro(id)}>
                  <ModeArt mode={id} className="mode-row-art" />
                  <span className="menu-text">
                    <strong>{t.modeName[id]}</strong>
                    <span className="caption">{t.modeDesc[id]}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />
                </Pressable>
              </motion.div>
            ))}
          </div>
        </section>
      ))}

      <Sheet open={levelOpen} onClose={() => setLevelOpen(false)} label={t.level}>
        <div className="mode-intro level-sheet" lang={uiLang}>
          <div className="level-big">
            <IconTile horse="pale" icon={Trophy} size={44} />
            <div>
              <span className="eyebrow">{t.level}</span>
              <strong>{level}</strong>
            </div>
          </div>
          <p className="level-xp">
            <strong>{xp.toLocaleString()}</strong> XP
          </p>
          <div className="bar">
            <motion.div className="bar-fill horse-pale" initial={{ width: 0 }} animate={{ width: `${(into / need) * 100}%` }} transition={spring.calm} />
          </div>
          <p className="caption">{t.xpToNext(need - into, level + 1)}</p>
          <p className="caption">{t.xpHow}</p>
        </div>
      </Sheet>

      <Sheet open={heartsOpen} onClose={() => setHeartsOpen(false)} label={t.heartsTitle}>
        <div className="mode-intro" lang={uiLang}>
          <div className="hearts-row" aria-label={`${hearts} / ${MAX_HEARTS}`}>
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <motion.span key={i} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ ...spring.flick, delay: 0.05 * i }}>
                <Heart size={40} strokeWidth={1.8} className="badge-heart" fill={i < hearts ? 'currentColor' : 'none'} opacity={i < hearts ? 1 : 0.35} />
              </motion.span>
            ))}
          </div>
          <div className="mode-intro-title">
            <IconTile horse="red" icon={Flame} size={30} />
            <h2 className="title">
              {streak} {t.streak}
            </h2>
          </div>
          <h3 className="eyebrow">{t.heartsTitle}</h3>
          <ol className="mode-how">
            {t.heartsHow.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
          <p className="caption">{hearts >= MAX_HEARTS ? t.heartsFull : t.heartsNext(HEART_EVERY - (streak % HEART_EVERY))}</p>
        </div>
      </Sheet>

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
  const quizSeconds = useApp((s) => s.quizSeconds ?? 20);
  const facts: { icon: typeof Clock; text: string }[] = [];
  if (m && mode !== 'recall') {
    if (Number.isFinite(m.length)) facts.push({ icon: ListOrdered, text: t.questionsN(m.length) });
    else if (!m.lives) facts.push({ icon: ListOrdered, text: t.untilOut });
    if (m.roundSeconds) facts.push({ icon: Clock, text: t.roundSeconds(m.roundSeconds) });
    else if (m.perQuestion) facts.push({ icon: Clock, text: t.secondsEach(mode === 'quiz' ? quizSeconds : m.perQuestion) });
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

/** Home shows only the newest unfinished game; "Show all" opens the full list. */
function ResumeCard({ onResume, onShowAll }: { onResume: (s: GameSnapshot) => void; onShowAll: () => void }) {
  const t = useT();
  const [games, setGames] = useState(() => loadSnapshots());
  if (!games.length) return null;
  return (
    <div className="resume-wrap">
      <SavedGameRow game={games[0]} onResume={onResume} onDiscard={() => setGames(loadSnapshots())} />
      {games.length > 1 && (
        <button className="link resume-all" onClick={onShowAll}>
          {t.showAllGames(games.length)}
        </button>
      )}
    </div>
  );
}

/** One unfinished game: "Continue Classic · 4/10 · 30 points" with Resume and discard. */
export function SavedGameRow({ game, onResume, onDiscard }: { game: GameSnapshot; onResume: (s: GameSnapshot) => void; onDiscard: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const def = MODES[game.mode];
  const total = Number.isFinite(def.length) ? Math.min(def.length, game.ids.length) : null;
  const where = game.scope ? ` · ${BOOK_BY_CODE[game.scope.book]?.[uiLang] ?? game.scope.book}${game.scope.chapter ? ` ${game.scope.chapter}` : ''}` : '';
  return (
    <motion.div className="resume-card glass" layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring.calm}>
      <ModeArt mode={game.mode} className="resume-art" />
      <div className="grow">
        <span className="eyebrow">{t.continueGame}</span>
        <strong>
          {t.modeName[game.mode]}
          {where}
        </strong>
        <span className="caption">
          {total ? `${game.index + 1}/${total}` : `#${game.index + 1}`} · {game.score} {t.points}
        </span>
      </div>
      <Pressable className="btn btn-primary small" onClick={() => onResume(game)}>
        <Play size={16} strokeWidth={STROKE} /> {t.resume}
      </Pressable>
      <button
        className="icon-btn"
        aria-label={t.discardGame}
        title={t.discardGame}
        onClick={() => {
          clearSnapshot(game.id);
          onDiscard();
        }}
      >
        <X size={16} strokeWidth={STROKE} />
      </button>
    </motion.div>
  );
}
