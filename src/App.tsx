import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Atmosphere } from './components/Atmosphere';
import { ArtSticker } from './components/ArtSticker';
import { ART_KEYS } from './art/Illustrations';
import { TabBar, type Tab } from './components/TabBar';
import { Pressable } from './components/Pressable';
import { Home } from './screens/Home';
import { Friends } from './screens/Friends';
import { Progress } from './screens/Progress';
import { Gospel } from './screens/Gospel';
import { Recall } from './screens/Recall';
import { NewPasswordSheet } from './components/NewPasswordSheet';
import { syncPushLanguage } from './online/push';
import { Settings } from './screens/Settings';
import { Game, type RoundResult } from './screens/Game';
import { Results } from './screens/Results';
import { Splash, Welcome } from './screens/Welcome';
import type { ModeId } from './engine/modes';
import { dayKey } from './engine/picker';
import { db } from './storage/db';
import { supabase, syncQuestions } from './online/supabase';
import { flushReports } from './online/reports';
import { createChallenge, initAccount, useAccount, pushProgress, saveDailyResult, submitChallenge, type Challenge } from './online/account';
import { MODES } from './engine/modes';
import { pickQuestions } from './engine/picker';
import { questionPool } from './engine/content';
import { useApp, useT } from './store';
import { spring } from './motion/springs';

type Route =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'recall' }
  | { kind: 'game'; mode: ModeId; run: number; challenge?: { id: string; questionIds: string[] } } | { kind: 'result'; result: RoundResult; xp: number };

/** Applies theme and text size to <html>. */
function useDocumentSettings() {
  const theme = useApp((s) => s.theme);
  const textScale = useApp((s) => s.textScale);
  const uiLang = useApp((s) => s.uiLang);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f1f3f5' : '#111417');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(textScale));
    document.documentElement.lang = uiLang;
  }, [textScale, uiLang]);
}

export default function App() {
  useDocumentSettings();
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('art')) return <ArtGallery />;
  return <Gate />;
}

/** Everything needs an account: show sign-in until there is one. */
function Gate() {
  const ready = useAccount((s) => s.ready);
  const signedIn = useAccount((s) => Boolean(s.session));
  useEffect(() => initAccount(), []);
  // Without Supabase configured (local development) the app runs without accounts.
  if (!supabase) return <MainApp />;
  return (
    <MotionConfig reducedMotion="user">
      {!ready ? <Splash /> : signedIn ? <MainApp /> : (
        <>
          <Atmosphere />
          <main className="app">
            <Welcome />
          </main>
        </>
      )}
      <NewPasswordSheet />
    </MotionConfig>
  );
}

