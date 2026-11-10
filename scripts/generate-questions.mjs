#!/usr/bin/env node
// Generates bilingual (English + Tamil) Bible trivia questions with Claude,
// one request per chapter, and saves them for human review.
//
//   node scripts/generate-questions.mjs plan    [--books GEN,EXO | --top 11]
//   node scripts/generate-questions.mjs try     --book GEN --chapter 1
//   node scripts/generate-questions.mjs submit  [--books ... | --top N] [--chapters 1-10] [--effort high]
//   node scripts/generate-questions.mjs collect [batch_id]          (default: the latest batch)
//
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). `plan` runs without it.
// Output: content/books/<BOOK>.json with every new question marked status "review".
// Nothing reaches players until a reviewer publishes it in Supabase.

import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PRIORITY, chapterCount, chapterTarget } from './lib/targets.mjs';
import { ART_KEYS, fingerprint, problems } from './lib/validate.mjs';

const ROOT = new URL('..', import.meta.url);
// BT_BOOKS_DIR lets tests write somewhere harmless.
const BOOKS_DIR = process.env.BT_BOOKS_DIR ? pathToFileURL(process.env.BT_BOOKS_DIR.replace(/\/?$/, '/')) : new URL('content/books/', ROOT);
const WORK_DIR = new URL('.generator/', ROOT); // batch manifests and rejects (git-ignored)
const MODEL = 'claude-opus-5-5';

// Batch prices for Claude Opus 5.5 (50% of $4 / $20 per million tokens).
const PRICE_IN = 2 / 1e6;
const PRICE_OUT = 10 / 1e6;
// Rough averages for the estimate: one Tamil+English question with reasoning.
const EST_OUT_PER_Q = 900;
const EST_IN_PER_REQ = 5500;

