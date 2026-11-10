#!/usr/bin/env node
// Imports content/books/*.json into Supabase, plus the per-book targets.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/import-to-supabase.mjs [--books GEN,EXO] [--dry-run]
//
// The database is the source of truth: questions that already exist there are
// left untouched (reviewers may have edited or published them). Only new ids
// are inserted, always as status 'review'.
// The service-role key bypasses security rules: keep it in your shell or an
// untracked .env.local file, never in the app or the repo.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PRIORITY, bookTarget, chapterCount } from './lib/targets.mjs';
import { problems } from './lib/validate.mjs';

const ROOT = new URL('..', import.meta.url);
const DIR = new URL('content/books/', ROOT);
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--books') ? args[args.indexOf('--books') + 1].split(',').map((s) => s.toUpperCase()) : null;

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API).');
  process.exit(1);
}

const CHAPTERS = Object.fromEntries(PRIORITY.map((b) => [b, chapterCount(b)]));
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json')) : [];
const rows = [];
let invalid = 0;
for (const f of files) {
  const { book, questions } = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
  if (only && !only.includes(book)) continue;
  for (const q of questions) {
    const issues = problems(q, CHAPTERS);
    if (issues.length) {
      invalid++;
      console.warn(`skip ${q.id}: ${issues.join('; ')}`);
      continue;
    }
    rows.push({
      id: q.id,
      type: q.type,
      book_code: q.book,
      chapter: q.chapter,
      verse: q.verse ?? null,
      verse_end: q.verseEnd ?? null,
      difficulty: q.difficulty,
      answer: q.answer,
      en: q.en,
      ta: q.ta,
      art: q.art ?? null,
      tags: q.tags ?? [],
      status: 'review',
      source: q.source ?? 'manual',
      attribution: q.attribution ?? null,
      license: q.license ?? null,
    });
  }
}

const targets = PRIORITY.map((code, i) => ({ book_code: code, target: bookTarget(code), priority: i + 1 }));
console.log(`${rows.length} questions from ${files.length} book files (${invalid} invalid skipped); ${targets.length} book targets.`);
if (dryRun) process.exit(0);

const db = createClient(url, key, { auth: { persistSession: false } });

const { error: tErr } = await db.from('book_targets').upsert(targets, { onConflict: 'book_code' });
if (tErr) throw new Error(`book_targets: ${tErr.message}`);

let inserted = 0;
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500);
  const { data, error } = await db
    .from('questions')
    .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`questions ${i}–${i + chunk.length}: ${error.message}`);
  inserted += data?.length ?? 0;
  process.stdout.write(`\r${Math.min(i + 500, rows.length)}/${rows.length}`);
}
console.log(`\nInserted ${inserted} new questions as 'review'; ${rows.length - inserted} already existed and were left as they are.`);
console.log('Review them in Supabase → Table editor → questions (filter status = review), set status to published when approved.');
