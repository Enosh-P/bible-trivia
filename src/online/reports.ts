import { db } from '../storage/db';
import { supabase } from './supabase';

export type ReportCategory = 'wrong_answer' | 'typo' | 'tamil' | 'confusing' | 'other';
export type ReportKind = 'question' | 'recall' | 'verse' | 'faq' | 'gospel';

export interface ReportTarget {
  kind: ReportKind;
  id: string;
  /** What the player saw: question, options, answer, reference. Shown in the admin email. */
  snapshot: Record<string, string>;
}

export interface Report extends ReportTarget {
  category: ReportCategory;
  lang: 'en' | 'ta';
  reason?: string;
  contact?: string;
}

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || '';

function row(r: Report) {
  return {
    question_id: r.id,
    kind: r.kind,
    category: r.category,
    lang: r.lang,
    reason: r.reason?.slice(0, 1000) || null,
    contact: r.contact?.slice(0, 200) || null,
    snapshot: r.snapshot,
    app_version: __APP_VERSION__,
  };
}

function mailto(r: Report): string {
  const lines = [
    `Problem: ${r.category}`,
    r.reason ? `Details: ${r.reason}` : '',
    '',
    ...Object.entries(r.snapshot).map(([k, v]) => `${k}: ${v}`),
    '',
    `${r.kind} ${r.id} · ${r.lang} · app ${__APP_VERSION__}`,
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(`Bible Trivia report: ${r.id}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * Sends a report to the admin.
 * - With Supabase: stored, and the report-email function mails the admin.
 *   Offline or failing: kept on the device and sent later.
 * - Without Supabase: opens the email app addressed to VITE_ADMIN_EMAIL.
 */
export async function sendReport(r: Report): Promise<'sent' | 'queued' | 'email'> {
  if (supabase) {
    if (navigator.onLine) {
      const { error } = await supabase.from('question_reports').insert(row(r));
      if (!error) return 'sent';
    }
    await db.pendingReports.add({ report: r, at: Date.now() });
    return 'queued';
  }
  if (ADMIN_EMAIL) {
    window.location.href = mailto(r);
    return 'email';
  }
  await db.pendingReports.add({ report: r, at: Date.now() });
  return 'queued';
}

/** Sends reports saved while offline. Call on start and when the device comes online. */
export async function flushReports(): Promise<void> {
  if (!supabase || !navigator.onLine) return;
  const pending = await db.pendingReports.toArray();
  for (const p of pending) {
    const { error } = await supabase.from('question_reports').insert(row(p.report as Report));
    if (!error && p.id !== undefined) await db.pendingReports.delete(p.id);
  }
}

// ---------- What the admin sees in the email ----------
import type { Question } from '../engine/types';
import type { RecallCard } from '../engine/recall';
import type { Faq } from '../engine/gospel';
import type { Verse } from '../engine/verses';
import { formatRef } from '../i18n/books';

export function questionTarget(q: Question): ReportTarget {
  const answer = (lang: 'en' | 'ta') =>
    q.type === 'tf' ? String(q.answer) : (q[lang].options?.[q.answer as number] ?? '');
  return {
    kind: 'question',
    id: q.id,
    snapshot: {
      reference: formatRef('en', q.book, q.chapter, q.verse, q.verseEnd),
      type: q.type,
      question_en: q.en.q,
      ...(q.en.options ? { options_en: q.en.options.join(' | ') } : {}),
      answer_en: answer('en'),
      question_ta: q.ta.q,
      ...(q.ta.options ? { options_ta: q.ta.options.join(' | ') } : {}),
      answer_ta: answer('ta'),
    },
  };
}

export function recallTarget(c: RecallCard): ReportTarget {
  return {
    kind: 'recall',
    id: c.id,
    snapshot: {
      reference: formatRef('en', c.book, c.chapter, c.verse, c.verseEnd),
      question: c.q,
      answer: c.a,
      ...(c.qTa ? { question_ta: c.qTa, answer_ta: c.aTa ?? '' } : {}),
    },
  };
}

export function faqTarget(f: Faq): ReportTarget {
  return { kind: 'faq', id: `faq-${f.id}`, snapshot: { question_en: f.q.en, answer_en: f.a.en, question_ta: f.q.ta, answer_ta: f.a.ta } };
}

export function verseTarget(v: Verse): ReportTarget {
  return { kind: 'verse', id: `verse-${v.id}`, snapshot: { reference: v.id, kjv: v.en, tamil_ov: v.ta } };
}
