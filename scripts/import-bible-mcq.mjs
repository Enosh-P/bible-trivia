#!/usr/bin/env node
// Imports about 29,000 human-written multiple-choice Bible questions.
//
//   npm run content:mcq                 (downloads the latest)
//   npm run content:mcq -- path/to/dir  (uses local <book>.parquet files)
//   npm run content:mcq -- --merge-only (only adds new Tamil translations to the
//                                        existing files; no downloading)
//
// Source: the "BIBLE" dataset on Hugging Face (MushroomGecko/BIBLE, CC BY 4.0).
// Only questions marked "Obtained directly from the source" are used: Dr. Ted
// Hildebrandt's chapter quizzes on biblicalelearning.org (Gordon College).
// Machine-generated questions in that dataset are used only for books that
// have no human-written ones, and are marked as generated.
//
// Who Said It? questions come from three places, added to each book's file
// and collected in public/packs/mcq/who.json:
//   - the "Who said …?" questions in the set above
//   - content/who/quotes.json: well-known sayings (KJV), written for this app
//   - speeches across the Bible: speakers from Clear Bible's MACULA Quotation
//     and Speaker Data (CC BY 4.0), words from the World English Bible
//     (public domain); see scripts/lib/who-said.mjs
// The sources are downloaded into .cache/sources/ on the first run.
//
// Writes public/packs/mcq/<BOOK>.json, who.json and index.json.
// Tamil translations in content/translations/ta/mcq/<BOOK>.json (made by
// scripts/indictrans2/translate.py --set mcq) are merged in on every run.
//
// Clean-up:
//   - the verse reference at the end of a question, "(Ps. 103:20)", becomes
//     chapter/verse fields and is shown after answering instead
//   - options are shuffled (seeded by the question id, so stable between runs);
//     the source puts most answers in B or C
//   - long questions and options are left out (short questions play better)
//   - "fill the blank" questions ("Diligent hands will ____") become type blank

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parquetReadObjects } from 'hyparquet';
import { buildWhoSaid, WHO_ATTRIBUTION } from './lib/who-said.mjs';

const DATASET = 'MushroomGecko/BIBLE';
const OUT = new URL('../public/packs/mcq/', import.meta.url);
const TA_DIR = new URL('../content/translations/ta/mcq/', import.meta.url);
export const ATTRIBUTION =
  'Multiple-choice questions by Dr. Ted Hildebrandt (biblicalelearning.org), via the BIBLE dataset (MushroomGecko), CC BY 4.0';

const MAX_Q = 150;
const MAX_OPTION = 70;

// ---------- Books ----------
const booksTs = readFileSync(new URL('../src/i18n/books.ts', import.meta.url), 'utf8');
const BOOKS = [...booksTs.matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map((m) => ({ code: m[1], en: m[2] }));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const BY_NAME = Object.fromEntries(BOOKS.map((b) => [norm(b.en), b.code]));
BY_NAME.songofsolomon ??= BY_NAME.songofsongs ?? BOOKS.find((b) => /song/i.test(b.en))?.code;
BY_NAME.psalms ??= BY_NAME.psalm;

/** Dataset folder name ("1_kings", "song_of_solomon") → book code, or null for topic sets. */
export function folderToBook(folder) {
  return BY_NAME[norm(folder)] ?? null;
}

// ---------- Text clean-up ----------
// "(Ps. 103:20)", "(Gen. 1:9)", "(2 Kgs 11:19f)", "(Ps. 87)": a book abbreviation, then chapter[:verse].
const REF = /\s*\((?:[1-3I]\s?)?[A-Za-z][A-Za-z.]*(?:\s[A-Za-z.]+)?\.?\s*(\d+)(?::(\d+))?[^()]*\)/;
// "… in Lamentations 1:1?" (the generated questions)
const INLINE_REF = /\b(?:in|of)\s+(?:[1-3]\s)?[A-Z][a-z]+(?:\s(?:of\s)?[A-Z][a-z]+)?\s(\d+):(\d+)\b/;

/** Takes the verse reference out of a question: "Why …(Ps. 30:1)?" → "Why …?", chapter 30, verse 1. */
export function splitRef(question) {
  const m = REF.exec(question);
  if (!m) {
    const i = INLINE_REF.exec(question);
    return { q: question.replace(/\s+/g, ' ').trim(), chapter: i ? Number(i[1]) : 0, verse: i ? Number(i[2]) : 0 };
  }
  const q = (question.slice(0, m.index) + ' ' + question.slice(m.index + m[0].length))
    .replace(/\s+/g, ' ')
    .replace(/\s+([?.,:;!])/g, '$1')
    .trim();
  return { q, chapter: Number(m[1]) || 0, verse: Number(m[2]) || 0 };
}

const BLANK = /_{2,}/g;

function seeded(id) {
  let h = parseInt(createHash('sha1').update(id).digest('hex').slice(0, 8), 16);
  return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function shuffleOptions(id, options, answer) {
  const order = options.map((_, i) => i);
  const rand = seeded(id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => options[i]), answer: order.indexOf(answer) };
}

const WHO_Q = /^who (said|asked|told|cried( out)?|answered|replied|declared|spoke|wrote|prayed|shouted|exclaimed|commanded|promised|confessed|warned|sang|says|asks|tells|is speaking|was speaking)\b/i;

const ORDER_WORDS = /\b(all|none|both|neither) of the (above|these)\b|\b[A-D] and [A-D]\b/i;

/** One dataset record → compact row, or null if it doesn't suit the game. */
export function toRow(book, rec, usedIds, allowGenerated = false) {
  const generated = !String(rec.qa_extraction).startsWith('Obtained');
  if (generated && !allowGenerated) return null;
  const choices = Array.from(rec.choices ?? [], (c) => String(c).trim());
  if (choices.length < 3 || choices.length > 5 || choices.some((c) => !c)) return null;
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) return null;
  if (choices.some((c) => ORDER_WORDS.test(c))) return null; // would break when shuffled
  const answer = 'ABCDE'.indexOf(String(rec.answer).trim().toUpperCase());
  if (answer < 0 || answer >= choices.length) return null;

  const { q: raw, chapter, verse } = splitRef(String(rec.question));
  const isBlank = /_{2,}/.test(raw);
  let q = raw.replace(BLANK, '____');
  // A question with no closing punctuation gets a question mark.
  if (!isBlank && /^(who|whom|whose|what|which|where|when|why|how|did|does|do|is|was|were|are|can|will)\b/i.test(q) && !/[?.!:]$/.test(q)) q += '?';
  if (q.length < 8 || q.length > MAX_Q || choices.some((c) => c.length > MAX_OPTION)) return null;

  let id = createHash('sha1').update(`${book}|${rec.question}`).digest('base64url').replace(/[-_]/g, '').slice(0, 6);
  while (usedIds.has(id)) id += 'x';
  usedIds.add(id);
  const s = shuffleOptions(id, choices, answer);
  // kind bits: 1 fill the blank, 2 machine-generated, 4 who said it
  const who = WHO_Q.test(q) ? 4 : 0;
  return [id, chapter, verse, (isBlank ? 1 : 0) | (generated ? 2 : 0) | who, q, s.options, s.answer];
}

