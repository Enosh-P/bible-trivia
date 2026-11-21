import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import { Timeline } from './screens/Timeline';
import { AdminTimeline } from './screens/AdminTimeline';
import { Notebook } from './screens/Notebook';
import { SavedGames } from './screens/SavedGames';
import { drillRound } from './engine/drill';
import type { GameSnapshot } from './engine/resume';
import { Gospel, type GospelSection } from './screens/Gospel';
import { AdminFaqs } from './screens/AdminFaqs';
import { Recall } from './screens/Recall';
import { QuizPick } from './screens/QuizPick';
import { NewPasswordSheet } from './components/NewPasswordSheet';
import { keepPushAlive, syncPushLanguage } from './online/push';
import { Settings } from './screens/Settings';
import { Thought, Thoughts } from './screens/Thoughts';
import { Admin, AdminThoughts } from './screens/AdminThoughts';
import { loadCachedPosts, syncPosts, getPost } from './online/posts';
import type { Post } from './engine/posts';
import { Game, type RoundResult } from './screens/Game';
import { Results } from './screens/Results';
import { Splash, Welcome } from './screens/Welcome';
import type { ModeId } from './engine/modes';
import { dayKey } from './engine/picker';
import { db } from './storage/db';
import { supabase, syncQuestions } from './online/supabase';
import { flushReports } from './online/reports';
import { acceptInvite, createChallenge, initAccount, inviteFromText, myTurn, useAccount, pushProgress, type Challenge } from './online/account';
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
  | { kind: 'timeline' }
  | { kind: 'saved' }
  | { kind: 'notebook' }
  | { kind: 'post'; post: Post; from: 'home' | 'list' | 'gospel' }
  | { kind: 'posts' }
  | { kind: 'admin' }
  | { kind: 'adminThoughts' }
  | { kind: 'adminFaqs' }
  | { kind: 'adminTimeline' }
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

/**
 * Put in each screen: when the screen appears, scroll to where that tab was (or the top
 * for other screens), and track scrolling for it from then on.
 */