// ---------- Book names (one source: src/i18n/books.ts) ----------
const booksSrc = readFileSync(new URL('src/i18n/books.ts', ROOT), 'utf8');
const BOOK_ROWS = [...booksSrc.matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map(([, code, en, ta]) => ({ code, en, ta }));
const BOOK = Object.fromEntries(BOOK_ROWS.map((b) => [b.code, b]));
const CHAPTERS = Object.fromEntries(BOOK_ROWS.map((b) => [b.code, chapterCount(b.code)]));

// ---------- Existing questions ----------
function readJson(url, fallback) {
  return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : fallback;
}
function bookFile(book) {
  return new URL(`${book}.json`, BOOKS_DIR);
}
function loadBook(book) {
  return readJson(bookFile(book), { book, questions: [] });
}
function starterQuestions() {
  const dir = new URL('content/packs/', ROOT);
  return readdirSync(dir).flatMap((f) => readJson(new URL(f, dir), { questions: [] }).questions);
}
function existingFor(book, chapter) {
  return [...starterQuestions(), ...loadBook(book).questions].filter((q) => q.book === book && q.chapter === chapter);
}

// ---------- Prompt ----------
const SYSTEM = `You write Bible trivia questions for a bilingual (English + Tamil) quiz app used by families, youth groups and churches in Tamil Nadu, Sri Lanka and the Tamil diaspora.

## What makes a good question
- It is about a fact clearly stated in the chapter you are given. Never rely on tradition, films, or later church history.
- It has exactly one defensible answer. No trick wording, no "all of the above", no opinions.
- Wrong options are plausible and from the same category (people with people, numbers with numbers, places with places), and are real Bible names where possible.
- It is respectful and suitable for children. Avoid denominational controversies and graphic detail.
- Spread difficulty: about 40% easy (1, well-known story facts), 40% medium (2, details a regular reader knows), 20% hard (3, specific details).
- Vary where the correct answer sits (answerIndex 0-3), so it is not always the same position.
- Do not repeat or rephrase any existing question you are shown.

## Question types (mix them; skip a type the chapter does not suit)
- "mcq": general multiple choice (most questions).
- "tf": a true/false statement. Make about half of them false, with a believable mistake (wrong number, wrong person, wrong place). Set answerTrue; answerIndex null; options empty arrays.
- "who": "Who said it?" The question is a short quotation (under 25 words) of words spoken in this chapter; options are speakers.
- "book": "Which book?" Use at most one per chapter, only for a famous event; options are four Bible book names written exactly as in the table below.
- "blank": fill the blank in a short verse (under 25 words) from this chapter. Replace one key word with ____ in both languages; options are four words that fit the gap grammatically.

## Languages
- English: plain modern English for questions and explanations; quotations use the King James Version wording.
- Tamil: natural, respectful Tamil as used in Tamil churches. Use the names and terms of the Tamil Bible (BSI Old Version): தேவன், கர்த்தர், இயேசு, மோசே, ஆபிரகாம், தாவீது, பேதுரு, பவுல், etc. Quotations follow the BSI O.V. wording as closely as you reliably can; if unsure of the exact O.V. wording, choose a different verse.
- The Tamil question must ask the same thing as the English one, and options must be in the same order in both languages, so answerIndex is shared.
- Each explanation is one short sentence (under 30 words) saying why the answer is right; include the verse number if helpful.

## Other fields
- verse: the verse number that answers the question (verseEnd only for a range), or null for a chapter-wide fact.
- art: one of ${ART_KEYS.join(', ')} only when the question is clearly about that picture (ark, Jonah's fish, Daniel's lion, David's sling, the burning bush, the Bethlehem star, loaves and fish, a Revelation horse, Zacchaeus' tree); otherwise null.

## Bible book names (code | English | Tamil)
${BOOK_ROWS.map((b) => `${b.code} | ${b.en} | ${b.ta}`).join('\n')}`;

function userPrompt(book, chapter, count, existing, focus) {
  const b = BOOK[book];
  const prior = existing.length
    ? `\n\nExisting questions on this chapter (do not repeat these):\n${existing.map((q) => `- ${q.en.q}`).join('\n')}`
    : '';
  return `Write ${count} new questions on ${b.en} chapter ${chapter} (${b.ta} ${chapter}).${
    focus ? ' This is an important, well-known chapter: cover its key events and people thoroughly.' : ''
  }${prior}`;
}

const LOCALIZED = {
  type: 'object',
  properties: {
    q: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    explain: { type: 'string' },
  },
  required: ['q', 'options', 'explain'],
  additionalProperties: false,
};
const NULLABLE_INT = { anyOf: [{ type: 'integer' }, { type: 'null' }] };
const SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['mcq', 'tf', 'who', 'book', 'blank'] },
          verse: NULLABLE_INT,
          verseEnd: NULLABLE_INT,
          difficulty: { type: 'integer', enum: [1, 2, 3] },
          answerIndex: NULLABLE_INT,
          answerTrue: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
          art: { anyOf: [{ type: 'string', enum: ART_KEYS }, { type: 'null' }] },
          en: LOCALIZED,
          ta: LOCALIZED,
        },
        required: ['type', 'verse', 'verseEnd', 'difficulty', 'answerIndex', 'answerTrue', 'art', 'en', 'ta'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
};

export function requestParams(book, chapter, effort) {
  const existing = existingFor(book, chapter);
  const target = chapterTarget(book, chapter);
  const count = Math.max(0, target - existing.length);
  const focus = chapterTarget(book, chapter) > chapterTarget(book, 0); // bonus applied
  return {
    count,
    params: {
      model: MODEL,
      max_tokens: Math.min(64000, 6000 + count * 1600),
      // Identical across every request, so it is cached after the first.
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userPrompt(book, chapter, count, existing, focus) }],
      output_config: { effort, format: { type: 'json_schema', schema: SCHEMA } },
    },
  };
}

