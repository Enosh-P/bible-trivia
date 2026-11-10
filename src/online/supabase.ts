import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Question } from '../engine/types';
import { db } from '../storage/db';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. The app works fully without it. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

const SYNC_KEY = 'bt-questions-synced-at';

interface QuestionRow {
  id: string;
  type: Question['type'];
  book_code: string;
  chapter: number;
  verse: number | null;
  verse_end: number | null;
  difficulty: Question['difficulty'];
  answer: Question['answer'];
  en: Question['en'];
  ta: Question['ta'];
  art: Question['art'] | null;
  tags: string[];
  status: string;
  updated_at: string;
}

function toQuestion(r: QuestionRow): Question {
  return {
    id: r.id,
    type: r.type,
    book: r.book_code,
    chapter: r.chapter,
    verse: r.verse ?? undefined,
    verseEnd: r.verse_end ?? undefined,
    difficulty: r.difficulty,
    answer: r.answer,
    en: r.en,
    ta: r.ta,
    art: r.art ?? undefined,
    tags: r.tags,
  };
}

/**
 * Pulls questions published or edited since the last sync and keeps them in
 * IndexedDB, so new content reaches players without an app update and still
 * works offline. Safe to call on every start; failures are silent.
 */
export async function syncQuestions(): Promise<number> {
  if (!supabase || !navigator.onLine) return 0;
  let since = '1970-01-01T00:00:00Z';
  try {
    since = localStorage.getItem(SYNC_KEY) ?? since;
  } catch {
    /* storage blocked */
  }
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .gt('updated_at', since)
    .order('updated_at')
    .limit(1000);
  if (error || !data?.length) return 0;
  const rows = data as QuestionRow[];
  await db.remoteQuestions.bulkPut(rows.map(toQuestion));
  try {
    localStorage.setItem(SYNC_KEY, rows[rows.length - 1].updated_at);
  } catch {
    /* storage blocked */
  }
  return rows.length;
}

/** Lets a player flag a confusing or wrong question. */
export async function reportQuestion(questionId: string, lang: 'en' | 'ta', reason: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('question_reports').insert({ question_id: questionId, lang, reason: reason.slice(0, 500) });
  return !error;
}
