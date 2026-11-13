// Builds "Who said it?" questions from two open sources:
//   - Clear Bible's MACULA Quotation and Speaker Data (CC BY 4.0): who speaks
//     in each verse range of the Bible
//   - the World English Bible (public domain): the words, with quotation marks
// For each speech, the quoted words become the question and the speaker the
// answer; the wrong options are other speakers from the same book.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const WHO_ATTRIBUTION =
  'Speakers: MACULA Quotation and Speaker Data © Clear Bible, Inc (CC BY 4.0), with FCBH/SIL character data (MIT). Words: World English Bible (public domain).';

const NT = new Set(['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV']);

const SKIP_SPEAKER = /^good |narrator|scripture|needs review|ambiguous|unknown|^psalmist$|^preacher$|^teacher$|^voice|^someone|^people$|^men$|^man$|^woman$|^servant$/i;

/** "Peter (Simon)" → "Peter"; "Ahab, king of Israel" → "Ahab"; "Jews, the" → "The Jews". */
export function speakerName(raw) {
  let s = raw.replace(/\s*\([^)]*\)/g, '').trim();
  const m = /^(.*), the$/i.exec(s);
  if (m) return `The ${m[1]}`;
  if (s.includes(',')) s = s.split(',')[0].trim();
  s = s.replace(/\s+\d+$/, '');
  if (/^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

/** USFM → { "GEN 3:1": "plain verse text", … } */
export function parseUsfm(text) {
  const out = {};
  const book = /\\id\s+([0-9A-Z]{3})/.exec(text)?.[1];
  if (!book) return { book: null, verses: out };
  let chapter = 0;
  let key = null;
  const clean = (s) =>
    s
      .replace(/\\f\s.*?\\f\*/g, '')
      .replace(/\\x\s.*?\\x\*/g, '')
      .replace(/\\\+?w\s+([^|\\]*?)(?:\|[^\\]*)?\\\+?w\*/g, '$1')
      .replace(/\\\+?[a-z0-9]+\*?/g, '')
      .replace(/\s+/g, ' ');
  for (const line of text.split(/\r?\n/)) {
    const c = /^\\c\s+(\d+)/.exec(line);
    if (c) {
      chapter = Number(c[1]);
      key = null;
      continue;
    }
    const v = /^\\v\s+(\d+)\s?(.*)$/.exec(line);
    if (v) {
      key = `${book} ${chapter}:${Number(v[1])}`;
      out[key] = clean(v[2]);
    } else if (key && /^\\(p|q\d?|m|pi\d?|li\d?|nb|pc|qr)\b/.test(line)) {
      out[key] += ' ' + clean(line.replace(/^\\\S+\s?/, ''));
    }
  }
  for (const k in out) out[k] = out[k].replace(/\s+/g, ' ').trim();
  return { book, verses: out };
}

/** The first quoted speech in the text, cut down to a sentence or two. */
export function firstQuote(text, max = 130) {
  const start = text.indexOf('“');
  if (start < 0) return null;
  let depth = 0;
  let end = text.length;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '“') depth++;
    else if (text[i] === '”') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  let q = text.slice(start + 1, end).replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
  if (q.length > max) {
    // Keep whole sentences that fit.
    const parts = q.match(/[^.?!;]+[.?!;]+/g) ?? [];
    let cut = '';
    for (const p of parts) {
      if ((cut + p).trim().length > max) break;
      cut += p;
    }
    q = cut.trim();
  }
  q = q.replace(/[,;:]$/, '.');
  if (q.length < 18 || q.length > max) return null;
  if (!/[.?!’]$/.test(q)) q += '…';
  return q;
}