// ---------- Turning a response into stored questions ----------
export function toQuestions(book, chapter, message) {
  if (message.stop_reason === 'refusal') return { error: 'refusal' };
  if (message.stop_reason === 'max_tokens') return { error: 'max_tokens (output cut off)' };
  const text = message.content.find((b) => b.type === 'text')?.text;
  if (!text) return { error: 'no text block' };
  let raw;
  try {
    raw = JSON.parse(text).questions;
  } catch {
    return { error: 'invalid JSON' };
  }
  return {
    questions: raw.map((r) => {
      const clean = (t) => ({ q: t.q.trim(), ...(r.type === 'tf' ? {} : { options: t.options.map((o) => o.trim()) }), ...(t.explain?.trim() ? { explain: t.explain.trim() } : {}) });
      return {
        type: r.type,
        book,
        chapter,
        ...(r.verse != null ? { verse: r.verse } : {}),
        ...(r.verseEnd != null ? { verseEnd: r.verseEnd } : {}),
        difficulty: r.difficulty,
        answer: r.type === 'tf' ? r.answerTrue : r.answerIndex,
        en: clean(r.en),
        ta: clean(r.ta),
        ...(r.art ? { art: r.art } : {}),
      };
    }),
  };
}

/** Validates, de-duplicates, numbers and appends questions to the book file. */
export function store(book, chapter, questions, rejects) {
  const file = loadBook(book);
  const seen = new Set([...starterQuestions(), ...file.questions].map(fingerprint));
  const prefix = `${book}-${String(chapter).padStart(3, '0')}-`;
  let n = file.questions.filter((q) => q.id.startsWith(prefix)).reduce((m, q) => Math.max(m, Number(q.id.slice(prefix.length))), 0);
  let added = 0;
  for (const q of questions) {
    const fp = fingerprint(q);
    const candidate = { id: `${prefix}${String(n + 1).padStart(2, '0')}`, ...q, source: 'generated', status: 'review' };
    const issues = problems(candidate, CHAPTERS);
    if (seen.has(fp)) issues.push('duplicate');
    if (issues.length) {
      rejects.push({ book, chapter, issues, question: q });
      continue;
    }
    seen.add(fp);
    file.questions.push(candidate);
    n++;
    added++;
  }
  file.questions.sort((a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id));
  mkdirSync(BOOKS_DIR, { recursive: true });
  writeFileSync(bookFile(book), JSON.stringify(file, null, 2) + '\n');
  return added;
}

// ---------- CLI ----------
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

function selectedBooks() {
  if (flag('books')) return flag('books').split(',').map((s) => s.trim().toUpperCase());
  return PRIORITY.slice(0, Number(flag('top') ?? PRIORITY.length));
}
function selectedChapters(book) {
  const r = flag('chapters');
  const max = CHAPTERS[book];
  if (!r) return Array.from({ length: max }, (_, i) => i + 1);
  const [a, b] = r.split('-').map(Number);
  return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i).filter((c) => c <= max);
}
function work(effort = 'high') {
  const jobs = [];
  for (const book of selectedBooks()) {
    if (!BOOK[book]) throw new Error(`unknown book ${book}`);
    for (const chapter of selectedChapters(book)) {
      const { count, params } = requestParams(book, chapter, effort);
      if (count > 0) jobs.push({ book, chapter, count, params });
    }
  }
  return jobs;
}
function estimate(jobs) {
  const q = jobs.reduce((s, j) => s + j.count, 0);
  const cost = jobs.length * EST_IN_PER_REQ * PRICE_IN + q * EST_OUT_PER_Q * PRICE_OUT;
  return { requests: jobs.length, questions: q, cost };
}

