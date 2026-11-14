#!/usr/bin/env node
// Tamil for the multiple-choice questions, translated by Claude Haiku 5.5 with
// the Bible verse each question comes from (KJV + BSI Tamil O.V.) and the Tamil
// Bible names list, so the wording follows the Tamil Bible.
//
// Needs ANTHROPIC_API_KEY in .env.local (your own key; it never leaves your computer).
//
//   npm run translate:claude -- --sample 30    try 30 questions now, write a side-by-side comparison
//   npm run translate:claude -- --dry-run      how many are left and roughly what they'll cost
//   npm run translate:claude                   collect finished batches, then send what's left
//   npm run translate:claude -- --wait         …and keep waiting until everything is back
//   npm run translate:claude -- --status       progress only
//   npm run translate:claude -- --cancel       stop batches that haven't finished
//
// Limit what's sent with --books GEN,JHN, --top 11 (popular books first), or --limit 2000.
//
// Safe to stop and run again any time: sent batches keep running at Anthropic
// (Message Batches, half price) and the next run collects them; nothing is
// sent twice. Results: content/translations/ta/mcq-claude/<BOOK>.json, then
//   npm run content:mcq -- --merge-only    (Claude's Tamil replaces IndicTrans2's)

import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const MODEL = 'claude-haiku-5-5';
const ROOT = new URL('../', import.meta.url);
const PACKS = new URL('public/packs/mcq/', ROOT);
const BIBLE = new URL('public/packs/bible/', ROOT);
const OUT = new URL('content/translations/ta/mcq-claude/', ROOT);
const STATE_FILE = new URL('content/translations/ta/mcq-claude/_batches.json', ROOT);
const BATCH_SIZE = 10_000;
const POPULAR = ['GEN', 'EXO', 'PSA', 'PRO', 'DAN', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'REV'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// ---------- Inputs ----------
const booksTs = readFileSync(new URL('src/i18n/books.ts', ROOT), 'utf8');
const BOOK_NAMES = Object.fromEntries([...booksTs.matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map((m) => [m[1], { en: m[2], ta: m[3] }]));
const glossary = {
  ...JSON.parse(readFileSync(new URL('content/glossary/names-ta.json', ROOT), 'utf8')).terms,
  ...JSON.parse(readFileSync(new URL('content/glossary/options-ta.json', ROOT), 'utf8')).terms,
};

const bibleCache = new Map();
function bibleBook(book) {
  if (!bibleCache.has(book)) {
    const f = new URL(`${book}.json`, BIBLE);
    bibleCache.set(book, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
  }
  return bibleCache.get(book);
}

/** The verse a question is about, in both languages (nothing when the question has no verse number). */
function verseFor(book, chapter, verse) {
  const b = bibleBook(book);
  if (!b || !chapter || !verse) return null;
  const en = b.en[chapter - 1]?.[verse - 1];
  const ta = b.ta[chapter - 1]?.[verse - 1];
  return en && ta ? { en, ta } : null;
}

/** Every question: [book, row]; row = [id, chapter, verse, kind, question, options, answer, …]. */
function allQuestions() {
  const index = JSON.parse(readFileSync(new URL('index.json', PACKS), 'utf8'));
  const out = [];
  for (const book of Object.keys(index.books)) {
    for (const row of JSON.parse(readFileSync(new URL(`${book}.json`, PACKS), 'utf8')).rows) out.push([book, row]);
  }
  return out;
}

// ---------- Prompt ----------
const SYSTEM = `You translate Bible quiz questions from English into Tamil for Tamil Christians who read the Bible Society of India Tamil Old Version (BSI O.V., the "Union" Bible).

Rules:
- Use the vocabulary, spelling and style of the BSI O.V. Tamil Bible. When the Tamil verse is given, reuse its exact words for names, places, things and phrases from the verse wherever the question or an option refers to them.
- Bible names and terms: use the Tamil Bible spellings in the list below (e.g. David → தாவீது, Moses → மோசே, God → தேவன், LORD → கர்த்தர்).
- A quoted saying (a "who said it" question, or words in quotation marks): copy the matching words from the Tamil verse exactly, without the narration around them ("he said", "என்றான்"). If the verse doesn't contain it, translate it in the same Bible style.
- Keep "____" exactly as it is in fill-in-the-blank questions, in the matching place in the Tamil sentence.
- Translate every option, in the same order. Keep options short like the English, and never make the right answer more obvious than the wrong ones.
- Natural, simple Tamil that a family can read aloud. No transliteration in English letters, no explanations, no notes.

Tamil Bible names and terms:
${Object.entries(glossary)
  .map(([en, ta]) => `${en} = ${ta}`)
  .join('\n')}`;

function userMessage(book, row) {
  const [, chapter, verse, kind, q, options] = row;
  const v = verseFor(book, chapter, verse);
  const ref = `${BOOK_NAMES[book]?.en ?? book}${chapter ? ` ${chapter}${verse ? `:${verse}` : ''}` : ''}`;
  const type = kind & 4 ? 'who said it (the question is a quoted saying; options are speakers)' : kind & 1 ? 'fill in the blank' : 'multiple choice';
  return [
    `Reference: ${ref} (Tamil book name: ${BOOK_NAMES[book]?.ta ?? book})`,
    v ? `KJV: ${v.en}\nBSI Tamil O.V.: ${v.ta}` : 'Verse text: not available',
    `Question type: ${type}`,
    `Question: ${q}`,
    'Options:',
    ...options.map((o, i) => `${i + 1}. ${o}`),
  ].join('\n');
}

const SCHEMA = {
  type: 'object',
  properties: {
    q: { type: 'string', description: 'The question in Tamil' },
    o: { type: 'array', items: { type: 'string' }, description: 'The options in Tamil, same order' },
  },
  required: ['q', 'o'],
  additionalProperties: false,
};

function params(book, row) {
  return {
    model: MODEL,
    max_tokens: 2000,
    // A straight translation: no thinking needed (and none billed).
    thinking: { type: 'disabled' },
    // The rules and names list are the same for every question: cached after the first request.
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage(book, row) }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  };
}

const TAMIL = /[஀-௿]/;
/** The Tamil from a reply, or null when it doesn't fit the question. */
function parse(row, message) {
  if (message.stop_reason !== 'end_turn') return null;
  const text = message.content.find((b) => b.type === 'text')?.text;
  try {
    const t = JSON.parse(text);
    const options = row[5];
    if (typeof t.q !== 'string' || !TAMIL.test(t.q) || !Array.isArray(t.o) || t.o.length !== options.length) return null;
    if (t.o.some((o) => typeof o !== 'string' || !o.trim())) return null;
    return { q: t.q.trim(), o: t.o.map((o) => o.trim()) };
  } catch {
    return null;
  }
}

// ---------- Saved progress ----------
mkdirSync(OUT, { recursive: true });
const loadState = () => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { batches: [] });
const saveState = (s) => writeFileSync(STATE_FILE, JSON.stringify(s, null, 1) + '\n');

function loadDone() {
  const done = {};
  for (const f of readdirSync(OUT).filter((f) => /^[0-9A-Z]{3}\.json$/.test(f))) done[f.slice(0, 3)] = JSON.parse(readFileSync(new URL(f, OUT), 'utf8'));
  return done;
}
function saveBook(done, book) {
  const sorted = Object.fromEntries(Object.entries(done[book]).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(new URL(`${book}.json`, OUT), JSON.stringify(sorted, null, 1) + '\n');
}

const keyOf = (book, id) => `${book}-${id}`;

// ---------- Commands ----------
const client = new Anthropic();

async function sample(n) {
  const qs = allQuestions().filter(([book, row]) => POPULAR.includes(book) && verseFor(book, row[1], row[2]));
  // Spread over the books and kinds of question.
  const picked = [];
  for (let i = 0; picked.length < n && i < qs.length; i += Math.max(1, Math.floor(qs.length / n))) picked.push(qs[i]);
  const current = (book, id) => {
    const row = JSON.parse(readFileSync(new URL(`${book}.json`, PACKS), 'utf8')).rows.find((r) => r[0] === id);
    return row?.[7] ? { q: row[7], o: row[8] } : null;
  };
  const lines = ['# Claude Haiku 5.5 Tamil: sample', '', 'Each question: English, the Tamil now in the app (IndicTrans2), and the new Tamil from Claude with the verse as context.', ''];
  let cost = 0;
  for (const [book, row] of picked) {
    const res = await client.messages.create(params(book, row));
    const t = parse(row, res);
    const u = res.usage;
    cost += ((u.input_tokens ?? 0) * 0.1 + (u.cache_creation_input_tokens ?? 0) * 0.125 + (u.cache_read_input_tokens ?? 0) * 0.01 + (u.output_tokens ?? 0) * 0.5) / 1e6;
    const now = current(book, row[0]);
    lines.push(`## ${BOOK_NAMES[book].en} ${row[1]}:${row[2]}`, '', `**English:** ${row[4]}  `, `Options: ${row[5].join(' · ')}`, '');
    lines.push(`**Now (IndicTrans2):** ${now?.q ?? '—'}  `, `Options: ${now?.o?.join(' · ') ?? '—'}`, '');
    lines.push(`**Claude:** ${t?.q ?? '(no usable reply)'}  `, `Options: ${t?.o?.join(' · ') ?? '—'}`, '');
    process.stdout.write('.');
  }
  const file = new URL('content/translations/ta/claude-sample.md', ROOT);
  writeFileSync(file, lines.join('\n') + '\n');
  console.log(`\nWrote content/translations/ta/claude-sample.md (${picked.length} questions, about $${cost.toFixed(3)}).`);
}

async function collect(state, done) {
  const all = new Map(allQuestions().map(([book, row]) => [keyOf(book, row[0]), [book, row]]));
  for (const b of state.batches.filter((x) => !x.collected)) {
    const batch = await client.messages.batches.retrieve(b.id);
    if (batch.processing_status !== 'ended') {
      const c = batch.request_counts;
      console.log(`Batch ${b.id}: still running (${c.succeeded + c.errored} of ${b.count} back).`);
      continue;
    }
    let ok = 0;
    let bad = 0;
    const touched = new Set();
    for await (const result of await client.messages.batches.results(b.id)) {
      const item = all.get(result.custom_id);
      if (!item || result.result.type !== 'succeeded') {
        bad++;
        continue;
      }
      const [book, row] = item;
      const t = parse(row, result.result.message);
      if (!t) {
        bad++;
        state.failed[result.custom_id] = (state.failed[result.custom_id] ?? 0) + 1;
        continue;
      }
      (done[book] ??= {})[row[0]] = t;
      touched.add(book);
      ok++;
    }
    for (const book of touched) saveBook(done, book);
    b.collected = true;
    saveState(state);
    console.log(`Batch ${b.id}: collected ${ok} translations${bad ? `, ${bad} to try again` : ''}.`);
  }
}

function remaining(state, done) {
  const pending = new Set(state.batches.filter((b) => !b.collected).flatMap((b) => b.keys));
  let qs = allQuestions().filter(([book, row]) => !done[book]?.[row[0]] && !pending.has(keyOf(book, row[0])) && (state.failed[keyOf(book, row[0])] ?? 0) < 2);
  const books = opt('books')?.split(',').map((s) => s.trim().toUpperCase());
  if (books) qs = qs.filter(([book]) => books.includes(book));
  const top = Number(opt('top'));
  if (top) qs = qs.filter(([book]) => POPULAR.slice(0, top).includes(book));
  // Popular books first.
  qs.sort(([a], [b]) => (POPULAR.indexOf(a) + 1 || 99) - (POPULAR.indexOf(b) + 1 || 99));
  const limit = Number(opt('limit'));
  return limit ? qs.slice(0, limit) : qs;
}

async function submit(state, qs) {
  for (let i = 0; i < qs.length; i += BATCH_SIZE) {
    const chunk = qs.slice(i, i + BATCH_SIZE);
    const batch = await client.messages.batches.create({
      requests: chunk.map(([book, row]) => ({ custom_id: keyOf(book, row[0]), params: params(book, row) })),
    });
    state.batches.push({ id: batch.id, count: chunk.length, keys: chunk.map(([book, row]) => keyOf(book, row[0])), at: new Date().toISOString(), collected: false });
    saveState(state);
    console.log(`Sent batch ${batch.id} with ${chunk.length} questions.`);
  }
}

function status(state, done) {
  const total = allQuestions().length;
  const translated = Object.values(done).reduce((n, b) => n + Object.keys(b).length, 0);
  const pending = state.batches.filter((b) => !b.collected).reduce((n, b) => n + b.count, 0);
  console.log(`Translated by Claude: ${translated} of ${total}. Waiting in batches: ${pending}.`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !flag('dry-run') && !flag('status')) {
    console.error('Add ANTHROPIC_API_KEY=sk-ant-... to .env.local (from console.anthropic.com → API keys), then run again.');
    process.exit(1);
  }
  const state = loadState();
  state.failed ??= {};
  const done = loadDone();

  if (opt('sample')) return sample(Number(opt('sample')) || 30);
  if (flag('status')) return status(state, done);

  if (flag('dry-run')) {
    const qs = remaining(state, done);
    // Rough: ~350 new input tokens and ~450 Tamil output tokens a question, half price in batches.
    const est = (qs.length * (350 * 0.1 + 450 * 0.5)) / 1e6 / 2;
    console.log(`${qs.length} questions to send. Roughly $${est.toFixed(2)} with Claude Haiku 5.5 (batch price).`);
    return status(state, done);
  }

  if (flag('cancel')) {
    for (const b of state.batches.filter((x) => !x.collected)) {
      await client.messages.batches.cancel(b.id).catch(() => {});
      console.log(`Cancelling ${b.id}; run again later to collect what finished.`);
    }
    return;
  }

  await collect(state, done);
  const qs = remaining(state, done);
  if (qs.length) await submit(state, qs);
  else console.log('Nothing new to send.');

  while (flag('wait') && state.batches.some((b) => !b.collected)) {
    await new Promise((r) => setTimeout(r, 60_000));
    await collect(state, done);
  }
  status(state, done);
  console.log('Run again any time to collect results. When finished: npm run content:mcq -- --merge-only');
}

await main();
