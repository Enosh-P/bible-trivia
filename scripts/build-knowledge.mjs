// Builds the "Bible Knowledge" pack (content/packs/knowledge.json) from
// content/knowledge/questions.json, plus "Which book has N chapters?" questions
// made from the Bible text itself (so the counts are always right).
//
//   npm run content:knowledge
//
// Add more questions to content/knowledge/questions.json (right answer first),
// run this, and commit both files.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));

// Book codes and names in both languages (from the app's own list).
const BOOKS = [...readFileSync(new URL('src/i18n/books.ts', root), 'utf8').matchAll(/\['([0-9A-Z]{3})', '([^']+)', '([^']+)'\]/g)].map(
  ([, code, en, ta]) => ({ code, en, ta }),
);
if (BOOKS.length !== 66) throw new Error(`expected 66 books, found ${BOOKS.length}`);

// Same small seeded random as the app, so the order is stable between builds.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, seed) {
  const r = rng(hash(seed));
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseRef(ref) {
  const m = /^([0-9A-Z]{3}) (\d+)(?::(\d+)(?:-(\d+))?)?$/.exec(ref);
  if (!m) throw new Error(`bad reference ${ref}`);
  return { book: m[1], chapter: Number(m[2]), ...(m[3] ? { verse: Number(m[3]) } : {}), ...(m[4] ? { verseEnd: Number(m[4]) } : {}) };
}

const out = [];
const src = read('content/knowledge/questions.json').questions;
const seen = new Set();
for (const [id, ref, art, en, ta] of src) {
  if (seen.has(id)) throw new Error(`duplicate id ${id}`);
  seen.add(id);
  const [enQ, enA, enW, enNote] = en;
  const [taQ, taA, taW, taNote] = ta;
  if (enW.length !== 3 || taW.length !== 3) throw new Error(`${id}: needs 3 wrong answers in each language`);
  // Shuffle positions, the same way in both languages.
  const order = shuffled([0, 1, 2, 3], id);
  const pick = (a, w) => order.map((i) => (i === 0 ? a : w[i - 1]));
  out.push({
    id: `kn-${id}`,
    type: 'mcq',
    ...parseRef(ref),
    difficulty: 2,
    answer: order.indexOf(0),
    ...(art ? { art } : {}),
    en: { q: enQ, options: pick(enA, enW), ...(enNote ? { explain: enNote } : {}) },
    ta: { q: taQ, options: pick(taA, taW), ...(taNote ? { explain: taNote } : {}) },
    tags: ['knowledge'],
  });
}

// "Which of these books has N chapters?" for every book, from the Bible text.
const chapters = Object.fromEntries(BOOKS.map((b) => [b.code, read(`public/packs/bible/${b.code}.json`).en.length]));
let made = 0;
for (const b of BOOKS) {
  const n = chapters[b.code];
  // Wrong answers: books with a different number of chapters, close in size so it isn't too easy.
  const others = shuffled(
    BOOKS.filter((o) => chapters[o.code] !== n).sort((x, y) => Math.abs(chapters[x.code] - n) - Math.abs(chapters[y.code] - n)).slice(0, 10),
    `ch-${b.code}`,
  ).slice(0, 3);
  const options = shuffled([b, ...others], `ch-opts-${b.code}`);
  const same = BOOKS.filter((o) => o.code !== b.code && chapters[o.code] === n);
  const alsoEn = same.length ? ` ${same.map((o) => o.en).join(', ')} also ${same.length > 1 ? 'have' : 'has'} ${n}.` : '';
  const alsoTa = same.length ? ` ${same.map((o) => o.ta).join(', ')} புஸ்தகத்திலும் ${n} அதிகாரங்கள் உள்ளன.` : '';
  out.push({
    id: `kn-ch-${b.code}`,
    type: 'book',
    book: b.code,
    chapter: n,
    difficulty: 2,
    answer: options.indexOf(b),
    art: 'scroll',
    en: {
      q: n === 1 ? 'Which of these books has only one chapter?' : `Which of these books has ${n} chapters?`,
      options: options.map((o) => o.en),
      explain: `${b.en} has ${n} chapter${n === 1 ? '' : 's'}.${alsoEn}`,
    },
    ta: {
      q: n === 1 ? 'இவற்றில் ஒரே ஒரு அதிகாரம் உள்ள புஸ்தகம் எது?' : `இவற்றில் ${n} அதிகாரங்கள் உள்ள புஸ்தகம் எது?`,
      options: options.map((o) => o.ta),
      explain: `${b.ta} புஸ்தகத்தில் ${n === 1 ? 'ஒரே ஒரு அதிகாரம் உள்ளது' : `${n} அதிகாரங்கள் உள்ளன`}.${alsoTa}`,
    },
    tags: ['knowledge', 'chapters'],
  });
  made++;
}

const pack = {
  id: 'knowledge',
  title: { en: 'Bible Knowledge', ta: 'வேத அறிவு' },
  questions: out,
};
writeFileSync(new URL('content/packs/knowledge.json', root), JSON.stringify(pack, null, 1) + '\n');
console.log(`Bible Knowledge: ${src.length} questions + ${made} chapter questions = ${out.length}.`);
