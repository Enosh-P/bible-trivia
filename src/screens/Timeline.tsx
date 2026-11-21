import { useBackStep } from '../hooks/useBackStep';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ChevronLeft, ChevronRight, House, Info, SlidersHorizontal, ListChecks, Minus, Pencil, Plus, Search, Users } from 'lucide-react';
import { useApp, useT } from '../store';
import { spring } from '../motion/springs';
import { Pressable } from '../components/Pressable';
import { STROKE } from '../components/icons';
import { Sheet } from '../components/Sheet';
import { LangToggle } from '../components/LangToggle';
import { chapterText } from '../engine/bible';
import { ReportButton } from '../components/Report';
import { EraStrip } from '../components/EraStrip';
import { timelineTarget } from '../online/reports';
import { loadApproved, withApproved } from '../online/timeline';
import { MinePanel, SubmitPanel, correctionDraft, emptyDraft, eventDraft, type Draft } from './TimelineSubmit';
import {
  aliveIn,
  astro,
  byStart,
  eraOf,
  loadTimeline,
  pick,
  rangeLabel,
  refLabel,
  refStart,
  span,
  yearLabel,
  type Lang,
  type TEvent,
  type TPerson,
  type TRef,
  type Text,
  type Timeline as TL,
} from '../engine/timeline';

type Panel =
  | { k: 'person'; p: TPerson }
  | { k: 'event'; e: TEvent; world?: boolean }
  | { k: 'verse'; r: TRef }
  | { k: 'alive'; y: number }
  | { k: 'dates' }
  | { k: 'add'; draft: Draft }
  | { k: 'mine' }
  | { k: 'filter' };

/** A year to scroll to from the era strip (`n` makes each request new). */
type Target = { a: number; done: boolean; n: number } | null;

type View = 'story' | 'chart';