function ScrollPlace({ screenKey, positions, current }: { screenKey: string; positions: { current: Record<string, number> }; current: { current: string } }) {
  useLayoutEffect(() => {
    current.current = screenKey;
    const target = screenKey.startsWith('tab-') ? (positions.current[screenKey] ?? 0) : 0;
    window.scrollTo(0, target);
    if (!target) return;
    // The tab's content may still be drawing: try again once it has grown tall enough.
    let tries = 0;
    const again = () => {
      if (current.current !== screenKey || Math.abs(window.scrollY - target) < 2 || tries++ > 20) return;
      window.scrollTo(0, target);
      requestAnimationFrame(again);
    };
    requestAnimationFrame(again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
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

/** Identifies a page, so going back can tell pages apart. */
function routeKey(r: Route): string {
  if (r.kind === 'tab') return `tab-${r.tab}`;
  if (r.kind === 'game') return `game-${r.run}`;
  if (r.kind === 'post') return `post-${r.post.id}`;
  return r.kind;
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

  // Back (the phone's gesture or the browser button) goes to the previous page in the app:
  // every page opened gets a history entry, and going back shows the page that was there.
  // Going to a tab that is already further back (Home, Back buttons) returns to it instead of
  // adding another entry, and the results screen takes the finished game's place.
  const nav = useRef({ stack: [route] as Route[], idx: 0, fromPop: false });
  useEffect(() => {
    history.replaceState({ bt: 0 }, '', location.href);
    const onPop = (e: PopStateEvent) => {
      const n = nav.current;
      const st = e.state as { bt?: number } | null;
      const i = Math.min(typeof st?.bt === 'number' ? st.bt : 0, n.stack.length - 1);
      const r = n.stack[i];
      const changed = routeKey(r) !== routeKey(n.stack[n.idx]) || i !== n.idx;
      n.idx = i;
      if (!changed && !n.fromPop) return;
      n.fromPop = true;
      if (r.kind === 'tab') setLastTab(r.tab);
      setRoute(r);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    const n = nav.current;
    const url = (r: Route) => location.pathname + location.search + (r.kind === 'tab' ? (r.tab === 'play' ? '' : `#${TAB_HASH[r.tab]}`) : location.hash);
    if (n.fromPop) {
      n.fromPop = false;
      return;
    }
    if (routeKey(n.stack[n.idx]) === routeKey(route)) {
      n.stack[n.idx] = route;
      return;
    }
    if (route.kind === 'tab') {
      // Home / Back buttons: return to that tab's earlier entry.
      let j = -1;
      for (let k = n.idx - 1; k >= 0; k--)
        if (routeKey(n.stack[k]) === routeKey(route)) {
          j = k;
          break;
        }
      if (j >= 0) {
        const steps = j - n.idx;
        n.idx = j;
        n.stack[j] = route;
        history.go(steps);
        return;
      }
    }
    if ((route.kind === 'result' && n.stack[n.idx].kind === 'game') || (route.kind === 'game' && n.stack[n.idx].kind === 'result')) {
      n.stack[n.idx] = route;
      history.replaceState({ bt: n.idx }, '', url(route));
      return;
    }
    n.stack = [...n.stack.slice(0, n.idx + 1), route];
    n.idx = n.stack.length - 1;
    // A sheet or step that was open on the old page leaves an entry: reuse it for the new page.
    if ((history.state as { sub?: number } | null)?.sub) history.replaceState({ bt: n.idx }, '', url(route));
    else history.pushState({ bt: n.idx }, '', url(route));
  }, [route]);
  // Which part of the Gospel tab is open (kept when coming back from a thought).
  const [gospelSection, setGospelSection] = useState<GospelSection>('way');
  // Scroll: each tab remembers where it was (so Back returns there); any other
  // screen (a game, Memory verses, a post…) opens at the top.
  const screenKey = route.kind === 'tab' ? `tab-${route.tab}` : route.kind;
  const scrollPos = useRef<Record<string, number>>({});
  const currentScreen = useRef(screenKey);
  useEffect(() => {
    const onScroll = () => (scrollPos.current[currentScreen.current] = window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // The new screen sets its scroll place itself when it appears (see ScrollPlace), after the
  // old one has faded out, so nothing visible ever jumps.

  const [lastTab, setLastTab] = useState<Tab>(() => tabFromHash());

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Background content sync (no-op until Supabase is configured).
  useEffect(() => {
    void syncQuestions().catch(() => {});
    void flushReports().catch(() => {});
    // Daily Thoughts: the copy saved on the phone first, then the newest from the server.
    void loadCachedPosts().then(syncPosts);
    // Keep questions on the phone for offline play (once a day, in the background).
    const stock = setTimeout(() => void stockUp().catch(() => {}), 4000);
    const online = () => {
      void flushReports().catch(() => {});
      void flushOutbox().catch(() => {});
      void syncPractice().catch(() => {});
      void stockUp().catch(() => {});
      void syncPosts();
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
    else if (open === 'timeline') setRoute({ kind: 'timeline' });
    else if (open === 'daily') setRoute({ kind: 'game', mode: 'daily', run: Date.now() });
    else if (open === 'challenge') {
      // "X challenged you": open that challenge (once the challenges have loaded) if it's still your turn.
      goTab('friends');
      const id = params.get('id');
      if (id) {
        const tryOpen = () => {
          const c = useAccount.getState().challenges.find((x) => x.id === id);
          if (!c) return false;
          if (myTurn(c)) playChallenge(c);
          return true;
        };
        if (!tryOpen()) {
          void useAccount.getState().refresh().catch(() => {});
          const unsub = useAccount.subscribe(() => tryOpen() && unsub());
          setTimeout(unsub, 15000);
        }
      }
    } else if (open === 'thought') {
      // A new Daily Thought: open it, or the list of thoughts if it can't be found.
      const id = params.get('id');
      showThoughts();
      if (id) void getPost(id).then((post) => post && setRoute({ kind: 'post', post, from: 'gospel' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uiLang = useApp((s) => s.uiLang);
  useEffect(() => {
    void syncPushLanguage(uiLang).catch(() => {});
  }, [uiLang]);

  // Results played offline last time: send them now that we're signed in.
  const hasSession = useAccount((s) => Boolean(s.session));
  // Admin screens are for admins only (the database enforces it; this just hides them).
  const isAdmin = useAccount((s) => Boolean(s.session && s.profile?.is_admin));
  // Notifications you turned on stay on (re-subscribe quietly after updates).
  useEffect(() => {
    if (hasSession) void keepPushAlive();
  }, [hasSession]);
  useEffect(() => {
    if (hasSession) {
      void flushOutbox().catch(() => {});
      // Practice from your other devices (and anything played here offline).
      void syncPractice().catch(() => {});
      void syncPosts();
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
            await roundPool(mode === 'who' ? { kind: 'who' } : mode === 'truefalse' ? { kind: 'truefalse' } : mode === 'book' ? { kind: 'whichbook' } : mode === 'knowledge' ? { kind: 'knowledge' } : { kind: 'mix' }),
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
  };

  /** All Daily Thoughts live in one place: Gospel → Thoughts. */
  const showThoughts = () => {
    setGospelSection('thoughts');
    goTab('gospel');
  };

  // Spatial consistency: the game slides in from the right and leaves the same way.
  const key = route.kind === 'tab' ? `tab-${route.tab}` : route.kind === 'game' ? `game-${route.run}` : route.kind === 'post' ? `post-${route.post.id}` : route.kind;
  const pushed = route.kind !== 'tab';

  return (
    <MotionConfig reducedMotion="user">
      <Atmosphere />
      <main className={`app ${pushed ? 'is-pushed' : ''}`}>
        {/* Fade out, then fade in: the old screen fades where it is, then the new one appears
            already at its scroll place (ScrollPlace), so nothing jumps while visible. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            className="route"
            initial={pushed ? { x: 40, opacity: 0 } : { opacity: 0, scale: 0.99 }}
            animate={{ x: 0, opacity: 1, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } }}
          >
            <ScrollPlace screenKey={screenKey} positions={scrollPos} current={currentScreen} />
            {route.kind === 'tab' && route.tab === 'play' && <Home onPlay={play} onMemory={() => setRoute({ kind: 'memory' })} onTimeline={() => setRoute({ kind: 'timeline' })} onResume={resumeGame} onShowSaved={() => setRoute({ kind: 'saved' })} onOpenPost={(post) => setRoute({ kind: 'post', post, from: 'home' })} onShowPosts={showThoughts} />}
            {route.kind === 'tab' && route.tab === 'friends' && <Friends onStartChallenge={startChallenge} onPlayChallenge={playChallenge} />}
            {route.kind === 'tab' && route.tab === 'gospel' && <Gospel section={gospelSection} onSection={setGospelSection} onOpenPost={(post) => setRoute({ kind: 'post', post, from: 'gospel' })} />}
            {route.kind === 'tab' && route.tab === 'progress' && <Practice onAction={practice} />}
            {route.kind === 'saved' && <SavedGames onBack={() => goTab('play')} onResume={resumeGame} />}
            {route.kind === 'memory' && <MemoryVerses onExit={() => goTab(lastTab)} />}
            {route.kind === 'timeline' && <Timeline onExit={() => goTab(lastTab)} />}
            {route.kind === 'notebook' && <Notebook onExit={() => goTab('progress')} />}
            {route.kind === 'tab' && route.tab === 'settings' && <Settings onAdmin={() => setRoute({ kind: 'admin' })} />}
            {route.kind === 'post' && <Thought post={route.post} onExit={() => (route.from === 'list' ? setRoute({ kind: 'posts' }) : route.from === 'gospel' ? goTab('gospel') : goTab('play'))} onShowAll={route.from === 'gospel' ? undefined : showThoughts} />}
            {route.kind === 'posts' && <Thoughts onExit={() => goTab('play')} onOpen={(post) => setRoute({ kind: 'post', post, from: 'list' })} />}
            {route.kind === 'admin' && isAdmin && <Admin onExit={() => goTab('settings')} onThoughts={() => setRoute({ kind: 'adminThoughts' })} onFaqs={() => setRoute({ kind: 'adminFaqs' })} onTimeline={() => setRoute({ kind: 'adminTimeline' })} />}
            {route.kind === 'adminThoughts' && isAdmin && <AdminThoughts onExit={() => setRoute({ kind: 'admin' })} />}
            {route.kind === 'adminFaqs' && isAdmin && <AdminFaqs onExit={() => setRoute({ kind: 'admin' })} />}
            {route.kind === 'adminTimeline' && isAdmin && <AdminTimeline onExit={() => setRoute({ kind: 'admin' })} />}
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
