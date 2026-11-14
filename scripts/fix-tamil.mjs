// Cleans the Tamil translation files of words the machine translator got wrong
// in a Bible setting (Krishna for "Lord", charioteer for "prophet", ...).
// See scripts/lib/tamil-fix.mjs for the list. Safe to run again.
//
//   npm run content:fix-tamil            fix the files, then rebuild the packs:
//   npm run content:mcq -- --merge-only
//   npm run translate:recall -- --merge-only
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fixTamil, NOT_BIBLE } from './lib/tamil-fix.mjs';

const root = new URL('../', import.meta.url);
const SETS = [
  // [translations folder, packs folder, fields of a translation -> pack row index of the English]
  ['content/translations/ta/mcq/', 'public/packs/mcq/', { q: 4, o: 5 }],
  ['content/translations/ta/mcq-claude/', 'public/packs/mcq/', { q: 4, o: 5 }],
  ['content/translations/ta/recall/', 'public/packs/uw/', { q: 4, a: 5 }],
];

let changed = 0;
let left = 0;
for (const [dir, packs, fields] of SETS) {
  const tdir = new URL(dir, root);
  if (!existsSync(tdir)) continue;
  for (const name of readdirSync(tdir)) {
    const packFile = new URL(packs + name, root);
    if (!name.endsWith('.json') || !existsSync(packFile)) continue;
    const english = new Map(JSON.parse(readFileSync(packFile, 'utf8')).rows.map((r) => [r[0], r]));
    const file = new URL(name, tdir);
    const ta = JSON.parse(readFileSync(file, 'utf8'));
    let n = 0;
    for (const [id, t] of Object.entries(ta)) {
      const row = english.get(id);
      if (!row || !t) continue;
      for (const [field, col] of Object.entries(fields)) {
        const en = row[col];
        if (Array.isArray(t[field]) && Array.isArray(en)) {
          t[field] = t[field].map((s, i) => {
            const fixed = fixTamil(String(en[i] ?? ''), s);
            if (fixed !== s) n++;
            return fixed;
          });
        } else if (typeof t[field] === 'string') {
          const fixed = fixTamil(String(en ?? ''), t[field]);
          if (fixed !== t[field]) n++;
          t[field] = fixed;
        }
        const after = [t[field]].flat().join(' ');
        if (NOT_BIBLE.test(after)) left++;
      }
    }
    if (n) writeFileSync(file, JSON.stringify(ta, null, 1) + '\n');
    changed += n;
  }
}
console.log(`Fixed ${changed} Tamil strings.${left ? ` ${left} still have a doubtful word (no matching English).` : ''}`);