function rand(seed) {
  let h = parseInt(createHash('sha1').update(seed).digest('hex').slice(0, 8), 16);
  return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/**
 * @param speakerDir  clone of github.com/Clear-Bible/speaker-quotations
 * @param webDir      unzipped ebible.org/Scriptures/eng-web_usfm.zip
 * @returns Map book → rows [id, chapter, verse, kind(4 = who), quote, options, answer]
 */
export function buildWhoSaid(speakerDir, webDir) {
  const verses = {};
  for (const f of readdirSync(webDir).filter((f) => f.endsWith('.usfm'))) {
    Object.assign(verses, parseUsfm(readFileSync(join(webDir, f), 'utf8')).verses);
  }

  const gender = {};
  const detail = join(speakerDir, 'tsv/character_detail.semantic_data.tsv');
  if (existsSync(detail)) {
    for (const line of readFileSync(detail, 'utf8').split('\n').slice(1)) {
      const f = line.split('\t');
      if (f[0]) gender[speakerName(f[0])] = f[2];
    }
  }

  // Speeches per book.
  const speeches = {};
  const lines = readFileSync(join(speakerDir, 'tsv/Clear-Aligned-Projections.tsv'), 'utf8').split('\n').slice(1);
  for (const line of lines) {
    const f = line.split('\t');
    if (f.length < 11) continue;
    const [, , , rawSpeaker, , , , type, , pStart, pEnd] = f;
    if (!/^(Normal|Dialogue)$/.test(type) || SKIP_SPEAKER.test(rawSpeaker)) continue;
    const s = /^([0-9A-Z]{3}) (\d+):(\d+)$/.exec(pStart);
    const e = /^([0-9A-Z]{3}) (\d+):(\d+)$/.exec(pEnd);
    if (!s || !e || s[1] !== e[1] || s[2] !== e[2]) continue;
    const book = s[1];
    const chapter = Number(s[2]);
    let text = '';
    for (let v = Number(s[3]); v <= Number(e[3]); v++) text += ' ' + (verses[`${book} ${chapter}:${v}`] ?? '');
    const quote = firstQuote(text.trim());
    if (!quote || /[|\\]|strong=/.test(quote)) continue;
    const speaker = speakerName(rawSpeaker);
    if (speaker === 'Jesus' && !NT.has(book)) continue; // the source labels some Old Testament speech this way
    if (!speaker || speaker.length > 40) continue;
    // Don't give the answer away.
    const first = speaker.replace(/^The /, '').split(' ')[0].toLowerCase();
    if (first.length > 2 && quote.toLowerCase().includes(first)) continue;
    (speeches[book] ??= []).push({ chapter, verse: Number(s[3]), quote, speaker });
  }

  const out = new Map();
  for (const [book, list] of Object.entries(speeches)) {
    const counts = {};
    for (const sp of list) counts[sp.speaker] = (counts[sp.speaker] ?? 0) + 1;
    const pool = Object.keys(counts);
    if (pool.length < 4) continue; // not enough different speakers for options

    // God and Jesus speak most often: keep at most a fifth of the book's questions for them.
    const divine = (s) => /^(God|Jesus|Yahweh|LORD|Lord)$/.test(s);
    const r = rand(`who:${book}`);
    const human = list.filter((s) => !divine(s.speaker));
    const godly = list.filter((s) => divine(s.speaker)).sort(() => r() - 0.5);
    const keep = [...human, ...godly.slice(0, Math.max(3, Math.round(human.length / 4)))];

    const seen = new Set();
    const rows = [];
    for (const sp of keep) {
      if (seen.has(sp.quote)) continue;
      seen.add(sp.quote);
      const id = 'w' + createHash('sha1').update(`${book}|${sp.chapter}|${sp.quote}`).digest('base64url').replace(/[-_]/g, '').slice(0, 6);
      const rr = rand(id);
      // Wrong options: other speakers in this book, same gender first, frequent ones first.
      const others = pool
        .filter((p) => p !== sp.speaker && !p.includes(sp.speaker) && !sp.speaker.includes(p))
        .map((p) => ({ p, w: rr() + (gender[p] && gender[p] === gender[sp.speaker] ? 0.6 : 0) + Math.min(counts[p], 10) / 20 }))
        .sort((a, b) => b.w - a.w)
        .slice(0, 3)
        .map((x) => x.p);
      if (others.length < 3) continue;
      const options = [sp.speaker, ...others];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(rr() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      rows.push([id, sp.chapter, sp.verse, 4, sp.quote, options, options.indexOf(sp.speaker)]);
    }
    if (rows.length) out.set(book, rows);
  }
  return out;
}