/** The Bible Lives Timeline: a story list on phones, a to-scale chart on wide screens. */
export function Timeline({ onExit }: { onExit: () => void }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const lang: Lang = qLang === 'both' ? uiLang : qLang;
  const both = qLang === 'both';
  const [tl, setTl] = useState<TL | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>(() => (window.innerWidth >= 960 ? 'chart' : 'story'));
  // Once the Story / Chart switch scrolls away, a small copy floats at the top left.
  const viewsRef = useRef<HTMLDivElement>(null);
  const [floatViews, setFloatViews] = useState(false);
  useEffect(() => {
    const el = viewsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFloatViews(!e.isIntersecting), { rootMargin: '-8px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const switchView = (v: View) => {
    if (v === view) return;
    setView(v);
    // From far down the story, the chart starts at the top of the page.
    if (floatViews) window.scrollTo({ top: 0 });
  };
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [world, setWorld] = useState(false);
  const [stack, setStack] = useState<Panel[]>([]);
  // Back inside the sheet: from a verse or another person back to the first panel.
  useBackStep(stack.length > 1, () => setStack((s) => s.slice(0, 1)));
  const [year, setYear] = useState(astro(-4174));
  const [target, setTarget] = useState<Target>(null);
  const scrub = (a: number, done: boolean) => setTarget((p) => ({ a, done, n: (p?.n ?? 0) + 1 }));
  const filters = (cat ? 1 : 0) + (world ? 1 : 0);
  const open = (p: Panel) => setStack((s) => [...s, p]);
  const openFresh = (p: Panel) => setStack([p]);

  useEffect(() => {
    loadTimeline()
      .then((base) => {
        setTl(base);
        // Readers' approved suggestions, added on top when online.
        void loadApproved().then((rows) => rows?.length && setTl(withApproved(base, rows)));
      })
      .catch(() => setFailed(true));
  }, []);

  const q = query.trim().toLowerCase();
  const people = useMemo(() => {
    if (!tl) return [];
    return [...tl.people]
      .filter((p) => (!cat || p.cat === cat) && (!q || `${p.name.en} ${p.name.ta}`.toLowerCase().includes(q)))
      .sort(byStart);
  }, [tl, cat, q]);

  // Swiping between people in the sheet: which way the new one slides in.
  const [dir, setDir] = useState(0);
  const top = stack[stack.length - 1];
  const order = useMemo(() => (tl ? (people.length ? people : [...tl.people].sort(byStart)) : []), [tl, people]);
  const neighbour = (d: number) => {
    if (!top || top.k !== 'person') return null;
    const list = order.includes(top.p) ? order : order.length ? order : [];
    const i = list.findIndex((x) => x.id === top.p.id);
    return i < 0 ? null : list[i + d] ?? null;
  };
  const goPerson = (d: number) => {
    const n = neighbour(d);
    if (!n) return;
    setDir(d);
    setStack((s) => [...s.slice(0, -1), { k: 'person', p: n }]);
  };

  const sec = (x: Text) => (both ? pick(x, lang === 'en' ? 'ta' : 'en') : null);

  return (
    <div className={`screen timeline-screen ${view === 'chart' ? 'is-chart' : ''} ${floatViews ? 'has-float-views' : ''}`} lang={uiLang}>
      <header className="recall-head">
        <Pressable className="chip glass" onClick={onExit} aria-label={t.tabPlay} title={t.tabPlay}>
          <House size={19} strokeWidth={STROKE} />
        </Pressable>
        <div className="grow">
          <p className="eyebrow">{t.groupLearn}</p>
          <h1 className="title">{t.timelineTitle}</h1>
        </div>
        <button className="icon-btn" onClick={() => openFresh({ k: 'add', draft: emptyDraft() })} aria-label={t.tlAdd} title={t.tlAdd}>
          <Plus size={21} strokeWidth={STROKE} />
        </button>
        <button className="icon-btn" onClick={() => openFresh({ k: 'dates' })} aria-label={t.tlDatesTitle} title={t.tlDatesTitle}>
          <Info size={20} strokeWidth={STROKE} />
        </button>
        <LangToggle compact />
      </header>

      {/* The big switch keeps its place in the page; when it scrolls away it morphs into the
          small floating one (shared layout), and grows back when you scroll up again. */}
      <div className="tl-views-slot" ref={viewsRef}>
        {!floatViews && (
          <motion.div layoutId="tl-views" className="segmented tl-views" role="tablist" transition={spring.calm} style={{ borderRadius: 14 }}>
            {(['story', 'chart'] as const).map((v) => (
              <motion.button layout="position" key={v} role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => switchView(v)}>
                {view === v && <motion.span layoutId="seg-tl" className="segmented-thumb" transition={spring.calm} />}
                <span>{v === 'story' ? t.tlStory : t.tlChart}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
      {floatViews && (
        <motion.div layoutId="tl-views" className="tl-float-views glass glass-thick" role="tablist" transition={spring.calm} style={{ borderRadius: 999 }}>
          {(['story', 'chart'] as const).map((v) => (
            <motion.button layout="position" key={v} role="tab" aria-selected={view === v} className={view === v ? 'is-on' : ''} onClick={() => switchView(v)}>
              <span>{v === 'story' ? t.tlStory : t.tlChart}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      <div className="tl-tools">
        <label className="tl-search glass">
          <Search size={17} strokeWidth={STROKE} />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.tlSearch} aria-label={t.tlSearch} />
        </label>
        <button className={`tl-filter-btn glass ${filters ? 'is-on' : ''}`} onClick={() => openFresh({ k: 'filter' })} aria-label={t.tlFilter}>
          <SlidersHorizontal size={17} strokeWidth={STROKE} />
          <span>{cat && tl ? pick(tl.cats.find((c) => c.id === cat)!, lang) : t.tlFilter}</span>
          {filters > 0 && <b className="tl-filter-count">{filters}</b>}
        </button>
      </div>

      {failed && <p className="caption note">{t.offlineNotLoaded}</p>}

      {tl &&
        (view === 'story' ? (
          <Story tl={tl} people={people} filtering={Boolean(q || cat)} world={world} lang={lang} sec={sec} onOpen={openFresh} onYear={setYear} target={target} />
        ) : (
          <Chart tl={tl} people={people} world={world} lang={lang} onOpen={openFresh} onYear={setYear} target={target} />
        ))}

      {tl && (
        <div className="tl-dock-wrap">
          <div className="tl-dock glass glass-thick">
            {!query.trim() && <EraStrip eras={tl.eras} lang={lang} year={year} onScrub={scrub} />}
            <Pressable className="tl-alive-btn" onClick={() => openFresh({ k: 'alive', y: year })} aria-label={t.tlWhoAlive} title={t.tlWhoAlive}>
              <Users size={20} strokeWidth={STROKE} />
            </Pressable>
          </div>
        </div>
      )}

      <Sheet open={stack.length > 0} onClose={() => setStack([])} label={t.timelineTitle}>
        {tl && stack.length > 0 && (
          <div className="tl-sheet" lang={uiLang}>
            {stack.length > 1 && (
              <button className="link tl-back" onClick={() => setStack((s) => s.slice(0, -1))}>
                <ChevronLeft size={16} strokeWidth={STROKE} /> {t.back}
              </button>
            )}
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.div
                key={`${stack.length}-${top?.k === 'person' ? top.p.id : top?.k}`}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ opacity: 0, x: d ? d * 70 : 16 }),
                  show: { opacity: 1, x: 0 },
                  leave: (d: number) => ({ opacity: 0, x: d ? -d * 70 : -16 }),
                }}
                initial="enter"
                animate="show"
                exit="leave"
                transition={{ ...spring.calm, opacity: { duration: 0.15 } }}
                onAnimationComplete={() => setDir(0)}
                // Swipe left / right on a person to go to the next / previous one.
                drag={top?.k === 'person' ? 'x' : false}
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: neighbour(1) ? 0.6 : 0.1, right: neighbour(-1) ? 0.6 : 0.1 }}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  const swipe = info.offset.x + info.velocity.x * 0.2;
                  if (swipe < -90) goPerson(1);
                  else if (swipe > 90) goPerson(-1);
                }}
                style={{ touchAction: 'pan-y' }}
              >
                {stack[stack.length - 1].k === 'filter' ? (
                  <div className="tl-panel">
                    <h2 className="title">{t.tlFilter}</h2>
                    <h3 className="eyebrow">{t.tlGroups}</h3>
                    <div className="tl-pills">
                      <button className={`tl-chip ${!cat ? 'is-on' : ''}`} aria-pressed={!cat} onClick={() => setCat(null)}>
                        {t.tlAllGroups}
                      </button>
                      {tl.cats.map((c) => (
                        <button key={c.id} className={`tl-chip ${cat === c.id ? 'is-on' : ''}`} aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} style={{ ['--cat' as string]: `var(--tl-${c.id})` }}>
                          <i className="tl-dot" /> {pick(c, lang)}
                        </button>
                      ))}
                    </div>
                    <h3 className="eyebrow">{t.tlAlsoShow}</h3>
                    <div className="tl-pills">
                      <button className={`tl-chip tl-world-chip ${world ? 'is-on' : ''}`} aria-pressed={world} onClick={() => setWorld(!world)}>
                        {t.tlWorld}
                      </button>
                    </div>
                    <Pressable className="btn btn-primary tl-filter-done" onClick={() => setStack([])}>
                      {t.tlDone}
                    </Pressable>
                  </div>
                ) : (
                <PanelView panel={stack[stack.length - 1]} tl={tl} lang={lang} sec={sec} open={open} replace={(p) => setStack((s) => [...s.slice(0, -1), p])} prev={neighbour(-1)} next={neighbour(1)} onStep={goPerson} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// ---------- Story (phone) ----------

type Item = { y: number; kind: 'event' | 'world'; e: TEvent } | { y: number; kind: 'person'; p: TPerson };

function Story({
  tl,
  people,
  filtering,
  world,
  lang,
  sec,
  onOpen,
  onYear,
  target,
}: {
  tl: TL;
  people: TPerson[];
  filtering: boolean;
  world: boolean;
  lang: Lang;
  sec: (x: Text) => string | null;
  onOpen: (p: Panel) => void;
  onYear: (y: number) => void;
  target: Target;
}) {
  const t = useT();
  const list = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  // Everything sorted by year, grouped into eras.
  const eras = useMemo(() => {
    const items: Item[] = [
      ...(filtering ? [] : tl.events.map((e) => ({ y: astro(e.y), kind: 'event' as const, e }))),
      ...(filtering || !world ? [] : tl.world.map((e) => ({ y: astro(e.y), kind: 'world' as const, e }))),
      ...people.map((p) => ({ y: span(p)[0], kind: 'person' as const, p })),
    ].sort((a, b) => a.y - b.y || (a.kind === 'person' ? 1 : 0) - (b.kind === 'person' ? 1 : 0));
    return tl.eras
      .map((era, i) => ({
        era,
        items: items.filter((it) => it.y >= astro(era.from) && (it.y < astro(era.to) || i === tl.eras.length - 1)),
      }))
      .filter((g) => g.items.length);
  }, [tl, people, filtering, world]);

  // The year at the top of the screen, shown in the sticky era bar (and used by "Who was alive?").
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rows = list.current?.querySelectorAll<HTMLElement>('[data-y]');
        if (!rows) return;
        for (const r of rows) {
          if (r.getBoundingClientRect().bottom > 140) {
            const y = Number(r.dataset.y);
            setCurrent(y);
            onYear(y);
            return;
          }
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [eras, onYear]);

  // The era strip: scroll so the first entry at or after that year is at the top.
  useEffect(() => {
    if (!target) return;
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('[data-y]') ?? [])];
    const row = rows.find((r) => Number(r.dataset.y) >= target.a) ?? rows[rows.length - 1];
    if (row) window.scrollTo({ top: row.getBoundingClientRect().top + window.scrollY - 130, behavior: 'auto' });
  }, [target]);

  if (!eras.length) return <p className="caption note">{t.tlNoMatch}</p>;

  return (
    <>
      <p className="caption tl-lead">{t.tlLead}</p>
      <div className="tl-story" ref={list}>
        {eras.map((g, i) => (
          <section key={g.era.en} className="tl-era" data-era={i}>
            <div className="tl-era-head glass glass-thick">
              <strong>{pick(g.era, lang)}</strong>
              <span className="caption">
                {current != null && eraOf(tl, current) === g.era ? yearLabel(current, lang, true) : rangeLabel(astro(g.era.from), astro(g.era.to), lang)}
              </span>
            </div>
            {g.items.map((it) =>
              it.kind === 'person' ? (
                <PersonRow key={it.p.id} p={it.p} lang={lang} sec={sec} onOpen={() => onOpen({ k: 'person', p: it.p })} />
              ) : (
                <button key={`${it.kind}-${it.e.y}-${it.e.en}`} className={`tl-event is-${it.kind}`} data-y={it.y} onClick={() => onOpen({ k: 'event', e: it.e, world: it.kind === 'world' })}>
                  <span className="tl-event-year">{yearLabel(it.y, lang)}</span>
                  <i className="tl-mark" />
                  <span className="grow">
                    <span className="tl-event-text">{pick(it.e, lang)}</span>
                    {sec(it.e) && (
                      <span className="tl-sec" lang={lang === 'en' ? 'ta' : 'en'}>
                        {sec(it.e)}
                      </span>
                    )}
                    {it.e.refs?.length ? <span className="caption">{it.e.refs.map((r) => refLabel(r, lang)).join('; ')}</span> : null}
                  </span>
                </button>
              ),
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function PersonRow({ p, lang, sec, onOpen }: { p: TPerson; lang: Lang; sec: (x: Text) => string | null; onOpen: () => void }) {
  const t = useT();
  const [s, e] = span(p);
  const lifeKnown = p.born != null;
  const act = p.active ? [astro(p.active.from), astro(p.active.to)] : null;
  const len = Math.max(1, e - s);
  return (
    <Pressable className="tl-person glass" data-y={s} onClick={onOpen} style={{ ['--cat' as string]: `var(--tl-${p.cat})` }}>
      <i className="tl-dot" />
      <span className="grow tl-person-main">
        <span className="tl-person-name">
          <strong>{pick(p.name, lang)}</strong>
          {sec(p.name) && (
            <span className="tl-sec" lang={lang === 'en' ? 'ta' : 'en'}>
              {sec(p.name)}
            </span>
          )}
        </span>
        <span className="caption tl-person-title">{pick(p.title, lang)}</span>
        <span className="tl-bar" aria-hidden>
          <i className={lifeKnown ? 'life' : 'act'} />
          {lifeKnown && act && <i className="act" style={{ left: `${((act[0] - s) / len) * 100}%`, width: `${Math.max(2, ((act[1] - act[0]) / len) * 100)}%` }} />}
        </span>
        <span className="caption tl-person-years">
          {rangeLabel(s, e, lang, p.approx)}
          {lifeKnown && ` · ${t.tlYearsN(e - s)}`}
        </span>
      </span>
      <ChevronRight size={18} strokeWidth={STROKE} className="menu-chevron" />
    </Pressable>
  );
}

// ---------- Chart (to scale) ----------

const TMIN = astro(-4200);
const TMAX = 120;
const LABEL_W = 116;

function Chart({ tl, people, world, lang, onOpen, onYear, target }: { tl: TL; people: TPerson[]; world: boolean; lang: Lang; onOpen: (p: Panel) => void; onYear: (y: number) => void; target: Target }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.5); // pixels per year
  const fit = () => {
    const w = box.current?.clientWidth ?? 360;
    setK(Math.max(0.05, (w - LABEL_W - 16) / (TMAX - TMIN)));
  };
  useEffect(fit, []);
  const X = (a: number) => (a - TMIN) * k;
  const W = (TMAX - TMIN) * k;

  // Zoom around the middle of what's on screen.
  const zoom = (f: number) => {
    const el = box.current;
    if (!el) return setK((v) => v * f);
    const mid = (el.scrollLeft + (el.clientWidth - LABEL_W) / 2) / k + TMIN;
    const nk = Math.min(40, Math.max(0.05, k * f));
    setK(nk);
    requestAnimationFrame(() => (el.scrollLeft = (mid - TMIN) * nk - (el.clientWidth - LABEL_W) / 2));
  };
  // The year in the middle of the chart, for the strip's arrow.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onScroll = () => onYear(Math.round((el.scrollLeft + (el.clientWidth - LABEL_W) / 2) / k + TMIN));
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [k, onYear]);
  // The era strip: centre that year; on letting go, also bring that time's people into view.
  useEffect(() => {
    const el = box.current;
    if (!el || !target) return;
    const visible = el.clientWidth - LABEL_W;
    // Fully zoomed out ("Show all") there is nothing to scroll, so zoom in to about 500 years first.
    const nk = (TMAX - TMIN) * k <= visible + 8 ? Math.min(40, visible / 500) : k;
    if (nk !== k) setK(nk);
    const go = () => {
      const left = (target.a - TMIN) * nk - visible / 2;
      let top = el.scrollTop;
      if (target.done) {
        const first = people.find((p) => span(p)[1] >= target.a);
        const row = first ? el.querySelector<HTMLElement>(`[data-pid="${first.id}"]`) : null;
        if (row) top = Math.max(0, row.offsetTop - 44 - (world ? 64 : 32));
      }
      el.scrollTo({ left: Math.max(0, left), top, behavior: target.done ? 'smooth' : 'auto' });
    };
    // After a zoom, wait for the wider chart to be drawn before scrolling.
    if (nk !== k) requestAnimationFrame(() => requestAnimationFrame(go));
    else go();
  }, [target]);

  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => s * k >= 64) ?? 1000;
  const ticks: number[] = [];
  for (let n = Math.ceil(4200 / step) * step; n >= step; n -= step) if (1 - n >= TMIN) ticks.push(1 - n);
  for (let n = step; n <= TMAX; n += step) ticks.push(n);

  const lane = (list: TEvent[], kind: 'event' | 'world') => (
    <div className={`tl-c-row tl-c-lane is-${kind}`}>
      <div className="tl-c-label caption">{kind === 'event' ? t.tlBibleEvent : t.tlWorldEvent}</div>
      <div className="tl-c-track" style={{ width: W }}>
        {list.map((e) => (
          <button key={e.en} className="tl-c-mark" style={{ left: X(astro(e.y)) }} title={`${yearLabel(astro(e.y), lang)} · ${pick(e, lang)}`} aria-label={pick(e, lang)} onClick={() => onOpen({ k: 'event', e, world: kind === 'world' })} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="tl-chart-wrap">
      <div className="tl-chart-tools">
        <div className="tl-zoom">
          <button className="icon-btn glass" onClick={() => zoom(1 / 1.6)} aria-label={t.tlZoomOut} title={t.tlZoomOut}>
            <Minus size={18} strokeWidth={STROKE} />
          </button>
          <button className="btn glass small" onClick={fit}>
            {t.tlShowAll}
          </button>
          <button className="icon-btn glass" onClick={() => zoom(1.6)} aria-label={t.tlZoomIn} title={t.tlZoomIn}>
            <Plus size={18} strokeWidth={STROKE} />
          </button>
        </div>
      </div>
      <div className="tl-chart glass" ref={box} style={{ ['--lw' as string]: `${LABEL_W}px` }}>
        <div className="tl-c-inner" style={{ width: LABEL_W + W }}>
          <div className="tl-c-bands" style={{ left: LABEL_W, width: W }}>
            {tl.eras.map((e, i) => (
              <div key={e.en} className={`tl-c-band ${i % 2 ? '' : 'is-alt'}`} style={{ left: X(astro(e.from)), width: (astro(e.to) - astro(e.from)) * k }} />
            ))}
            {ticks.map((a) => (
              <div key={a} className="tl-c-grid" style={{ left: X(a) }} />
            ))}
          </div>
          <div className="tl-c-row tl-c-axis">
            <div className="tl-c-label caption">{t.tlYear}</div>
            <div className="tl-c-track" style={{ width: W }}>
              {tl.eras.map((e) => {
                const w = (astro(e.to) - astro(e.from)) * k;
                return w > 40 ? (
                  <span key={e.en} className="tl-c-era" style={{ left: X(astro(e.from)), width: w }}>
                    {pick(e, lang)}
                  </span>
                ) : null;
              })}
              {ticks.map((a) => (
                <span key={a} className="tl-c-tick" style={{ left: X(a) }}>
                  {yearLabel(a, lang)}
                </span>
              ))}
            </div>
          </div>
          {lane(tl.events, 'event')}
          {world && lane(tl.world, 'world')}
          {people.map((p) => {
            const [s, e] = span(p);
            const act = p.active ? [astro(p.active.from), astro(p.active.to)] : null;
            return (
              <div key={p.id} data-pid={p.id} className="tl-c-row tl-c-person" style={{ ['--cat' as string]: `var(--tl-${p.cat})` }}>
                <button className="tl-c-label" onClick={() => onOpen({ k: 'person', p })} title={pick(p.title, lang)}>
                  <i className="tl-dot" />
                  <span>{pick(p.name, lang)}</span>
                </button>
                <div className="tl-c-track" style={{ width: W }}>
                  <button className="tl-c-hit" style={{ left: X(s) - 4, width: Math.max(3, (e - s) * k) + 8 }} onClick={() => onOpen({ k: 'person', p })} aria-label={pick(p.name, lang)}>
                    {p.born != null && <i className="tl-c-life" style={{ width: Math.max(3, (e - s) * k) }} />}
                    {act && <i className="tl-c-act" style={{ left: (act[0] - s) * k + 4, width: Math.max(3, (act[1] - act[0]) * k) }} />}
                    {p.events.map((ev) => (
                      <i key={ev.en} className="tl-c-ev" style={{ left: (astro(ev.y) - s) * k + 4 }} />
                    ))}
                  </button>
                  {k * (e - s) + 160 < W - X(s) && (
                    <span className="tl-c-span" style={{ left: X(e) + 8 }}>
                      {rangeLabel(s, e, lang, p.approx)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="caption tl-chart-hint">
        {t.tlChartHint} {t.tlApprox}
      </p>
    </div>
  );
}

// ---------- Sheet panels ----------

function PanelView({
  panel,
  tl,
  lang,
  sec,
  open,
  replace,
  prev,
  next,
  onStep,
}: {
  panel: Panel;
  tl: TL;
  lang: Lang;
  sec: (x: Text) => string | null;
  open: (p: Panel) => void;
  replace: (p: Panel) => void;
  prev?: TPerson | null;
  next?: TPerson | null;
  onStep?: (d: number) => void;
}) {
  const t = useT();
  const other: Lang = lang === 'en' ? 'ta' : 'en';
  const Sec = ({ x }: { x: Text }) =>
    sec(x) ? (
      <span className="tl-sec" lang={other}>
        {sec(x)}
      </span>
    ) : null;
  const refs = (rs?: TRef[]) =>
    rs?.length ? (
      <>
        <h3 className="eyebrow">{t.tlVerses}</h3>
        <div className="tl-refs">
          {rs.map((r, i) => (
            <button key={i} className="tl-ref glass" onClick={() => open({ k: 'verse', r })}>
              <BookOpen size={15} strokeWidth={STROKE} /> {refLabel(r, lang)}
            </button>
          ))}
        </div>
      </>
    ) : null;

  if (panel.k === 'person') {
    const p = panel.p;
    const [s, e] = span(p);
    const c = tl.cats.find((x) => x.id === p.cat);
    // Everyone whose life (or active years) overlapped this person's, with how long.
    const same = tl.people
      .filter((o) => o !== p && span(o)[0] <= e && span(o)[1] >= s)
      .sort(byStart)
      .slice(0, 30)
      .map((o) => {
        const [os, oe] = span(o);
        const years = Math.min(e, oe) - Math.max(s, os);
        // With this person's birth known: how old they were when the other was born or died.
        let when: string | null = null;
        if (p.born != null) {
          const name = pick(p.name, lang);
          if (o.died != null && oe >= s && oe <= e) when = t.tlDiedWhen(name, oe - s);
          else if (o.born != null && os > s && os <= e) when = t.tlBornWhen(name, os - s);
        }
        // …and how their death sits against the next major Bible event in this person's life.
        if (o.died != null && oe >= s && oe <= e) {
          const next = tl.events.map((ev) => ({ ev, y: astro(ev.y) })).find(({ y }) => y >= oe && y <= e);
          if (next) {
            const name = pick(next.ev, lang).split(/[;:(]/)[0].trim();
            const gap = next.y - oe;
            const rel = gap === 0 ? t.tlInYearOf(name) : t.tlBeforeEvent(gap, name);
            when = when ? `${when} · ${rel}` : rel;
          }
        }
        return { o, years, when, approx: Boolean(p.approx || o.approx) };
      });
    return (
      <div className="tl-panel" style={{ ['--cat' as string]: `var(--tl-${p.cat})` }}>
        {(prev || next) && (
          <div className="tl-step">
            <button className="tl-step-btn" disabled={!prev} onClick={() => onStep?.(-1)} aria-label={prev ? pick(prev.name, lang) : undefined}>
              <ChevronLeft size={16} strokeWidth={STROKE} /> <span>{prev ? pick(prev.name, lang) : ''}</span>
            </button>
            <button className="tl-step-btn is-next" disabled={!next} onClick={() => onStep?.(1)} aria-label={next ? pick(next.name, lang) : undefined}>
              <span>{next ? pick(next.name, lang) : ''}</span> <ChevronRight size={16} strokeWidth={STROKE} />
            </button>
          </div>
        )}
        <span className="tl-cat caption">
          <i className="tl-dot" /> {c && pick(c, lang)}
        </span>
        <h2 className="title">{pick(p.name, lang)}</h2>
        <Sec x={p.name} />
        <p className="tl-panel-title">{pick(p.title, lang)}</p>
        <Sec x={p.title} />
        {p.addedBy && <p className="caption tl-added">{t.tlAddedBy(p.addedBy)}</p>}
        {p.correctedBy?.length ? <p className="caption tl-added">{t.tlCorrectedBy(p.correctedBy.join(', '))}</p> : null}
        {p.note && <p className="tl-note">{p.note}</p>}
        <dl className="tl-facts">
          {p.born != null && (
            <>
              <dt>{t.tlLived}</dt>
              <dd>
                {rangeLabel(s, e, lang, p.approx)} · {t.tlYearsN(e - s)}
              </dd>
            </>
          )}
          {p.active && (
            <>
              <dt>{pick(p.active, lang)}</dt>
              <dd>{rangeLabel(astro(p.active.from), astro(p.active.to), lang, p.approx)}</dd>
            </>
          )}
          {p.end && (
            <>
              <dt />
              <dd className="caption">{pick(p.end, lang)}</dd>
            </>
          )}
        </dl>
        {p.events.length > 0 && (
          <>
            <h3 className="eyebrow">{t.tlEvents}</h3>
            <ol className="tl-ev-list">
              {p.events.map((ev) => (
                <li key={ev.en}>
                  <button className="tl-ev-year" onClick={() => open({ k: 'alive', y: astro(ev.y) })}>
                    {yearLabel(astro(ev.y), lang, p.approx)}
                  </button>
                  <span>
                    {pick(ev, lang)}
                    <Sec x={ev} />
                    {ev.refs?.length && !ev.addedBy ? (
                      <span className="tl-ev-refs">
                        {ev.refs.map((r, i) => (
                          <button key={i} className="tl-ev-ref" onClick={() => open({ k: 'verse', r })}>
                            <BookOpen size={12} strokeWidth={STROKE} /> {refLabel(r, lang)}
                          </button>
                        ))}
                      </span>
                    ) : null}
                    {ev.addedBy && (
                      <span className="tl-user-ev">
                        {ev.note && <span className="tl-note">{ev.note}</span>}
                        {ev.refs?.length ? (
                          <span className="tl-refs">
                            {ev.refs.map((r, i) => (
                              <button key={i} className="tl-ref glass" onClick={() => open({ k: 'verse', r })}>
                                <BookOpen size={14} strokeWidth={STROKE} /> {refLabel(r, lang)}
                              </button>
                            ))}
                          </span>
                        ) : null}
                        <span className="tl-user-ev-foot">
                          <span className="caption">{t.tlAddedBy(ev.addedBy)}</span>
                          <ReportButton target={timelineTarget({ id: `${p.id}-${ev.y}`, text: `${pick(p.name, 'en')}: ${ev.en || ev.ta}`, added_by: ev.addedBy })} compact />
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
        {refs(p.refs)}
        <div className="tl-suggest">
          <button className="btn glass small" onClick={() => open({ k: 'add', draft: eventDraft(p) })}>
            <Plus size={16} strokeWidth={STROKE} /> {t.tlSuggestEvent}
          </button>
          <button className="btn glass small" onClick={() => open({ k: 'add', draft: correctionDraft(p) })}>
            <Pencil size={15} strokeWidth={STROKE} /> {t.tlSuggestFix}
          </button>
          {p.addedBy && <ReportButton target={timelineTarget({ id: p.id, text: `${p.name.en || p.name.ta}: ${p.title.en || p.title.ta}`, added_by: p.addedBy })} compact />}
        </div>
        {same.length > 0 && (
          <>
            <h3 className="eyebrow">{t.tlSameTime}</h3>
            <div className="tl-same">
              {same.map(({ o, years, when, approx }) => (
                <button key={o.id} className="tl-same-row" style={{ ['--cat' as string]: `var(--tl-${o.cat})` }} onClick={() => replace({ k: 'person', p: o })}>
                  <i className="tl-dot" />
                  <span className="grow">
                    <strong>{pick(o.name, lang)}</strong>
                    <span className="caption">
                      {rangeLabel(span(o)[0], span(o)[1], lang, o.approx)}
                      {when && ` · ${when}`}
                    </span>
                  </span>
                  <span className="tl-same-years">{t.tlTogether(years, approx)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  if (panel.k === 'event') {
    const e = panel.e;
    const y = astro(e.y);
    return (
      <div className="tl-panel">
        <span className="caption">{panel.world ? t.tlWorldEvent : t.tlBibleEvent}</span>
        <h2 className="title">{pick(e, lang)}</h2>
        <Sec x={e} />
        <p className="tl-panel-title">
          {yearLabel(y, lang, true)} · {pick(eraOf(tl, y), lang)}
        </p>
        {refs(e.refs)}
        <button className="btn glass tl-alive-link" onClick={() => open({ k: 'alive', y })}>
          <Users size={17} strokeWidth={STROKE} /> {t.tlAliveIn(yearLabel(y, lang))}
        </button>
      </div>
    );
  }

  if (panel.k === 'verse') return <VerseReader r={panel.r} />;
  if (panel.k === 'mine') return <MinePanel lang={lang} />;
  if (panel.k === 'add')
    return (
      <>
        <button className="link tl-mine-link" onClick={() => open({ k: 'mine' })}>
          <ListChecks size={16} strokeWidth={STROKE} /> {t.tlMine}
        </button>
        <SubmitPanel key={JSON.stringify(panel.draft.kind + panel.draft.person)} tl={tl} lang={lang} initial={panel.draft} onDone={() => replace({ k: 'mine' })} />
      </>
    );
  if (panel.k === 'alive') return <Alive tl={tl} y0={panel.y} lang={lang} open={open} />;

  return (
    <div className="tl-panel">
      <h2 className="title">{t.tlDatesTitle}</h2>
      <ul className="tl-notes">
        {t.tlDates.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

const YMIN = astro(-4174);
const YMAX = 100;

function Alive({ tl, y0, lang, open }: { tl: TL; y0: number; lang: Lang; open: (p: Panel) => void }) {
  const t = useT();
  const [y, setY] = useState(Math.min(YMAX, Math.max(YMIN, y0)));
  const set = (v: number) => setY(Math.min(YMAX, Math.max(YMIN, Math.round(v))));
  // The year follows the finger; the lists catch up a moment later and fade, so dragging doesn't flicker.
  const [listY, setListY] = useState(y);
  useEffect(() => {
    const id = setTimeout(() => setListY(y), 180);
    return () => clearTimeout(id);
  }, [y]);
  const alive = aliveIn(tl, listY).sort(byStart);
  const near = [...tl.events.map((e) => ({ e, world: false })), ...tl.world.map((e) => ({ e, world: true }))]
    .filter(({ e }) => Math.abs(astro(e.y) - listY) <= 25)
    .sort((a, b) => astro(a.e.y) - astro(b.e.y));
  const bc = y <= 0;
  const shown = bc ? 1 - y : y;
  return (
    <div className="tl-panel">
      <h2 className="title">{t.tlAliveIn(yearLabel(y, lang))}</h2>
      <p className="caption">{pick(eraOf(tl, y), lang)}</p>
      <div className="tl-year-row">
        <button className="icon-btn glass" onClick={() => set(y - 10)} aria-label="-10">
          <ChevronLeft size={18} strokeWidth={STROKE} />
        </button>
        <input
          className="field tl-year-input"
          type="number"
          inputMode="numeric"
          min={1}
          value={shown}
          aria-label={t.tlYear}
          onChange={(e) => {
            const n = Math.max(1, Number(e.target.value) || 1);
            set(bc ? 1 - n : n);
          }}
        />
        <div className="lang-switch tl-bcad" role="radiogroup" aria-label={t.tlYear}>
          {(['bc', 'ad'] as const).map((s) => (
            <button key={s} role="radio" aria-checked={(s === 'bc') === bc} className={(s === 'bc') === bc ? 'is-on' : ''} onClick={() => set(s === 'bc' ? 1 - shown : shown)}>
              {(s === 'bc') === bc && <motion.span layoutId="tl-bcad-thumb" className="lang-thumb" transition={spring.calm} />}
              <span className="lang-label">{s === 'bc' ? t.tlBC : t.tlAD}</span>
            </button>
          ))}
        </div>
        <button className="icon-btn glass" onClick={() => set(y + 10)} aria-label="+10">
          <ChevronRight size={18} strokeWidth={STROKE} />
        </button>
      </div>
      <input className="tl-slider" type="range" min={YMIN} max={YMAX} value={y} onChange={(e) => set(Number(e.target.value))} aria-label={t.tlYear} />
      {alive.length ? (
        <motion.div layout className="tl-pills" transition={{ duration: 0.35, ease: 'easeOut' }}>
          <AnimatePresence initial={false} mode="popLayout">
            {alive.map((p) => (
              <motion.button
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="tl-pill"
                style={{ ['--cat' as string]: `var(--tl-${p.cat})` }}
                onClick={() => open({ k: 'person', p })}
              >
                <i className="tl-dot" /> {pick(p.name, lang)}
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="caption">
          {t.tlNobody}
        </motion.p>
      )}
      {near.length > 0 && (
        <>
          <h3 className="eyebrow">{t.tlEventsNear}</h3>
          <ol className="tl-ev-list">
            {near.map(({ e, world }) => (
              <motion.li layout key={e.en} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }} className={world ? 'is-world' : ''}>
                <button className="tl-ev-year" onClick={() => open({ k: 'event', e, world })}>
                  {yearLabel(astro(e.y), lang)}
                </button>
                <span>{pick(e, lang)}</span>
              </motion.li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

/** A chapter of the Bible in the chosen language(s), with the reference's verses highlighted. */
function VerseReader({ r }: { r: TRef }) {
  const t = useT();
  const uiLang = useApp((s) => s.uiLang);
  const qLang = useApp((s) => s.qLang);
  const start = refStart(r);
  const [ch, setCh] = useState(start.chapter);
  const [text, setText] = useState<{ en: string[]; ta: string[]; chapters: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const first = start.chapter;
  const last = r.to ? text?.chapters ?? first : r.c2 ?? (r.c ? first : text?.chapters ?? first);

  useEffect(() => {
    setText(null);
    chapterText(start.book, ch)
      .then((x) => (x ? setText(x) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [start.book, ch]);

  // Bring the highlighted verse into view.
  useEffect(() => {
    if (text && ch === first && start.from) body.current?.querySelector('.is-hl')?.scrollIntoView({ block: 'center' });
  }, [text, ch, first, start.from]);

  const langs: Lang[] = qLang === 'both' ? [uiLang, uiLang === 'en' ? 'ta' : 'en'] : [qLang];
  const hl = (v: number) => ch === first && start.from != null && v >= start.from && v <= (start.to ?? start.from);
  return (
    <div className="tl-panel tl-reader">
      <h2 className="title">{refLabel({ b: start.book, c: ch }, uiLang)}</h2>
      {refLabel(r, uiLang) !== refLabel({ b: start.book, c: ch }, uiLang) && <p className="caption">{refLabel(r, uiLang)}</p>}
      {failed && <p className="caption note">{t.offlineNotLoaded}</p>}
      <div className="tl-reader-body" ref={body}>
        {text?.en.map((_, i) => (
          <p key={i} className={`tl-verse ${hl(i + 1) ? 'is-hl' : ''}`}>
            <sup>{i + 1}</sup>
            {langs.map((l, j) => (
              <Fragment key={l}>
                <span className={`verse ${j ? 'tl-sec' : ''}`} lang={l}>
                  {text[l][i]}
                </span>
                {j === 0 && langs.length > 1 && ' '}
              </Fragment>
            ))}
          </p>
        ))}
      </div>
      {last > first && (
        <div className="tl-reader-nav">
          <button className="btn glass small" disabled={ch <= first} onClick={() => setCh(ch - 1)}>
            <ChevronLeft size={16} strokeWidth={STROKE} /> {t.tlPrevChapter}
          </button>
          <button className="btn glass small" disabled={ch >= last} onClick={() => setCh(ch + 1)}>
            {t.tlNextChapter} <ChevronRight size={16} strokeWidth={STROKE} />
          </button>
        </div>
      )}
    </div>
  );
}