async function main() {
  if (cmd === 'plan') {
    const jobs = work();
    const byBook = {};
    for (const j of jobs) byBook[j.book] = (byBook[j.book] ?? 0) + j.count;
    for (const [b, n] of Object.entries(byBook)) console.log(`${b.padEnd(4)} ${BOOK[b].en.padEnd(16)} ${String(n).padStart(5)} questions to write`);
    const e = estimate(jobs);
    console.log(`\n${e.requests} chapter requests, ~${e.questions} questions, estimated ~$${e.cost.toFixed(0)} with the Batch API (rough; real cost depends on reasoning length).`);
    return;
  }

  const client = new Anthropic();
  mkdirSync(WORK_DIR, { recursive: true });

  if (cmd === 'try') {
    const book = flag('book')?.toUpperCase();
    const chapter = Number(flag('chapter'));
    if (!BOOK[book] || !chapter) throw new Error('usage: try --book GEN --chapter 1');
    const { count, params } = requestParams(book, chapter, flag('effort') ?? 'high');
    if (!count) return console.log(`${book} ${chapter} already has its target.`);
    console.log(`Writing ${count} questions for ${BOOK[book].en} ${chapter}…`);
    // Streaming, because the response can be long.
    const message = await client.messages.stream(params).finalMessage();
    const res = toQuestions(book, chapter, message);
    if (res.error) throw new Error(res.error);
    const rejects = [];
    const added = store(book, chapter, res.questions, rejects);
    if (rejects.length) writeFileSync(new URL(`rejects-try-${book}-${chapter}.json`, WORK_DIR), JSON.stringify(rejects, null, 2));
    console.log(`Added ${added}, rejected ${rejects.length}. Usage: ${message.usage.input_tokens} in (+${message.usage.cache_read_input_tokens ?? 0} cached), ${message.usage.output_tokens} out.`);
    console.log(`Review them in content/books/${book}.json, then import to Supabase.`);
    return;
  }

  if (cmd === 'submit') {
    const jobs = work(flag('effort') ?? 'high');
    if (!jobs.length) return console.log('Nothing to write: every selected chapter has reached its target.');
    const e = estimate(jobs);
    console.log(`Submitting ${e.requests} requests (~${e.questions} questions, est. ~$${e.cost.toFixed(0)})…`);
    const batch = await client.messages.batches.create({
      requests: jobs.map((j) => ({ custom_id: `${j.book}-${j.chapter}`, params: j.params })),
    });
    writeFileSync(new URL(`${batch.id}.json`, WORK_DIR), JSON.stringify({ id: batch.id, created: new Date().toISOString(), jobs: jobs.map(({ book, chapter, count }) => ({ book, chapter, count })) }, null, 2));
    writeFileSync(new URL('latest', WORK_DIR), batch.id);
    console.log(`Batch ${batch.id} submitted. Most finish within an hour. Then run: node scripts/generate-questions.mjs collect`);
    return;
  }

  if (cmd === 'collect') {
    const id = rest[0] && !rest[0].startsWith('--') ? rest[0] : readFileSync(new URL('latest', WORK_DIR), 'utf8').trim();
    const batch = await client.messages.batches.retrieve(id);
    if (batch.processing_status !== 'ended') {
      const c = batch.request_counts;
      return console.log(`Batch ${id} is ${batch.processing_status}: ${c.processing} processing, ${c.succeeded} done, ${c.errored} errored. Try again later.`);
    }
    const rejects = [];
    const failed = [];
    let added = 0;
    let outTokens = 0;
    for await (const result of await client.messages.batches.results(id)) {
      const [book, ch] = result.custom_id.split('-');
      const chapter = Number(ch);
      if (result.result.type !== 'succeeded') {
        failed.push(`${result.custom_id}: ${result.result.type}`);
        continue;
      }
      const message = result.result.message;
      outTokens += message.usage.output_tokens;
      const res = toQuestions(book, chapter, message);
      if (res.error) {
        failed.push(`${result.custom_id}: ${res.error}`);
        continue;
      }
      added += store(book, chapter, res.questions, rejects);
    }
    if (rejects.length) writeFileSync(new URL(`rejects-${id}.json`, WORK_DIR), JSON.stringify(rejects, null, 2));
    console.log(`Added ${added} questions for review; rejected ${rejects.length} (see .generator/rejects-${id}.json).`);
    console.log(`Output tokens: ${outTokens} (~$${(outTokens * PRICE_OUT).toFixed(2)}).`);
    if (failed.length) console.log(`Failed chapters (run submit again; it only asks for what is still missing):\n  ${failed.join('\n  ')}`);
    return;
  }

  console.log('Commands: plan | try --book GEN --chapter 1 | submit [--books GEN,EXO | --top 11] [--chapters 1-10] | collect [batch_id]');
}

// Run the CLI only when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) console.error('No valid Anthropic API key. Set ANTHROPIC_API_KEY first.');
  else if (err instanceof Anthropic.RateLimitError) console.error('Rate limited. Wait a minute and run again.');
  else if (err instanceof Anthropic.APIError) console.error(`API error ${err.status}: ${err.message}`);
  else console.error(err.message ?? err);
  process.exit(1);
});
