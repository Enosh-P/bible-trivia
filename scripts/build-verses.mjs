#!/usr/bin/env node
// Builds content/verses.json (Verse of the Day, memory verses, gospel) from
// content/verse-list.txt: 365 references, one per day of the year.
//
//   npm run content:verses                      (downloads the Bible text)
//   npm run content:verses -- path/to/sources   (folder with Bible-kjv/ and Bible-tamil/ clones)
//
// Words:
//   English: King James Version (public domain), from github.com/aruljohn/Bible-kjv
//   Tamil:   Tamil O.V. (Bible Society of India), from github.com/aruljohn/Bible-tamil.
//            BSI allows quoting up to 1,000 verses without written permission when
//            credited "BSI – Tamil – O.V." (shown in the app).
//
// The list may hold more than 365 references: the longest verses are left out
// first (short verses fit the card and notifications best). Verses the gospel
// section uses are always kept.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DAYS = 365;
const ROOT = new URL('../', import.meta.url);
const list = readFileSync(new URL('content/verse-list.txt', ROOT), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const booksTs = readFileSync(new URL('src/i18n/books.ts', ROOT), 'utf8');
const EN_NAME = Object.fromEntries([...booksTs.matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map((m) => [m[1], m[2]]));

const SOURCES = {
  kjv: { repo: 'aruljohn/Bible-kjv', branch: 'master', file: (en) => (en === 'Song of Solomon' ? 'SongofSolomon' : en.replace(/ /g, '')) },
  tamil: { repo: 'aruljohn/Bible-tamil', branch: 'main', file: (en) => (en === 'Song of Solomon' ? 'Song of Songs' : en) },
};

const cache = new Map();
async function book(source, code) {
  const key = `${source}:${code}`;
  if (!cache.has(key)) {
    const s = SOURCES[source];
    const name = `${s.file(EN_NAME[code])}.json`;
    const local = process.argv[2] && join(process.argv[2], s.repo.split('/')[1], name);
    let data;
    if (local && existsSync(local)) data = JSON.parse(readFileSync(local, 'utf8'));
    else {
      const res = await fetch(`https://raw.githubusercontent.com/${s.repo}/${s.branch}/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`${s.repo} ${name}: HTTP ${res.status}`);
      data = await res.json();
    }
    const verses = new Map();
    for (const ch of data.chapters) for (const v of ch.verses) verses.set(`${Number(ch.chapter)}:${Number(v.verse)}`, v.text);
    cache.set(key, verses);
  }
  return cache.get(key);
}

const tidy = (s) => s.replace(/\s+/g, ' ').trim();

async function main() {
  const gospel = JSON.parse(readFileSync(new URL('content/gospel.json', ROOT), 'utf8'));
  const keep = new Set(JSON.stringify(gospel).match(/[0-9A-Z]{3}\.\d+\.\d+/g) ?? []);

  const verses = [];
  const seen = new Set();
  for (const id of list) {
    const m = /^([0-9A-Z]{3})\.(\d+)\.(\d+)$/.exec(id);
    if (!m || !EN_NAME[m[1]]) throw new Error(`Bad reference: ${id}`);
    if (seen.has(id)) throw new Error(`Listed twice: ${id}`);
    seen.add(id);
    const [, code, c, v] = m;
    const en = (await book('kjv', code)).get(`${Number(c)}:${Number(v)}`);
    const ta = (await book('tamil', code)).get(`${Number(c)}:${Number(v)}`);
    if (!en || !ta) throw new Error(`Not found: ${id} (${!en ? 'English' : 'Tamil'})`);
    verses.push({ id, book: code, chapter: Number(c), verse: Number(v), en: tidy(en), ta: tidy(ta) });
  }

  // Too many: leave out the longest (never one the gospel section uses).
  const drop = new Set(
    verses
      .filter((v) => !keep.has(v.id))
      .sort((a, b) => b.en.length - a.en.length)
      .slice(0, Math.max(0, verses.length - DAYS))
      .map((v) => v.id),
  );
  const out = verses.filter((v) => !drop.has(v.id));

  writeFileSync(
    new URL('content/verses.json', ROOT),
    JSON.stringify(
      {
        _note: 'Built by scripts/build-verses.mjs from content/verse-list.txt. English: KJV (public domain). Tamil: BSI Tamil O.V. (Bible Society of India), quoted with credit.',
        verses: out,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Wrote ${out.length} verses (${drop.size} longer ones left out). Next: npm run db:setup-sql`);
}

await main();
