import type { Lang } from './types';
import { plainText } from './markdown';

/** A Daily Thought, as stored in Supabase (table `posts`). */
export interface Post {
  id: string;
  author_id: string | null;
  title_en: string;
  title_ta: string;
  body_en: string;
  body_ta: string;
  cover_url: string | null;
  /** 'JHN 3:16' or 'JHN 3:16-18' */
  verse_ref: string | null;
  /** The day it appears, YYYY-MM-DD. */
  publish_on: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

/** What the editor works on (a post not saved yet has no id). */
export type PostDraft = Pick<Post, 'title_en' | 'title_ta' | 'body_en' | 'body_ta' | 'cover_url' | 'verse_ref' | 'publish_on' | 'status'> & { id?: string };

export function emptyDraft(today: string): PostDraft {
  return { title_en: '', title_ta: '', body_en: '', body_ta: '', cover_url: null, verse_ref: null, publish_on: today, status: 'draft' };
}

type Texts = Pick<Post, 'title_en' | 'title_ta' | 'body_en' | 'body_ta'>;

export function hasLang(p: Texts, lang: Lang): boolean {
  return Boolean(p[`title_${lang}`].trim() || p[`body_${lang}`].trim());
}

export interface PostSection {
  lang: Lang;
  title: string;
  body: string;
}

/**
 * What a reader sees: the post in their language; in "both", Tamil then
 * English. A language that wasn't written falls back to the other one.
 */
export function postSections(p: Texts, qLang: Lang | 'both'): PostSection[] {
  const section = (lang: Lang): PostSection => ({ lang, title: p[`title_${lang}`].trim(), body: p[`body_${lang}`].trim() });
  const wanted: Lang[] = qLang === 'both' ? ['ta', 'en'] : [qLang];
  const have = wanted.filter((l) => hasLang(p, l));
  if (have.length) return have.map(section);
  const other: Lang = wanted[0] === 'en' ? 'ta' : 'en';
  return hasLang(p, other) ? [section(other)] : [];
}

/** Title and first words for cards and lists, in the reader's first language. */
export function postSummary(p: Texts, qLang: Lang | 'both', uiLang: Lang): PostSection {
  const first = qLang === 'both' ? uiLang : qLang;
  return postSections(p, first)[0] ?? { lang: first, title: '', body: '' };
}

/** Published posts whose day has come on this reader's calendar, newest first. */
export function visiblePosts<T extends Pick<Post, 'status' | 'publish_on' | 'created_at'>>(posts: T[], today: string): T[] {
  return posts
    .filter((p) => p.status === 'published' && p.publish_on <= today)
    .sort((a, b) => (a.publish_on === b.publish_on ? b.created_at.localeCompare(a.created_at) : b.publish_on.localeCompare(a.publish_on)));
}

export type PostState = 'draft' | 'scheduled' | 'published';

/** For the admin list: a published post with a later date is "scheduled". */
export function postState(p: Pick<Post, 'status' | 'publish_on'>, today: string): PostState {
  return p.status === 'draft' ? 'draft' : p.publish_on > today ? 'scheduled' : 'published';
}

/** Word search: every word typed must appear in a title or body (either language). */
export function matchesSearch(p: Texts, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${p.title_en} ${p.title_ta} ${plainText(p.body_en)} ${plainText(p.body_ta)}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Why a draft can't be published yet, or null when it can. */
export function publishProblem(d: PostDraft): 'title' | 'body' | 'date' | null {
  const langs: Lang[] = ['en', 'ta'];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.publish_on)) return 'date';
  // At least one language must be complete (title and text).
  if (langs.some((l) => d[`title_${l}`].trim() && d[`body_${l}`].trim())) return null;
  return langs.some((l) => d[`title_${l}`].trim()) ? 'body' : 'title';
}
