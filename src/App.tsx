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
import { Practice, type PracticeAction } from './screens/Practice';
import { MemoryVerses } from './screens/MemoryVerses';
import { Notebook } from './screens/Notebook';
import { SavedGames } from './screens/SavedGames';
import { drillRound } from './engine/drill';
import type { GameSnapshot } from './engine/resume';
import { Gospel } from './screens/Gospel';
import { Recall } from './screens/Recall';
import { QuizPick } from './screens/QuizPick';
import { NewPasswordSheet } from './components/NewPasswordSheet';
import { keepPushAlive, syncPushLanguage } from './online/push';
import { Settings } from './screens/Settings';
import { Game, type RoundResult } from './screens/Game';
import { Results } from './screens/Results';
import { Splash, Welcome } from './screens/Welcome';
import type { ModeId } from './engine/modes';
import { dayKey } from './engine/picker';
import { db } from './storage/db';
import { supabase, syncQuestions } from './online/supabase';
import { flushReports } from './online/reports';
import { acceptInvite, createChallenge, initAccount, inviteFromText, useAccount, pushProgress, type Challenge } from './online/account';
import { flushOutbox, send } from './online/outbox';
import { syncPractice, syncSoon } from './online/practiceSync';
import { stockUp } from './online/stock';
import { MODES } from './engine/modes';
import { pickQuestions } from './engine/picker';
import { roundPool } from './engine/content';
import { useApp, useT } from './store';
import { spring } from './motion/springs';

type Route =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'recall' }
  | { kind: 'quizpick' }
  | { kind: 'memory' }
  | { kind: 'saved' }
  | { kind: 'notebook' }
  | { kind: 'game'; mode: ModeId; run: number; challenge?: { id: string; questionIds: string[] }; scope?: { book: string; chapter: number | null }; ids?: string[]; resume?: GameSnapshot } | { kind: 'result'; result: RoundResult; xp: number };

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

// Opened from a friend's QR code with the phone camera: keep the invite until signed in.
try {
  const token = inviteFromText(location.href);
  if (token) {
    sessionStorage.setItem('bt-invite', token);
    const u = new URL(location.href);
    u.searchParams.delete('invite');
    history.replaceState(null, '', u.pathname + u.search);
  }
} catch {
  /* storage blocked */
}

