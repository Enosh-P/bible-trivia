/**
 * Bible Lives Timeline: people, events and eras from Creation to the end of the
 * New Testament (public/packs/timeline.json, built from content/timeline/timeline.json).
 *
 * Years in the data are written the usual way: negative = BC, positive = AD, no
 * year 0. Inside the app they are "astronomical" years (1 BC = 0, 2 BC = -1) so
 * subtracting two years gives the real number of years between them.
 */
import { formatRef } from '../i18n/books';

export type Lang = 'en' | 'ta';
export type Text = { en: string; ta: string };

/** A Bible reference: a book, or chapters / verses in it, or a run of books ("Exodus – Deuteronomy"). */
export interface TRef {
  b: string;
  c?: number;
  v?: number;
  c2?: number;
  v2?: number;
  to?: string;
}

export interface TCat extends Text {
  id: string;
  color: string;
}
export interface TEra extends Text {
  from: number;
  to: number;
}
export interface TEvent extends Text {
  y: number;
  refs?: TRef[];
  refText?: string;
}
export interface TPerson {
  id: string;
  cat: string;
  name: Text;
  title: Text;
  born?: number;
  died?: number;
  active?: Text & { from: number; to: number };
  approx?: boolean;
  end?: Text;
  genealogy?: boolean;
  refs: TRef[];
  refText: string;
  events: TPersonEvent[];
  /** Added by a reader and approved by the admin. */
  addedBy?: string;
  /** The reader's explanation (people added or corrected by readers). */
  note?: string;
  /** Names of readers whose corrections were applied. */
  correctedBy?: string[];
}
export interface TPersonEvent extends Text {
  y: number;
  approx?: boolean;
  refs?: TRef[];
  note?: string;
  addedBy?: string;
}
export interface Timeline {
  cats: TCat[];
  eras: TEra[];
  events: TEvent[];
  world: TEvent[];
  people: TPerson[];
}

/** The usual BC/AD year (no 0) -> a number you can subtract. */
export const astro = (y: number) => (y < 0 ? y + 1 : y);
/** Back again. */
export const fromAstro = (a: number) => (a <= 0 ? a - 1 : a);

/** Start and end of the bar drawn for a person (life if known, else the years they were active). */
export function span(p: TPerson): [number, number] {
  if (p.born != null && p.died != null) return [astro(p.born), astro(p.died)];
  if (p.active) return [astro(p.active.from), astro(p.active.to)];
  const ys = p.events.map((e) => astro(e.y));
  return [Math.min(...ys), Math.max(...ys)];
}

/** "1446 BC", "AD 30" / "கி.மு. 1446", "கி.பி. 30". `y` is an astronomical year. */
export function yearLabel(a: number, lang: Lang, approx = false): string {
  const c = approx ? (lang === 'ta' ? 'சு. ' : 'c. ') : '';
  if (a <= 0) return lang === 'ta' ? `${c}கி.மு. ${1 - a}` : `${c}${1 - a} BC`;
  return lang === 'ta' ? `${c}கி.பி. ${a}` : `${c}AD ${a}`;
}

/** "2166–1991 BC", "5 BC – AD 30". */
export function rangeLabel(a: number, b: number, lang: Lang, approx = false): string {
  if (a === b) return yearLabel(a, lang, approx);
  const c = approx ? (lang === 'ta' ? 'சு. ' : 'c. ') : '';
  if (a <= 0 && b <= 0) return lang === 'ta' ? `${c}கி.மு. ${1 - a}–${1 - b}` : `${c}${1 - a}–${1 - b} BC`;
  if (a > 0 && b > 0) return lang === 'ta' ? `${c}கி.பி. ${a}–${b}` : `${c}AD ${a}–${b}`;
  return `${yearLabel(a, lang, approx)} – ${yearLabel(b, lang)}`;
}

/** Text in a language, falling back to English while a Tamil translation is missing. */
export const pick = (t: Text, lang: Lang) => (lang === 'ta' && t.ta?.trim() ? t.ta : t.en);

/** "Genesis 11–25", "1 Kings 6:1", "Exodus – Deuteronomy" in a language. */
export function refLabel(r: TRef, lang: Lang): string {
  const base = formatRef(lang, r.b, r.c ?? 0, r.v, r.c2 == null ? r.v2 : undefined);
  if (r.to) {
    const end = r.c2 ? formatRef(lang, r.to, r.c2) : formatRef(lang, r.to, 0);
    return `${base} – ${end}`;
  }
  if (r.c2 != null) return r.v2 != null ? `${base}–${r.c2}:${r.v2}` : `${base}–${r.c2}`;
  return base;
}

/** Where to open the Bible for a reference: the first chapter (and verses to highlight). */
export function refStart(r: TRef): { book: string; chapter: number; from?: number; to?: number } {
  return { book: r.b, chapter: r.c ?? 1, from: r.v, to: r.v != null ? (r.c2 == null ? r.v2 ?? r.v : undefined) : undefined };
}

/** The era a year falls in. */
export const eraOf = (tl: Timeline, a: number) => tl.eras.find((e) => a >= astro(e.from) && a < astro(e.to)) ?? tl.eras[tl.eras.length - 1];

/** People alive (or, if their life is unknown, active) in a year. */
export const aliveIn = (tl: Timeline, a: number) => tl.people.filter((p) => {
  const [s, e] = span(p);
  return a >= s && a <= e;
});

let loading: Promise<Timeline> | null = null;
/** The timeline (downloaded once, then kept offline by the service worker). */
export function loadTimeline(): Promise<Timeline> {
  loading ??= fetch('/packs/timeline.json').then((r) => {
    if (!r.ok) throw new Error(`timeline ${r.status}`);
    return r.json() as Promise<Timeline>;
  });
  loading.catch(() => (loading = null));
  return loading;
}

/** Sort people by when their bar starts. */
export const byStart = (a: TPerson, b: TPerson) => span(a)[0] - span(b)[0] || span(a)[1] - span(b)[1];
