import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react';
import { astro, pick, yearLabel, type Lang, type TEra } from '../engine/timeline';
import { cue } from '../feedback';

/**
 * The eras as one coloured strip, from Creation to the early church. Each part is sized by
 * the square root of its length, so long eras look longer but short ones stay tappable.
 * Press and drag: a glass drop rises above the finger showing the era and year, and
 * `onScrub` follows along; letting go sinks the drop back in. An arrow marks `year`.
 */
export function EraStrip({ eras, lang, year, onScrub }: { eras: TEra[]; lang: Lang; year: number | null; onScrub: (a: number, done: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [drag, setDrag] = useState<{ era: TEra; a: number } | null>(null);
  const lastEra = useRef<TEra | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Where each era sits on the strip (0..1).
  const parts = useMemo(() => {
    const w = eras.map((e) => Math.sqrt(Math.max(1, astro(e.to) - astro(e.from))));
    const sum = w.reduce((a, b) => a + b, 0);
    let x = 0;
    return eras.map((e, i) => {
      const p = { era: e, x0: x, x1: x + w[i] / sum };
      x = p.x1;
      return p;
    });
  }, [eras]);

  const toYear = (f: number) => {
    const p = parts.find((q) => f < q.x1) ?? parts[parts.length - 1];
    const t = Math.min(1, Math.max(0, (f - p.x0) / (p.x1 - p.x0)));
    const a0 = astro(p.era.from);
    const a1 = astro(p.era.to);
    return { era: p.era, a: Math.round(a0 + t * (a1 - a0)) };
  };
  const toX = (a: number) => {
    const p = parts.find((q) => a < astro(q.era.to)) ?? parts[parts.length - 1];
    const a0 = astro(p.era.from);
    const a1 = astro(p.era.to);
    return (p.x0 + Math.min(1, Math.max(0, (a - a0) / (a1 - a0))) * (p.x1 - p.x0)) * width;
  };

  // The drop follows the finger on a soft spring and stretches with speed.
  const fx = useMotionValue(0);
  const x = useSpring(fx, { stiffness: 520, damping: 32, mass: 0.6 });
  const v = useVelocity(x);
  const stretchX = useTransform(v, [-2400, 0, 2400], [1.22, 1, 1.22], { clamp: true });
  const stretchY = useTransform(v, [-2400, 0, 2400], [0.86, 1, 0.86], { clamp: true });

  const at = (clientX: number, done: boolean) => {
    const r = box.current!.getBoundingClientRect();
    const px = Math.min(r.width - 1, Math.max(0, clientX - r.left));
    fx.set(px);
    const y = toYear(px / r.width);
    if (y.era !== lastEra.current) {
      lastEra.current = y.era;
      if (!done) cue('tick');
    }
    setDrag(done ? null : y);
    onScrub(y.a, done);
  };

  const arrow = year == null ? null : toX(year);

  return (
    <div className="era-strip-wrap">
      <div
        ref={box}
        className="era-strip"
        role="slider"
        aria-label={drag ? pick(drag.era, lang) : 'Eras'}
        aria-valuemin={astro(eras[0].from)}
        aria-valuemax={astro(eras[eras.length - 1].to)}
        aria-valuenow={year ?? undefined}
        aria-valuetext={year != null ? yearLabel(year, lang) : undefined}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = box.current!.getBoundingClientRect();
          x.jump(Math.min(r.width, Math.max(0, e.clientX - r.left)));
          lastEra.current = null;
          at(e.clientX, false);
        }}
        onPointerMove={(e) => drag && at(e.clientX, false)}
        onPointerUp={(e) => at(e.clientX, true)}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={(e) => {
          if (year == null) return;
          const i = eras.findIndex((er) => year < astro(er.to));
          const j = e.key === 'ArrowRight' ? Math.min(eras.length - 1, i + 1) : e.key === 'ArrowLeft' ? Math.max(0, i - 1) : -1;
          if (j >= 0) onScrub(astro(eras[j].from), true);
        }}
      >
        {parts.map((p) => {
          const w = (p.x1 - p.x0) * width;
          const label = pick(p.era.short, lang);
          const fits = w >= label.length * (lang === 'ta' ? 8.5 : 6.6) + 10;
          return (
            <span key={p.era.en} className={`era-part ${drag?.era === p.era ? 'is-on' : ''}`} style={{ flex: `${p.x1 - p.x0} 1 0`, background: p.era.color }}>
              {fits && <span lang={lang}>{label}</span>}
            </span>
          );
        })}
        {arrow != null && <motion.i className="era-now" aria-hidden animate={{ x: arrow }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
        <AnimatePresence>
          {drag && (
            <motion.div
              className="era-drop"
              style={{ x, scaleX: stretchX, scaleY: stretchY, ['--drop' as string]: drag.era.color }}
              initial={{ opacity: 0, y: 18, scale: 0.4 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              <div className="era-drop-body glass glass-thick">
                <strong lang={lang}>{pick(drag.era, lang)}</strong>
                <span>{yearLabel(drag.a, lang, true)}</span>
              </div>
              <i className="era-drop-tail" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