/** Tab ↔ address: #friends, #gospel, #practice, #settings (Play has none). */
const TAB_HASH: Record<Tab, string> = { play: 'play', friends: 'friends', gospel: 'gospel', progress: 'practice', settings: 'settings' };
function tabFromHash(): Tab {
  const h = location.hash.replace('#', '');
  return (Object.keys(TAB_HASH) as Tab[]).find((t) => TAB_HASH[t] === h) ?? 'play';
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
  // The tab is kept in the address (#practice), so a reload opens the same tab.
  const [route, setRoute] = useState<Route>(() => ({ kind: 'tab', tab: tabFromHash() }));
  const [lastTab, setLastTab] = useState<Tab>(() => tabFromHash());

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Background content sync (no-op until Supabase is configured).
  useEffect(() => {
    void syncQuestions().catch(() => {});
    void flushReports().catch(() => {});
    // Keep questions on the phone for offline play (once a day, in the background).
    const stock = setTimeout(() => void stockUp().catch(() => {}), 4000);
    const online = () => {
      void flushReports().catch(() => {});
      void flushOutbox().catch(() => {});
      void syncPractice().catch(() => {});
      void stockUp().catch(() => {});
    };
    window.addEventListener('online', online);
    return () => {
      clearTimeout(stock);
      window.removeEventListener('online', online);
    };
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

  // Results played offline last time: send them now that we're signed in.
  const hasSession = useAccount((s) => Boolean(s.session));
  // Notifications you turned on stay on (re-subscribe quietly after updates).
  useEffect(() => {
    if (hasSession) void keepPushAlive();
  }, [hasSession]);
  useEffect(() => {
    if (hasSession) {
      void flushOutbox().catch(() => {});
      // Practice from your other devices (and anything played here offline).
      void syncPractice().catch(() => {});
    }
  }, [hasSession]);

  // A friend's QR code scanned with the phone camera: become friends now.
  const [notice, setNotice] = useState<string | null>(null);
  const signedIn = useAccount((s) => Boolean(s.session));
  useEffect(() => {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem('bt-invite');
    } catch {
      /* storage blocked */
    }
    if (!token || !signedIn) return;
    sessionStorage.removeItem('bt-invite');
    acceptInvite(token)
      .then((r) => {
        const msg = { accepted: t.scanAccepted, already_friends: t.scanAlready, expired: t.scanExpired, self: t.scanSelf, signed_out: t.scanSignIn }[r];
        setNotice(msg);
        if (r === 'accepted' || r === 'already_friends') goTab('friends');
      })
      .catch(() => setNotice(t.scanExpired));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Quiz by Book: "Play again" repeats the same book or chapter.
  const [lastScope, setLastScope] = useState<{ book: string; chapter: number | null } | null>(null);
  const play = (mode: ModeId, again = false) =>
    setRoute(
      mode === 'recall'
        ? { kind: 'recall' }
        : mode === 'drill'
          ? { kind: 'game', mode, run: Date.now(), ids: drillRound(10) }
          : mode === 'quiz'
          ? again && lastScope
            ? { kind: 'game', mode, run: Date.now(), scope: lastScope }
            : { kind: 'quizpick' }
          : { kind: 'game', mode, run: Date.now() },
    );
  /** Continue a game that was closed partway (saved by Game after every question). */
  const resumeGame = (s: GameSnapshot) =>
    setRoute({
      kind: 'game',
      mode: s.mode,
      run: Date.now(),
      ids: s.ids,
      resume: s,
      ...(s.scope ? { scope: s.scope } : {}),
      ...(s.challengeId ? { challenge: { id: s.challengeId, questionIds: s.ids } } : {}),
    });

  // Practice tab: mistakes, reviews and saved questions; the books drill; memory verses; the notebook.
  const practice = (a: PracticeAction) => {
    if (a.kind === 'ids') setRoute({ kind: 'game', mode: 'practice', run: Date.now(), ids: a.ids });
    else if (a.kind === 'drill') setRoute({ kind: 'game', mode: 'drill', run: Date.now(), ids: drillRound(10) });
    else if (a.kind === 'book') startQuiz(a.book, null);
    else setRoute({ kind: a.kind });
  };
  const startQuiz = (book: string, chapter: number | null) => {
    setLastScope({ book, chapter });
    setRoute({ kind: 'game', mode: 'quiz', run: Date.now(), scope: { book, chapter } });
  };

  /** Friend challenge: same questions for everyone; the starter plays first. */
  async function startChallenge(mode: ModeId, friendIds: string[]) {
    // The Books of the Bible questions are made from their ids, so the friend gets exactly these.
    const questionIds =
      mode === 'drill'
        ? drillRound(10)
        : pickQuestions(
            await roundPool(mode === 'who' ? { kind: 'who' } : mode === 'truefalse' ? { kind: 'truefalse' } : mode === 'book' ? { kind: 'whichbook' } : { kind: 'mix' }),
            MODES[mode],
          ).map((q) => q.id);
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
    // Practice has no timer, so it earns half the points as XP.
    const xp = result.mode === 'practice' ? Math.round(result.score / 2) : result.score + (result.mode === 'daily' ? 25 : 0);
    finishRound({ xp, correct: result.correct, total: result.total, score: result.score, daily: result.mode === 'daily' });
    void db.rounds
      .add({ mode: result.mode, day: dayKey(), score: result.score, correct: result.correct, total: result.total, xp, at: Date.now() })
      .catch(() => {});
    // Online extras (no-ops when signed out).
    void pushProgress().catch(() => {});
    syncSoon();
    // Sent now, or kept on the phone and sent when it's back online.
    if (result.mode === 'daily') void send({ kind: 'daily', day: dayKey(), score: result.score, correct: result.correct, total: result.total });
    const challengeId = route.kind === 'game' ? route.challenge?.id : undefined;
    if (challengeId) void send({ kind: 'challenge', id: challengeId, score: result.score, correct: result.correct, total: result.total });
    setRoute({ kind: 'result', result: { ...result, challengeId }, xp });
  }

  const goTab = (tab: Tab) => {
    setLastTab(tab);
    setRoute({ kind: 'tab', tab });
    const hash = tab === 'play' ? '' : `#${TAB_HASH[tab]}`;
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
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
            {route.kind === 'tab' && route.tab === 'play' && <Home onPlay={play} onResume={resumeGame} onShowSaved={() => setRoute({ kind: 'saved' })} />}
            {route.kind === 'tab' && route.tab === 'friends' && <Friends onStartChallenge={startChallenge} onPlayChallenge={playChallenge} />}
            {route.kind === 'tab' && route.tab === 'gospel' && <Gospel />}
            {route.kind === 'tab' && route.tab === 'progress' && <Practice onAction={practice} />}
            {route.kind === 'saved' && <SavedGames onBack={() => goTab('play')} onResume={resumeGame} />}
            {route.kind === 'memory' && <MemoryVerses onExit={() => goTab('progress')} />}
            {route.kind === 'notebook' && <Notebook onExit={() => goTab('progress')} />}
            {route.kind === 'tab' && route.tab === 'settings' && <Settings />}
            {route.kind === 'recall' && <Recall onExit={() => goTab(lastTab)} />}
            {route.kind === 'quizpick' && <QuizPick onExit={() => goTab(lastTab)} onStart={startQuiz} />}
            {route.kind === 'game' && (
              <Game modeId={route.mode} questionIds={route.challenge?.questionIds ?? route.ids} scope={route.scope} challengeId={route.challenge?.id} resume={route.resume} runId={route.resume?.id ?? `g${route.run}`} onExit={() => goTab(lastTab)} onDone={onDone} />
            )}
            {route.kind === 'result' && (
              <Results
                result={route.result}
                xp={route.xp}
                onAgain={() => (route.result.mode === 'practice' ? goTab('progress') : route.result.mode === 'drill' ? practice({ kind: 'drill' }) : play(route.result.mode, true))}
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
        {notice && (
          <motion.div className="toast glass glass-thick" initial={{ y: -80 }} animate={{ y: 0 }} exit={{ y: -80 }} transition={spring.sheet} role="status">
            <span>{notice}</span>
            <Pressable className="btn glass small" onClick={() => setNotice(null)}>
              {t.close}
            </Pressable>
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
