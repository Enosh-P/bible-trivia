#!/usr/bin/env node
// Translates the Recall questions and answers into Tamil with Google Cloud
// Translation, keeping Bible names in their Tamil Bible spelling.
//
//   npm run translate:recall -- --books GEN,EXO     (specific books)
//   npm run translate:recall -- --top 11            (the popular books first)
//   npm run translate:recall                         (everything)
//   add --dry-run to see what it would translate and cost, without calling Google
//
// Needs GOOGLE_TRANSLATE_API_KEY in .env.local (Google Cloud → APIs & Services →
// Credentials; enable "Cloud Translation API" first).
//
// Progress is saved per book in content/translations/ta/recall/<BOOK>.json, so a
// stopped run picks up where it left off and nothing is paid for twice. Each
// finished book is also written into public/packs/uw/<BOOK>.json for the app.
// Then `npm run db:import` puts the Tamil into Supabase (only where it is still empty).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { protectNames } from './lib/glossary.mjs';

const ROOT = new URL('..', import.meta.url);
const PACKS = new URL('public/packs/uw/', ROOT);
const OUT = new URL('content/translations/ta/recall/', ROOT);
// GOOGLE_TRANSLATE_ENDPOINT is only for tests (a local stand-in server).
const ENDPOINT = process.env.GOOGLE_TRANSLATE_ENDPOINT ?? 'https://translation.googleapis.com/language/translate/v2';
const PRICE_PER_CHAR = 20 / 1e6; // after the first 500,000 free characters each month
const BATCH = 100; // strings per request (the API allows up to 128)
const POPULAR = ['GEN', 'EXO', 'PSA', 'PRO', 'DAN', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'REV'];

const args = process.argv.slice(2);
const flag = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const dryRun = args.includes('--dry-run');

const allBooks = readdirSync(PACKS).filter((f) => /^[0-9A-Z]{3}\.json$/.test(f)).map((f) => f.slice(0, 3));
let books = allBooks;
if (flag('books')) books = flag('books').split(',').map((b) => b.trim().toUpperCase());
else if (flag('top')) books = [...POPULAR, ...allBooks.filter((b) => !POPULAR.includes(b))].slice(0, Number(flag('top')));

const key = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!dryRun && !key) {
  console.error('Set GOOGLE_TRANSLATE_API_KEY in .env.local (or run with --dry-run).');
  process.exit(1);
}

/** Google's response sometimes keeps a stray space before Tamil punctuation; tidy it. */
function tidy(s) {
  return s.replace(/\s+([,.;:?!])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}

async function translate(texts) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({ q: texts, source: 'en', target: 'ta', format: 'text' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Translation API ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.data.translations.map((t) => tidy(t.translatedText));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateWithRetry(texts) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await translate(texts);
    } catch (e) {
      // 429/5xx: wait and retry; anything else is a real error (bad key, API not enabled).
      if (attempt >= 5 || !/ (429|500|502|503|504):/.test(e.message)) throw e;
      await sleep(2000 * 2 ** attempt);
    }
  }
}

// Clear messages instead of a stack trace for the usual setup problems.
process.on('uncaughtException', (e) => {
  const m = String(e.message);
  if (/ 403:| 400:.*API key/i.test(m)) console.error(`\n❌ Google refused the key. Check GOOGLE_TRANSLATE_API_KEY, and that "Cloud Translation API" is enabled and billing is on for the project.\n   (${m.slice(0, 160)})`);
  else if (/ 429:/.test(m)) console.error('\n❌ Google quota reached. Wait a while and run the same command again; finished work is kept.');
  else console.error(`\n❌ ${m}`);
  console.error('Progress so far is saved; running the same command again continues from here.');
  process.exit(1);
});

let totalChars = 0;
let totalNew = 0;
mkdirSync(OUT, { recursive: true });

for (const book of books) {
  const packFile = new URL(`${book}.json`, PACKS);
  if (!existsSync(packFile)) {
    console.warn(`${book}: no pack, skipped`);
    continue;
  }
  const pack = JSON.parse(readFileSync(packFile, 'utf8'));
  const outFile = new URL(`${book}.json`, OUT);
  const done = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};

  const todo = pack.rows.filter(([id]) => !done[id]);
  const strings = todo.flatMap(([, , , , q, a]) => [protectNames(q), protectNames(a)]);
  const chars = strings.reduce((n, s) => n + s.length, 0);
  totalChars += chars;
  if (!todo.length) {
    console.log(`${book}: already translated (${pack.rows.length})`);
  } else if (dryRun) {
    console.log(`${book}: ${todo.length} questions to translate, ${chars} characters`);
    continue;
  } else {
    process.stdout.write(`${book}: translating ${todo.length} questions… `);
    for (let i = 0; i < strings.length; i += BATCH) {
      const out = await translateWithRetry(strings.slice(i, i + BATCH));
      for (let j = 0; j < out.length; j += 2) {
        const row = todo[(i + j) / 2];
        done[row[0]] = { q: out[j], a: out[j + 1] };
      }
      // Save after every batch, so an interrupted run loses nothing.
      writeFileSync(outFile, JSON.stringify(done, null, 1) + '\n');
    }
    totalNew += todo.length;
    console.log('done');
  }

  // Put the Tamil into the app's pack: [id, chapter, verse, verseEnd, q, a, qTa, aTa]
  pack.fields = ['id', 'chapter', 'verse', 'verseEnd', 'q', 'a', 'qTa', 'aTa'];
  pack.rows = pack.rows.map((r) => {
    const t = done[r[0]];
    return t ? [...r.slice(0, 6), t.q, t.a] : r.slice(0, 6);
  });
  pack.ta = 'machine'; // Google translation with Tamil Bible names; not yet reviewed
  writeFileSync(packFile, JSON.stringify(pack));
}

const cost = Math.max(0, totalChars - 500000) * PRICE_PER_CHAR;
console.log(
  dryRun
    ? `\n${totalChars} characters to translate. Estimated cost: $${cost.toFixed(2)} (the first 500,000 characters each month are free).`
    : `\nTranslated ${totalNew} questions (${totalChars} characters). Next: npm run db:import to put the Tamil into Supabase.`,
);