/** Dev-only: every cartoon illustration on one page (open /?art). */
function ArtGallery() {
  return (
    <div className="screen">
      <Atmosphere />
      <h1 className="display">Art</h1>
      <div className="mode-grid">
        {ART_KEYS.map((k) => (
          <div key={k}>
            <ArtSticker name={k} />
            <p className="caption" style={{ textAlign: 'center' }}>{k}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MainApp() {
  const t = useT();
  const finishRound = useApp((s) => s.finishRound);
  const [route, setRoute] = useState<Route>({ kind: 'tab', tab: 'play' });
  const [lastTab, setLastTab] = useState<Tab>('play');

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Background content sync (no-op until Supabase is configured).
  useEffect(() => {
    void syncQuestions().catch(() => {});
    void flushReports().catch(() => {});
    const online = () => void flushReports().catch(() => {});
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  // Tapped a notification: /?open=friends | daily | home
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    if (!open) return;
    history.replaceState(null, '', location.pathname);
    if (open === 'friends') goTab('friends');
    else if (open === 'daily') setRoute({ kind: 'game', mode: 'daily', run: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uiLang = useApp((s) => s.uiLang);
  useEffect(() => {
    void syncPushLanguage(uiLang).catch(() => {});
  }, [uiLang]);

  const play = (mode: ModeId) => setRoute(mode === 'recall' ? { kind: 'recall' } : { kind: 'game', mode, run: Date.now() });

  /** Friend challenge: same questions for everyone; the starter plays first. */
  async function startChallenge(mode: ModeId, friendIds: string[]) {
    const pool = await questionPool();
    const questionIds = pickQuestions(pool, MODES[mode]).map((q) => q.id);
    try {
      const id = await createChallenge(mode, questionIds, friendIds);
      setRoute({ kind: 'game', mode, run: Date.now(), challenge: { id, questionIds } });
    } catch (e) {
      alert((e as Error).message);
    }
  }

  const playChallenge = (c: Challenge) =>
    setRoute({ kind: 'game', mode: c.mode, run: Date.now(), challenge: { id: c.id, questionIds: c.question_ids } });

  function onDone(result: RoundResult) {
    const xp = result.score + (result.mode === 'daily' ? 25 : 0);
    finishRound({ xp, correct: result.correct, total: result.total, score: result.score, daily: result.mode === 'daily' });
    void db.rounds
      .add({ mode: result.mode, day: dayKey(), score: result.score, correct: result.correct, total: result.total, xp, at: Date.now() })
      .catch(() => {});
    // Online extras (no-ops when signed out).
    void pushProgress().catch(() => {});
    if (result.mode === 'daily') void saveDailyResult(dayKey(), result.score, result.correct, result.total).catch(() => {});
    const challengeId = route.kind === 'game' ? route.challenge?.id : undefined;
    if (challengeId) void submitChallenge(challengeId, result.score, result.correct, result.total).catch(() => {});
    setRoute({ kind: 'result', result: { ...result, challengeId }, xp });
  }

  const goTab = (tab: Tab) => {
    setLastTab(tab);
    setRoute({ kind: 'tab', tab });
  };

  // Spatial consistency: the game slides in from the right and leaves the same way.
  const key = route.kind === 'tab' ? `tab-${route.tab}` : route.kind === 'game' ? `game-${route.run}` : route.kind;
  const pushed = route.kind !== 'tab';

  return (
    <MotionConfig reducedMotion="user">
      <Atmosphere />
      <main className={`app ${pushed ? 'is-pushed' : ''}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={key}
            className="route"
            initial={pushed ? { x: '100%', opacity: 1 } : { opacity: 0, scale: 0.985 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={pushed ? { x: '30%', opacity: 0 } : { opacity: 0, scale: 0.985 }}
            transition={spring.calm}
          >
            {route.kind === 'tab' && route.tab === 'play' && <Home onPlay={play} />}
            {route.kind === 'tab' && route.tab === 'friends' && <Friends onStartChallenge={startChallenge} onPlayChallenge={playChallenge} />}
            {route.kind === 'tab' && route.tab === 'gospel' && <Gospel />}
            {route.kind === 'tab' && route.tab === 'progress' && <Progress />}
            {route.kind === 'tab' && route.tab === 'settings' && <Settings />}
            {route.kind === 'recall' && <Recall onExit={() => goTab(lastTab)} />}
            {route.kind === 'game' && (
              <Game modeId={route.mode} questionIds={route.challenge?.questionIds} onExit={() => goTab(lastTab)} onDone={onDone} />
            )}
            {route.kind === 'result' && (
              <Results
                result={route.result}
                xp={route.xp}
                onAgain={() => play(route.result.mode)}
                onHome={() => goTab(route.result.challengeId ? 'friends' : lastTab)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {route.kind === 'tab' && (
          <motion.div
            className="tabbar-wrap"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={spring.sheet}
          >
            <TabBar tab={route.tab} onChange={goTab} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {needRefresh && (
          <motion.div className="toast glass glass-thick" initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }} transition={spring.sheet} role="status">
            <span>{t.updateReady}</span>
            <Pressable className="btn btn-primary small" onClick={() => updateServiceWorker(true)}>
              {t.reload}
            </Pressable>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
