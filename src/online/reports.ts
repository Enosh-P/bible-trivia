import { db } from '../storage/db';
import { supabase } from './supabase';

export type ReportCategory = 'wrong_answer' | 'typo' | 'tamil' | 'confusing' | 'other';
export type ReportKind = 'question' | 'recall' | 'verse' | 'faq' | 'gospel' | 'post' | 'comment' | 'timeline';

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
import type { GospelFaq } from '../engine/faqs';
import type { Verse } from '../engine/verses';
import { formatRef } from '../i18n/books';
import type { Post } from '../engine/posts';
import { excerpt } from '../engine/markdown';

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

export function faqTarget(f: Pick<GospelFaq, 'id' | 'question_en' | 'question_ta' | 'answer_en' | 'answer_ta'>): ReportTarget {
  return { kind: 'faq', id: `faq-${f.id}`, snapshot: { question_en: f.question_en, answer_en: f.answer_en, question_ta: f.question_ta, answer_ta: f.answer_ta } };
}

export function verseTarget(v: Verse): ReportTarget {
  return { kind: 'verse', id: `verse-${v.id}`, snapshot: { reference: v.id, kjv: v.en, tamil_ov: v.ta } };
}

/** A Daily Thought (titles and the first words; the whole text is in the posts table). */
export function postTarget(p: Post): ReportTarget {
  return {
    kind: 'post',
    id: `post-${p.id}`,
    snapshot: {
      date: p.publish_on,
      ...(p.verse_ref ? { reference: p.verse_ref } : {}),
      ...(p.title_en ? { title_en: p.title_en } : {}),
      ...(p.body_en ? { text_en: excerpt(p.body_en, 400) } : {}),
      ...(p.title_ta ? { title_ta: p.title_ta } : {}),
      ...(p.body_ta ? { text_ta: excerpt(p.body_ta, 400) } : {}),
    },
  };
}

export function commentTarget(c: { id: string; body: string; display_name: string }): ReportTarget {
  return { kind: 'comment', id: `comment-${c.id}`, snapshot: { name: c.display_name, text: c.body.slice(0, 400) } };
}

export function timelineTarget(e: { id: string; text: string; added_by?: string }): ReportTarget {
  return { kind: 'timeline', id: `timeline-${e.id}`, snapshot: { name: e.added_by ?? '', text: e.text.slice(0, 400) } };
}
