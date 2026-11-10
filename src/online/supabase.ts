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

const PAGE = 1000;

/**
 * Pulls questions published or edited since the last sync and keeps them in
 * IndexedDB, so new content reaches players without an app update and still
 * works offline. Pages through the whole bank (10,000+ questions) and drops
 * questions that reviewers have withdrawn. Safe to call on every start;
 * failures are silent and the next start resumes from the last saved point.
 */
export async function syncQuestions(): Promise<number> {
  if (!supabase || !navigator.onLine) return 0;
  let since = '1970-01-01T00:00:00Z';
  try {
    since = localStorage.getItem(SYNC_KEY) ?? since;
  } catch {
    /* storage blocked */
  }
  const startedFrom = since;
  let total = 0;

  // Keyset paging on (updated_at, id) so rows sharing a timestamp are never skipped.
  let lastId = '';
  for (;;) {
    let query = supabase.from('questions').select('*').order('updated_at').order('id').limit(PAGE);
    query = lastId
      ? query.or(`updated_at.gt.${since},and(updated_at.eq.${since},id.gt.${lastId})`)
      : query.gt('updated_at', since);
    const { data, error } = await query;
    if (error || !data?.length) break;
    const rows = data as QuestionRow[];
    await db.remoteQuestions.bulkPut(rows.map(toQuestion));
    total += rows.length;
    const last = rows[rows.length - 1];
    since = last.updated_at;
    lastId = last.id;
    try {
      localStorage.setItem(SYNC_KEY, since);
    } catch {
      /* storage blocked */
    }
    if (rows.length < PAGE) break;
  }

  // Questions taken out of circulation since the last sync.
  const { data: withdrawn } = await supabase.rpc('withdrawn_question_ids', { p_since: startedFrom });
  if (withdrawn?.length) {
    const ids = (withdrawn as { id: string }[]).map((r) => r.id);
    await db.remoteQuestions.bulkDelete(ids);
    await db.withdrawn.bulkPut(ids.map((id) => ({ id })));
  }
  // A question published again comes back.
  if (total) await db.withdrawn.bulkDelete((await db.remoteQuestions.toCollection().primaryKeys()) as string[]);

  return total;
}
