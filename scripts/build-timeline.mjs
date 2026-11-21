#!/usr/bin/env node
// Builds public/packs/timeline.json from content/timeline/timeline.json (the
// Bible Lives Timeline: people, events, eras). Checks every entry first.
//   npm run content:timeline
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const src = JSON.parse(readFileSync(new URL('content/timeline/timeline.json', ROOT), 'utf8'));
const books = new Set([...readFileSync(new URL('src/i18n/books.ts', ROOT), 'utf8').matchAll(/\['([0-9A-Z]{3})'/g)].map((m) => m[1]));
const errors = [];
const cats = new Set(src.cats.map((c) => c.id));
const ids = new Set();
const year = (y, where) => (Number.isInteger(y) && y !== 0 && y >= -4300 && y <= 200) || errors.push(`${where}: bad year ${y}`);
const refs = (rs, where) => rs?.forEach((r) => (books.has(r.b) && (!r.to || books.has(r.to))) || errors.push(`${where}: bad book in ${JSON.stringify(r)}`));
for (const e of src.events) year(e.y, e.en), refs(e.refs, e.en);
for (const e of src.world) year(e.y, e.en);
for (const p of src.people) {
  if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`);
  ids.add(p.id);
  if (!cats.has(p.cat)) errors.push(`${p.id}: unknown group ${p.cat}`);
  if (p.born != null) year(p.born, p.id), year(p.died, p.id);
  if (p.active) year(p.active.from, p.id), year(p.active.to, p.id);
  if (p.born == null && !p.active) errors.push(`${p.id}: needs born/died or active years`);
  p.events.forEach((e) => year(e.y, p.id));
  refs(p.refs, p.id);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const { about, ...out } = src;
writeFileSync(new URL('public/packs/timeline.json', ROOT), JSON.stringify(out));
const missing = [...src.people.flatMap((p) => [p.name, p.title]), ...src.events].filter((t) => !t.ta).length;
console.log(`timeline: ${src.people.length} people, ${src.events.length} events, ${src.world.length} world events${missing ? ` (${missing} without Tamil)` : ''}`);