// ---------- Download ----------
async function readSource() {
  const local = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const files = [];
  if (local) {
    for (const f of readdirSync(local).filter((f) => f.endsWith('.parquet'))) {
      files.push({ folder: f.replace(/\.parquet$/, ''), buf: readFileSync(join(local, f)) });
    }
  } else {
    console.log(`Listing ${DATASET}…`);
    const list = await fetch(`https://huggingface.co/api/datasets/${DATASET}/tree/main?recursive=true`).then((r) => r.json());
    for (const f of list.filter((f) => f.type === 'file' && f.path.endsWith('.parquet'))) {
      const res = await fetch(`https://huggingface.co/datasets/${DATASET}/resolve/main/${f.path}`);
      if (!res.ok) throw new Error(`${f.path}: HTTP ${res.status}`);
      files.push({ folder: f.path.split('/')[0], buf: Buffer.from(await res.arrayBuffer()) });
      process.stdout.write('.');
    }
    console.log();
  }
  return files;
}

const CACHE = new URL('../.cache/sources/', import.meta.url).pathname;

async function download(url, path) {
  if (existsSync(path)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
}

/** Speaker data and World English Bible text, downloaded once. */
async function whoSources() {
  const speakers = join(CACHE, 'speakers');
  const web = join(CACHE, 'web');
  mkdirSync(join(speakers, 'tsv'), { recursive: true });
  mkdirSync(web, { recursive: true });
  const raw = 'https://raw.githubusercontent.com/Clear-Bible/speaker-quotations/main/tsv/';
  await download(raw + 'Clear-Aligned-Projections.tsv', join(speakers, 'tsv/Clear-Aligned-Projections.tsv'));
  await download(raw + 'character_detail.semantic_data.tsv', join(speakers, 'tsv/character_detail.semantic_data.tsv'));
  if (!readdirSync(web).some((f) => f.endsWith('.usfm'))) {
    await download('https://ebible.org/Scriptures/eng-web_usfm.zip', join(CACHE, 'web.zip'));
    execFileSync('unzip', ['-qo', join(CACHE, 'web.zip'), '-d', web]);
  }
  return { speakers, web };
}

/** content/who/quotes.json → rows per book; wrong options from other speakers. */
function curatedQuotes(speakerPool) {
  const file = new URL('../content/who/quotes.json', import.meta.url);
  const { quotes } = JSON.parse(readFileSync(file, 'utf8'));
  const ot = new Set(BOOKS.slice(0, 39).map((b) => b.code));
  const byTestament = { ot: new Set(), nt: new Set() };
  for (const [book, , , , who] of quotes) byTestament[ot.has(book) ? 'ot' : 'nt'].add(who);
  const out = new Map();
  for (const [book, chapter, verse, quote, who] of quotes) {
    const id = 'k' + createHash('sha1').update(`${book}|${quote}`).digest('base64url').replace(/[-_]/g, '').slice(0, 6);
    const rand = seeded(id);
    const near = [...(speakerPool.get(book) ?? [])];
    const wide = [...byTestament[ot.has(book) ? 'ot' : 'nt']];
    const pick = [];
    for (const p of [...near.sort(() => rand() - 0.5), ...wide.sort(() => rand() - 0.5)]) {
      if (pick.length === 3) break;
      if (p !== who && !pick.includes(p) && !p.includes(who) && !who.includes(p)) pick.push(p);
    }
    const s = shuffleOptions(id, [who, ...pick], 0);
    if (!out.has(book)) out.set(book, []);
    out.get(book).push([id, chapter, verse, 4, `“${quote}”`, s.options, s.answer]);
  }
  return out;
}

/** Adds Tamil from content/translations/ta/mcq/ to the existing pack files. */
function addTamil(book, rows) {
  const taFile = new URL(`${book}.json`, TA_DIR);
  const ta = existsSync(taFile) ? JSON.parse(readFileSync(taFile, 'utf8')) : {};
  let tamil = 0;
  for (const row of rows) {
    row.length = 7;
    const t = ta[row[0]];
    if (t?.q && Array.isArray(t.o) && t.o.length === row[5].length && t.o.every(Boolean)) {
      row.push(t.q, t.o);
      tamil++;
    }
  }
  return tamil;
}

function mergeOnly() {
  const index = JSON.parse(readFileSync(new URL('index.json', OUT), 'utf8'));
  const whoRows = [];
  index.tamil = 0;
  for (const book of Object.keys(index.books)) {
    const file = new URL(`${book}.json`, OUT);
    const pack = JSON.parse(readFileSync(file, 'utf8'));
    index.tamil += addTamil(book, pack.rows);
    for (const row of pack.rows) if (row[3] & 4) whoRows.push([book, ...row]);
    writeFileSync(file, JSON.stringify(pack) + '\n');
  }
  writeFileSync(new URL('who.json', OUT), JSON.stringify({ rows: whoRows }) + '\n');
  writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1) + '\n');
  console.log(`Tamil added: ${index.tamil} of ${index.total} questions now have Tamil.`);
}

