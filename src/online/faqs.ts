import { create } from 'zustand';
import { SHIPPED_FAQS, sortFaqs, type FaqDraft, type GospelFaq } from '../engine/faqs';
import { supabase } from './supabase';

/*
 * Gospel Q&A for readers: the published questions from Supabase, kept on the
 * phone for offline use. Until the database answers once, the questions the app
 * shipped with are shown. Admin functions are at the bottom.
 */

const CACHE_KEY = 'bt-gospel-faqs';
const COLUMNS = 'id, topic, sort, question_en, question_ta, answer_en, answer_ta, verse_refs, reading, status, updated_at';

function readCache(): GospelFaq[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as GospelFaq[] | null;
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

interface FaqState {
  faqs: GospelFaq[];
  /** true once the database has answered at least once (on this phone). */
  fromServer: boolean;
}

const cached = readCache();
export const useFaqs = create<FaqState>(() => ({ faqs: sortFaqs(cached ?? SHIPPED_FAQS), fromServer: Boolean(cached) }));

let running: Promise<void> | null = null;

/** Refresh the published questions (silent when offline or before the migration has been run). */
export function syncFaqs(): Promise<void> {
  running ??= (async () => {
    if (!supabase || !navigator.onLine) return;
    const { data, error } = await supabase.from('gospel_faqs').select(COLUMNS).eq('status', 'published');
    if (error || !data) return;
    const faqs = sortFaqs(data as unknown as GospelFaq[]);
    useFaqs.setState({ faqs, fromServer: true });
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(faqs));
    } catch {
      /* storage full: shown this time, fetched again next time */
    }
  })()
    .catch(() => {})
    .finally(() => (running = null));
  return running;
}

// ---------- Admin ----------

/** Every question, drafts included (admins only; RLS enforces it). */
export async function listAllFaqs(): Promise<GospelFaq[]> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.from('gospel_faqs').select(COLUMNS);
  if (error) throw error;
  return sortFaqs(data as unknown as GospelFaq[]);
}

export async function saveFaq(d: FaqDraft): Promise<GospelFaq> {
  if (!supabase) throw new Error('offline');
  const row = {
    topic: d.topic,
    sort: d.sort,
    question_en: d.question_en.trim(),
    question_ta: d.question_ta.trim(),
    answer_en: d.answer_en.trim(),
    answer_ta: d.answer_ta.trim(),
    verse_refs: d.verse_refs,
    reading: d.reading,
    status: d.status,
  };
  const q = d.id ? supabase.from('gospel_faqs').update(row).eq('id', d.id) : supabase.from('gospel_faqs').insert(row);
  const { data, error } = await q.select(COLUMNS).single();
  if (error) throw error;
  void syncFaqs();
  return data as unknown as GospelFaq;
}

export async function deleteFaq(id: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('gospel_faqs').delete().eq('id', id);
  if (error) throw error;
  void syncFaqs();
}

/** Saves a new order: each question gets sort = its position × 10. */
export async function saveFaqOrder(ids: string[]): Promise<void> {
  if (!supabase) throw new Error('offline');
  const results = await Promise.all(ids.map((id, i) => supabase!.from('gospel_faqs').update({ sort: (i + 1) * 10 }).eq('id', id)));
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  void syncFaqs();
}
