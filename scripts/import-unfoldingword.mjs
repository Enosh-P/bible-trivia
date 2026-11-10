#!/usr/bin/env node
// Imports unfoldingWord Translation Questions: about 17,000 human-written
// questions with answers, covering every chapter of the Bible.
//
//   node scripts/import-unfoldingword.mjs              (downloads the latest)
//   node scripts/import-unfoldingword.mjs path/to/en_tq   (uses a local copy)
//
// Writes public/packs/uw/<BOOK>.json (loaded by the app's Recall mode, one book
// at a time, and kept offline) and public/packs/uw/index.json (counts per book).
// The question and answer text is kept exactly as written.
//
// Source: unfoldingWord® Translation Questions, CC BY-SA 4.0.
// "The original work by unfoldingWord is available from unfoldingword.org/utq"

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ZIP = 'https://git.door43.org/unfoldingWord/en_tq/archive/master.zip';
const OUT = new URL('../public/packs/uw/', import.meta.url);
export const ATTRIBUTION = 'Translation Questions, original work by unfoldingWord (unfoldingword.org/utq), CC BY-SA 4.0';

async function sourceDir() {
  const given = process.argv[2];
  if (given) return given;
  const tmp = mkdtempSync(join(tmpdir(), 'uw-tq-'));
  const zip = join(tmp, 'en_tq.zip');
  console.log('Downloading unfoldingWord Translation Questions…');
  const res = await fetch(URL_ZIP);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-q', zip, '-d', tmp]);
  return join(tmp, 'en_tq');
}

/** "1:7-8" → { chapter: 1, verse: 7, verseEnd: 8 }; "3:16" → { chapter: 3, verse: 16 }. */
export function parseRef(ref) {
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(ref.trim());
  if (!m) return null;
  return { chapter: Number(m[1]), verse: Number(m[2]), ...(m[3] ? { verseEnd: Number(m[3]) } : {}) };
}

/** Parses one tq_<BOOK>.tsv file into compact rows [id, chapter, verse, verseEnd, question, answer]. */
export function parseTsv(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  const header = lines[0].split('\t');
  const col = (name) => header.indexOf(name);
  const [iRef, iId, iQ, iA] = [col('Reference'), col('ID'), col('Question'), col('Response')];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const f = line.split('\t');
    const ref = parseRef(f[iRef] ?? '');
    const q = (f[iQ] ?? '').trim();
    const a = (f[iA] ?? '').trim();
    if (!ref || !q || !a) continue;
    rows.push([f[iId], ref.chapter, ref.verse, ref.verseEnd ?? 0, q, a]);
  }
  return rows;
}

async function main() {
  const dir = await sourceDir();
  if (!existsSync(join(dir, 'tq_GEN.tsv'))) throw new Error(`no tq_*.tsv files in ${dir}`);
  mkdirSync(OUT, { recursive: true });
  const index = {};
  let total = 0;
  for (const file of readdirSync(dir).filter((f) => /^tq_[0-9A-Z]{3}\.tsv$/.test(f))) {
    const book = file.slice(3, 6);
    const rows = parseTsv(readFileSync(join(dir, file), 'utf8'));
    // Compact format keeps the download small: one array per question.
    writeFileSync(
      new URL(`${book}.json`, OUT),
      JSON.stringify({ book, fields: ['id', 'chapter', 'verse', 'verseEnd', 'q', 'a'], rows }),
    );
    index[book] = rows.length;
    total += rows.length;
  }
  writeFileSync(new URL('index.json', OUT), JSON.stringify({ attribution: ATTRIBUTION, license: 'CC BY-SA 4.0', updated: new Date().toISOString().slice(0, 10), total, books: index }, null, 2) + '\n');
  console.log(`Imported ${total} questions from ${Object.keys(index).length} books into public/packs/uw/.`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
