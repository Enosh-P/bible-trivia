#!/usr/bin/env node
// Backs up every question from Supabase into content/books/*.json, including
// reviewers' edits and statuses, so git always has a copy and the generator
// does not repeat questions that exist only in the database.
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/export-from-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const DIR = new URL('../content/books/', import.meta.url);
mkdirSync(DIR, { recursive: true });

const byBook = {};
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('questions').select('*').like('id', '___-___-%').order('id').range(from, from + 999);
  if (error) throw new Error(error.message);
  for (const r of data) {
    (byBook[r.book_code] ??= []).push({
      id: r.id,
      type: r.type,
      book: r.book_code,
      chapter: r.chapter,
      ...(r.verse != null ? { verse: r.verse } : {}),
      ...(r.verse_end != null ? { verseEnd: r.verse_end } : {}),
      difficulty: r.difficulty,
      answer: r.answer,
      en: r.en,
      ta: r.ta,
      ...(r.art ? { art: r.art } : {}),
      source: r.source,
      status: r.status,
      ...(r.attribution ? { attribution: r.attribution } : {}),
      ...(r.license ? { license: r.license } : {}),
    });
  }
  if (data.length < 1000) break;
}
for (const [book, questions] of Object.entries(byBook)) {
  writeFileSync(new URL(`${book}.json`, DIR), JSON.stringify({ book, questions }, null, 2) + '\n');
}
console.log(`Exported ${Object.values(byBook).flat().length} questions into ${Object.keys(byBook).length} book files.`);
