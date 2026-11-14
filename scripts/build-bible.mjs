#!/usr/bin/env node
// Builds public/packs/bible/<BOOK>.json: the whole text of each book in English
// (KJV, public domain) and Tamil (BSI O.V.), so any question can show its verse.
// The app downloads a book only when a verse from it is needed, then keeps it offline.
//
//   npm run content:bible                       (downloads the text)
//   npm run content:bible -- path/to/sources    (folder with Bible-kjv/ and Bible-tamil/ clones)
//
// Sources: github.com/aruljohn/Bible-kjv and github.com/aruljohn/Bible-tamil.
// File format: { "en": [[ch1 v1, v2, …], [ch2 …]], "ta": [[…]] }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('public/packs/bible/', ROOT);
const booksTs = readFileSync(new URL('src/i18n/books.ts', ROOT), 'utf8');
const BOOKS = [...booksTs.matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map((m) => ({ code: m[1], en: m[2] }));

const SOURCES = {
  en: { repo: 'aruljohn/Bible-kjv', branch: 'master', file: (en) => (en === 'Song of Solomon' ? 'SongofSolomon' : en.replace(/ /g, '')) },
  ta: { repo: 'aruljohn/Bible-tamil', branch: 'main', file: (en) => (en === 'Song of Solomon' ? 'Song of Songs' : en) },
};

async function read(lang, en) {
  const s = SOURCES[lang];
  const name = `${s.file(en)}.json`;
  const local = process.argv[2] && join(process.argv[2], s.repo.split('/')[1], name);
  if (local && existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
  const res = await fetch(`https://raw.githubusercontent.com/${s.repo}/${s.branch}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`${s.repo} ${name}: HTTP ${res.status}`);
  return res.json();
}

const tidy = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

/** [[chapter 1 verses], [chapter 2 verses], …] with verse n at index n-1. */
function chapters(data) {
  const out = [];
  for (const ch of data.chapters) {
    const verses = [];
    for (const v of ch.verses) verses[Number(v.verse) - 1] = tidy(v.text);
    out[Number(ch.chapter) - 1] = Array.from(verses, (v) => v ?? '');
  }
  return Array.from(out, (c) => c ?? []);
}

mkdirSync(OUT, { recursive: true });
let total = 0;
for (const b of BOOKS) {
  const [en, ta] = await Promise.all([read('en', b.en), read('ta', b.en)]);
  const pack = { en: chapters(en), ta: chapters(ta) };
  total += pack.en.reduce((n, c) => n + c.length, 0);
  writeFileSync(new URL(`${b.code}.json`, OUT), JSON.stringify(pack) + '\n');
}
console.log(`Wrote ${BOOKS.length} books, ${total} verses, to public/packs/bible/.`);
