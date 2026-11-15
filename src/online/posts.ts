import { create } from 'zustand';
import { db } from '../storage/db';
import { dayKey } from '../engine/picker';
import { matchesSearch, visiblePosts, type Post } from '../engine/posts';
import { supabase } from './supabase';
import { useAccount } from './account';

/*
 * Daily Thoughts for readers. The newest 30 are kept in IndexedDB, shown at
 * once (and offline), and refreshed from Supabase in the background.
 * Writing them is in adminPosts.ts.
 */

export const POST_COLUMNS = 'id, author_id, title_en, title_ta, body_en, body_ta, cover_url, verse_ref, publish_on, status, created_at, updated_at';
/** How many posts stay on the phone. */
export const KEEP_OFFLINE = 30;

interface PostsState {
  /** Published posts whose day has come here, newest first. */
  posts: Post[];
  /** The offline copy has been read (the list may still be empty). */
  loaded: boolean;
}

export const usePosts = create<PostsState>(() => ({ posts: [], loaded: false }));

/** The server's date is UTC; a post appears when its day starts on the reader's own calendar. */
function show(posts: Post[]) {
  usePosts.setState({ posts: visiblePosts(posts, dayKey()), loaded: true });
}

/** Show what was saved on the phone last time. */
export async function loadCachedPosts(): Promise<void> {
  try {
    show(await db.posts.toArray());
  } catch {
    usePosts.setState({ loaded: true });
  }
}

let running: Promise<void> | null = null;

/** Fetch the newest posts and replace the offline copy (so unpublished ones disappear). Silent when offline. */
export function syncPosts(): Promise<void> {
  running ??= run()
    .catch(() => {})
    .finally(() => (running = null));
  return running;
}

async function run() {
  if (!usePosts.getState().loaded) await loadCachedPosts();
  if (!supabase || !navigator.onLine || !useAccount.getState().session) return;
  const { data, error } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('status', 'published')
    .lte('publish_on', dayKey())
    .order('publish_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(KEEP_OFFLINE);
  // Before the posts migration has been run (or on any failure) keep what we have.
  if (error || !data) return;
  const posts = data as unknown as Post[];
  await db.transaction('rw', db.posts, async () => {
    await db.posts.clear();
    await db.posts.bulkPut(posts);
  });
  show(posts);
}

/**
 * Earlier thoughts, newest first, optionally only those containing the words
 * typed. Online it looks through every published post; offline (or on an
 * error) through the ones saved on the phone.
 */
export async function findPosts(query: string, limit = 100): Promise<{ posts: Post[]; offline: boolean }> {
  const q = query.trim();
  const local = () => ({ posts: usePosts.getState().posts.filter((p) => matchesSearch(p, q)), offline: true });
  if (!supabase || !navigator.onLine || !useAccount.getState().session) return local();
  let request = supabase.from('posts').select(POST_COLUMNS).eq('status', 'published').lte('publish_on', dayKey());
  // Each word must be somewhere in a title or text. Characters that mean something in a filter are left out.
  for (const word of q.split(/\s+/).filter(Boolean).slice(0, 5)) {
    const w = word.replace(/[%_,()"\\*]/g, '');
    if (!w) continue;
    request = request.or(['title_en', 'title_ta', 'body_en', 'body_ta'].map((c) => `${c}.ilike.%${w}%`).join(','));
  }
  const { data, error } = await request.order('publish_on', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (error || !data) return local();
  return { posts: visiblePosts(data as unknown as Post[], dayKey()), offline: false };
}
