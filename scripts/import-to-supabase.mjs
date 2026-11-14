#!/usr/bin/env node
// Imports into Supabase:
//   - content/books/*.json   new quiz questions, as status 'review'
//   - public/packs/uw/*.json the ~17,000 human-written Recall questions, as 'published'
//   - per-book targets
//
//   npm run db:import [-- --books GEN,EXO] [-- --no-recall] [-- --dry-run]
//   (reads SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local)
//
// The database is the source of truth: questions that already exist there are
// left untouched (reviewers may have edited or published them). Only new ids
// are inserted, so running it again is safe.
// The secret key bypasses security rules: keep it in your shell or an
// untracked .env.local file, never in the app or the repo.

import { createClient } from '@supabase/supabase-js';
import { projectUrl } from './lib/supabase-url.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PRIORITY, bookTarget, chapterCount } from './lib/targets.mjs';
import { problems } from './lib/validate.mjs';

const ROOT = new URL('..', import.meta.url);
const DIR = new URL('content/books/', ROOT);
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const withRecall = !args.includes('--no-recall');
const only = args.includes('--books') ? args[args.indexOf('--books') + 1].split(',').map((s) => s.toUpperCase()) : null;

const url = projectUrl(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL);
// Secret key (sb_secret_...); the legacy service_role key also works.
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!url || !key)) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (Supabase → Project Settings → API Keys).');
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

// Recall questions: human-written, already reviewed by their publisher.
const UW = new URL('public/packs/uw/', ROOT);
let recallCount = 0;
// Tamil machine translations (npm run translate:recall), applied where Tamil is still empty.
const tamil = [];
if (withRecall && existsSync(new URL('index.json', UW))) {
  const { attribution, license } = JSON.parse(readFileSync(new URL('index.json', UW), 'utf8'));
  for (const f of readdirSync(UW).filter((n) => /^[0-9A-Z]{3}\.json$/.test(n))) {
    const { book, rows: packRows } = JSON.parse(readFileSync(new URL(f, UW), 'utf8'));
    if (only && !only.includes(book)) continue;
    for (const [id, chapter, verse, verseEnd, q, a, qTa, aTa] of packRows) {
      const ta = qTa && aTa ? { q: qTa, a: aTa } : null;
      if (ta) tamil.push({ id: `uw-${book}-${id}`, ta });
      rows.push({
        id: `uw-${book}-${id}`,
        type: 'recall',
        book_code: book,
        chapter,
        verse: verse || null,
        verse_end: verseEnd || null,
        difficulty: 2,
        answer: null,
        en: { q, a },
        ta,
        ta_status: ta ? 'machine' : null,
        art: null,
        tags: [],
        status: 'published',
        source: 'imported',
        attribution,
        license,
      });
      recallCount++;
    }
  }
}

const targets = PRIORITY.map((code, i) => ({ book_code: code, target: bookTarget(code), priority: i + 1 }));
console.log(`${rows.length - recallCount} quiz questions from ${files.length} book files (${invalid} invalid skipped), ${recallCount} Recall questions (${tamil.length} with Tamil), ${targets.length} book targets.`);
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
console.log(`\nInserted ${inserted} new questions; ${rows.length - inserted} already existed and were left as they are.`);

// Tamil for questions that already existed without it, or whose machine Tamil has been
// corrected since. A reviewer's Tamil is never replaced.
let tamilFilled = 0;
for (let i = 0; i < tamil.length; i += 1000) {
  const { data, error } = await db.rpc('apply_machine_tamil', { p: tamil.slice(i, i + 1000) });
  if (error) throw new Error(`Tamil ${i}: ${error.message} (run supabase/setup.sql again to add the Tamil migration)`);
  tamilFilled += data ?? 0;
}
if (tamil.length) console.log(`Tamil added or corrected on ${tamilFilled} existing questions (Tamil a person has reviewed is left as it is).`);
console.log('New quiz questions wait as status = review: approve them in Supabase → Table editor → questions. Recall questions are published straight away.');
