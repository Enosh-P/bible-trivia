import { db, type AnswerRecord, type SavedRow } from '../storage/db';
import { useApp } from '../store';
import { supabase } from './supabase';
import { signOutHooks, useAccount } from './account';

/**
 * Practice follows the account. Each device keeps its own copy (for offline
 * play) and syncs with Supabase:
 *   answers          sent once (practice_answers); new ones from other devices fetched
 *   saved questions  newest change wins (saved_questions)
 *   memory verses    highest level per verse; your own verses from the newest edit (practice_state)
 * Signing out sends what's left, then clears this device for the next person.
 */

const BATCH = 500;
const cursorKey = (uid: string) => `bt-practice-cursor:${uid}`;

/** Bumped after a sync brings in something new, so open screens reload. */
export let practiceVersion = 0;
const listeners = new Set<() => void>();
export function onPracticeChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function changed() {
  practiceVersion++;
  listeners.forEach((l) => l());
}

let running: Promise<void> | null = null;

/** Sync now (does nothing offline, signed out, or while a sync is running). */
export function syncPractice(): Promise<void> {
  running ??= run().finally(() => (running = null));
  return running;
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Sync in a moment (after a round, a star, a memory verse…), once for a burst of changes. */
export function syncSoon(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(() => void syncPractice().catch(() => {}), delay);
}

async function run() {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid || !navigator.onLine) return;
  let news = false;
  news = (await pushAnswers(uid)) || news;
  news = (await pullAnswers(uid)) || news;
  news = (await syncSaved(uid)) || news;
  news = (await syncState(uid)) || news;
  if (news) changed();
}

async function pushAnswers(uid: string): Promise<boolean> {
  const pending = await db.answers.where('synced').equals(0).toArray();
  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH).filter((a) => a.clientKey);
    const { error } = await supabase!.from('practice_answers').upsert(
      chunk.map((a) => ({
        user_id: uid,
        client_key: a.clientKey!,
        question_id: a.questionId,
        book: a.book,
        correct: a.correct,
        mode: a.mode,
        answered_at: new Date(a.at).toISOString(),
      })),
      { onConflict: 'user_id,client_key', ignoreDuplicates: true },
    );
    if (error) throw error;
    await db.answers.bulkUpdate(chunk.map((a) => ({ key: a.id!, changes: { synced: 1 as const } })));
  }
  return false;
}

async function pullAnswers(uid: string): Promise<boolean> {
  let cursor = localStorage.getItem(cursorKey(uid)) ?? '1970-01-01T00:00:00Z';
  let added = 0;
  for (;;) {
    const { data, error } = await supabase!
      .from('practice_answers')
      .select('client_key, question_id, book, correct, mode, answered_at, created_at')
      .eq('user_id', uid)
      .gt('created_at', cursor)
      .order('created_at')
      .limit(1000);
    if (error) throw error;
    if (!data.length) break;
    const have = new Set((await db.answers.where('clientKey').anyOf(data.map((r) => r.client_key)).toArray()).map((a) => a.clientKey));
    const fresh: AnswerRecord[] = data
      .filter((r) => !have.has(r.client_key))
      .map((r) => ({ questionId: r.question_id, book: r.book, correct: r.correct, mode: r.mode, at: Date.parse(r.answered_at), clientKey: r.client_key, synced: 1 }));
    if (fresh.length) await db.answers.bulkAdd(fresh);
    added += fresh.length;
    cursor = data[data.length - 1].created_at;
    localStorage.setItem(cursorKey(uid), cursor);
    if (data.length < 1000) break;
  }
  return added > 0;
}

async function syncSaved(uid: string): Promise<boolean> {
  const { data, error } = await supabase!.from('saved_questions').select('question_id, saved, updated_at').eq('user_id', uid);
  if (error) throw error;
  const server = new Map(data.map((r) => [r.question_id, { saved: r.saved as boolean, at: Date.parse(r.updated_at) }]));
  const local = new Map((await db.saved.toArray()).map((r) => [r.id, r]));
  let news = false;

  // Newer on the account: take it.
  const take: SavedRow[] = [];
  for (const [id, s] of server) {
    const l = local.get(id);
    if (!l || (l.updatedAt ?? l.at) < s.at) take.push({ id, at: l?.at ?? s.at, saved: s.saved ? 1 : 0, updatedAt: s.at });
  }
  if (take.length) {
    await db.saved.bulkPut(take);
    news = true;
  }
  // Newer here: send it.
  const send = [...local.values()].filter((l) => {
    const s = server.get(l.id);
    return !s || (l.updatedAt ?? l.at) > s.at;
  });
  if (send.length) {
    const { error: e } = await supabase!.from('saved_questions').upsert(
      send.map((l) => ({ user_id: uid, question_id: l.id, saved: l.saved !== 0, updated_at: new Date(l.updatedAt ?? l.at).toISOString() })),
      { onConflict: 'user_id,question_id' },
    );
    if (e) throw e;
  }
  return news;
}

type MyVerse = NonNullable<ReturnType<typeof useApp.getState>['myVerses']>[number];

async function syncState(uid: string): Promise<boolean> {
  const { data, error } = await supabase!.from('practice_state').select('memory, my_verses, updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  const app = useApp.getState();
  const localMemory = app.memory ?? {};
  const localVerses = app.myVerses ?? [];
  const localAt = app.practiceUpdatedAt ?? 0;
  const serverMemory = (data?.memory ?? {}) as Record<string, number>;
  const serverVerses = (data?.my_verses ?? []) as MyVerse[];
  const serverAt = data ? Date.parse(data.updated_at) : 0;

  // Memory levels only go up: keep the higher one for each verse.
  const memory: Record<string, number> = { ...serverMemory };
  for (const [k, v] of Object.entries(localMemory)) memory[k] = Math.max(v, memory[k] ?? 0);
  // Your own verses: the newer list wins (so a removal on one device sticks).
  const verses = serverAt > localAt ? serverVerses : localVerses;
  const at = Math.max(serverAt, localAt);

  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const localChanged = !same(memory, localMemory) || !same(verses, localVerses);
  const serverChanged = !data || !same(memory, serverMemory) || !same(verses, serverVerses);
  if (localChanged) useApp.setState({ memory, myVerses: verses, practiceUpdatedAt: at });
  if (serverChanged) {
    const { error: e } = await supabase!
      .from('practice_state')
      .upsert({ user_id: uid, memory, my_verses: verses, updated_at: new Date(at || Date.now()).toISOString() }, { onConflict: 'user_id' });
    if (e) throw e;
  }
  return localChanged;
}

// Signing out: send what's left, then clear this device's practice for the next person.
signOutHooks.push(async () => {
  const uid = useAccount.getState().session?.user.id;
  await syncPractice().catch(() => {});
  await Promise.all([db.answers.clear(), db.saved.clear()]).catch(() => {});
  useApp.setState({ memory: {}, myVerses: [], practiceUpdatedAt: 0 });
  if (uid) localStorage.removeItem(cursorKey(uid));
  changed();
});