async function main() {
  if (process.argv.includes('--merge-only')) return mergeOnly();
  const files = await readSource();
  const src = await whoSources();
  const whoSaid = buildWhoSaid(src.speakers, src.web);
  const speakerPool = new Map([...whoSaid].map(([b, rows]) => [b, new Set(rows.map((r) => r[5][r[6]]))]));
  const curated = curatedQuotes(speakerPool);
  const whoRows = [];
  mkdirSync(OUT, { recursive: true });
  const index = { attribution: ATTRIBUTION, license: 'CC BY 4.0', total: 0, tamil: 0, books: {} };
  let skipped = 0;
  const generatedBooks = [];

  for (const { folder, buf } of files) {
    const book = folderToBook(folder);
    if (!book) continue; // People / Places / Measurements: machine-generated, skipped
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const recs = await parquetReadObjects({ file: ab });
    const used = new Set();
    // Human-written questions only, except for books that have none.
    const hasHuman = recs.some((r) => String(r.qa_extraction).startsWith('Obtained'));
    const rows = [];
    for (const rec of recs) {
      const row = toRow(book, rec, used, !hasHuman);
      if (row) rows.push(row);
      else if (String(rec.qa_extraction).startsWith('Obtained')) skipped++;
    }
    if (!hasHuman) generatedBooks.push(book);
    rows.push(...(curated.get(book) ?? []), ...(whoSaid.get(book) ?? []));
    rows.sort((a, b) => a[1] - b[1] || a[2] - b[2]);

    const tamil = addTamil(book, rows);

    if (!rows.length) continue;
    for (const row of rows) if (row[3] & 4) whoRows.push([book, ...row]);
    writeFileSync(new URL(`${book}.json`, OUT), JSON.stringify({ book, rows }) + '\n');
    index.books[book] = rows.length;
    index.total += rows.length;
    index.tamil += tamil;
  }

  // Canonical book order in the index.
  index.generated = generatedBooks;
  index.books = Object.fromEntries(BOOKS.filter((b) => index.books[b.code]).map((b) => [b.code, index.books[b.code]]));
  writeFileSync(new URL('who.json', OUT), JSON.stringify({ rows: whoRows }) + '\n');
  index.who = whoRows.length;
  index.whoAttribution = WHO_ATTRIBUTION;
  writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1) + '\n');
  console.log(`Wrote ${index.total} questions in ${Object.keys(index.books).length} books (${index.tamil} with Tamil, ${whoRows.length} Who Said It). Left out ${skipped} long or unsuitable ones.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
