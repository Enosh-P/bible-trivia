import { supabase } from './supabase';
import { useAccount, sendPendingPushes } from './account';
import type { TPerson, TRef, Text, Timeline } from '../engine/timeline';

/*
 * Reader suggestions for the Bible Timeline (table timeline_submissions).
 * Readers send; the admin edits, approves or rejects. Approved ones are merged
 * into the timeline for everyone.
 */

export type SubmissionKind = 'event' | 'person' | 'correction';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/** Years are written the usual way: negative = BC, positive = AD. */
export interface EventData {
  person: string;
  personName: Text;
  y: number;
  approx?: boolean;
  text: Text;
}
export interface PersonData {
  name: Text;
  title: Text;
  cat: string;
  born?: number;
  died?: number;
  active?: Text & { from: number; to: number };
  approx?: boolean;
}
export interface PersonPatch {
  name?: Text;
  title?: Text;
  born?: number;
  died?: number;
  active?: Text & { from: number; to: number };
  approx?: boolean;
}
export interface CorrectionData {
  person: string;
  personName: Text;
  patch: PersonPatch;
}
export type SubmissionData = EventData | PersonData | CorrectionData;

export interface Submission {
  id: string;
  user_id: string;
  kind: SubmissionKind;
  data: SubmissionData;
  explanation: string;
  refs: TRef[];
  status: SubmissionStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  /** Admin list only. */
  added_by?: string;
}

export interface NewSubmission {
  kind: SubmissionKind;
  data: SubmissionData;
  explanation: string;
  refs: TRef[];
}

const me = () => useAccount.getState().session?.user.id;

export async function sendSubmission(s: NewSubmission): Promise<void> {
  if (!supabase || !me()) throw new Error('signed out');
  const { error } = await supabase.from('timeline_submissions').insert({ ...s, user_id: me() });
  if (error) throw error;
}

/** Your own suggestions, newest first. */
export async function mySubmissions(): Promise<Submission[] | null> {
  if (!supabase || !me()) return null;
  const { data, error } = await supabase.from('timeline_submissions').select('*').eq('user_id', me()!).order('created_at', { ascending: false });
  if (error) return null;
  return data as Submission[];
}

export async function deleteSubmission(id: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('timeline_submissions').delete().eq('id', id);
  if (error) throw error;
}

// ---------- admin ----------

export async function listSubmissions(status: SubmissionStatus): Promise<Submission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('timeline_submissions_admin', { p_status: status });
  if (error) throw error;
  return data as Submission[];
}

/** Save the admin's edits and (optionally) the decision. The writer is notified of a decision. */
export async function reviewSubmission(
  id: string,
  patch: Partial<Pick<Submission, 'data' | 'explanation' | 'refs' | 'status' | 'admin_note'>>,
): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('timeline_submissions').update(patch).eq('id', id);
  if (error) throw error;
  if (patch.status) sendPendingPushes();
}

// ---------- approved entries, merged into the timeline ----------

export interface Approved {
  id: string;
  kind: SubmissionKind;
  data: SubmissionData;
  explanation: string;
  refs: TRef[];
  added_by: string;
}

/** Approved suggestions (works signed out). Cached for this visit; null when offline. */
let approved: Promise<Approved[] | null> | null = null;
export function loadApproved(fresh = false): Promise<Approved[] | null> {
  if (!supabase) return Promise.resolve(null);
  if (!approved || fresh) {
    approved = Promise.resolve(supabase.rpc('timeline_approved')).then(({ data, error }) => (error ? null : (data as Approved[])));
    approved.then((a) => a === null && (approved = null));
  }
  return approved;
}

/** The timeline with the approved suggestions added (new people, new events, corrections). */
export function withApproved(tl: Timeline, rows: Approved[]): Timeline {
  const people: TPerson[] = tl.people.map((p) => ({ ...p, events: [...p.events], refs: [...p.refs] }));
  const byId = new Map(people.map((p) => [p.id, p]));
  for (const r of rows) {
    if (r.kind === 'person') {
      const d = r.data as PersonData;
      if (!d.name || !d.cat) continue;
      const p: TPerson = {
        id: `u-${r.id}`,
        cat: d.cat,
        name: d.name,
        title: d.title ?? { en: '', ta: '' },
        born: d.born,
        died: d.died,
        active: d.active,
        approx: d.approx,
        refs: r.refs,
        refText: '',
        events: [],
        addedBy: r.added_by,
        note: r.explanation,
      };
      if ((p.born != null && p.died != null) || p.active) {
        people.push(p);
        byId.set(p.id, p);
      }
    }
  }
  for (const r of rows) {
    if (r.kind === 'event') {
      const d = r.data as EventData;
      const p = byId.get(d.person);
      if (p && d.y && d.text) p.events.push({ ...d.text, y: d.y, approx: d.approx, refs: r.refs, note: r.explanation, addedBy: r.added_by });
    } else if (r.kind === 'correction') {
      const d = r.data as CorrectionData;
      const p = byId.get(d.person);
      if (!p || !d.patch) continue;
      Object.assign(p, d.patch);
      p.correctedBy = [...(p.correctedBy ?? []), r.added_by];
      for (const ref of r.refs) if (!p.refs.some((x) => JSON.stringify(x) === JSON.stringify(ref))) p.refs.push(ref);
    }
  }
  for (const p of people) p.events.sort((a, b) => a.y - b.y);
  return { ...tl, people };
}
