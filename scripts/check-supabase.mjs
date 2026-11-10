#!/usr/bin/env node
// Checks the Supabase setup and says what is missing, with the fix.
//
//   npm run db:check      (reads .env.local)
//
// Read-only: it never changes data.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';

const env = process.env;
const ROOT = new URL('..', import.meta.url);
let problems = 0;
let warnings = 0;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg, fix) => {
  warnings++;
  console.log(`  ⚠️  ${msg}${fix ? `\n      → ${fix}` : ''}`);
};
const bad = (msg, fix) => {
  problems++;
  console.log(`  ❌ ${msg}${fix ? `\n      → ${fix}` : ''}`);
};
const section = (title) => console.log(`\n${title}`);
const local = (path) => JSON.parse(readFileSync(new URL(path, ROOT), 'utf8'));

// ---------- 1. Environment variables ----------
section('1. Environment variables (.env.local)');
if (!existsSync(new URL('.env.local', ROOT))) bad('.env.local not found', 'copy .env.example to .env.local and fill it in');
const appUrl = env.VITE_SUPABASE_URL;
const pubKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;
const url = env.SUPABASE_URL ?? appUrl;
const secret = env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!appUrl) bad('VITE_SUPABASE_URL is missing', 'Supabase → Project Settings → Data API → Project URL');
else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(appUrl)) warn(`VITE_SUPABASE_URL looks unusual: ${appUrl}`, 'it should look like https://abcdefgh.supabase.co');
else ok('VITE_SUPABASE_URL');

if (!pubKey) bad('VITE_SUPABASE_PUBLISHABLE_KEY is missing', 'Project Settings → API Keys → Publishable key (sb_publishable_...)');
else if (pubKey.startsWith('sb_secret_')) bad('VITE_SUPABASE_PUBLISHABLE_KEY contains a SECRET key', 'never put sb_secret_ in a VITE_ variable: it would be visible to everyone. Use the publishable key.');
else if (!pubKey.startsWith('sb_publishable_')) warn('VITE_SUPABASE_PUBLISHABLE_KEY is a legacy anon key', 'works, but the new sb_publishable_ key is recommended');
else ok('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!env.SUPABASE_URL) warn('SUPABASE_URL is missing (using VITE_SUPABASE_URL for the scripts)');
else if (appUrl && env.SUPABASE_URL.replace(/\/$/, '') !== appUrl.replace(/\/$/, '')) bad('SUPABASE_URL and VITE_SUPABASE_URL point to different projects');
else ok('SUPABASE_URL');

if (!secret) bad('SUPABASE_SECRET_KEY is missing (needed by db:import, db:export and this check)', 'Project Settings → API Keys → Secret key (sb_secret_...)');
else if (!secret.startsWith('sb_secret_')) warn('SUPABASE_SECRET_KEY is a legacy service_role key', 'works, but the new sb_secret_ key is recommended');
else ok('SUPABASE_SECRET_KEY');

for (const [k, v] of Object.entries(env)) {
  if (k.startsWith('VITE_') && typeof v === 'string' && v.startsWith('sb_secret_')) bad(`${k} holds a secret key`, 'remove it: VITE_ variables are built into the public web page');
}
if (env.VITE_ADMIN_EMAIL) ok('VITE_ADMIN_EMAIL set (email fallback for reports)');

if (!url || !secret) {
  console.log('\nFix the variables above, then run this check again.');
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false } });
const anon = pubKey ? createClient(url, pubKey, { auth: { persistSession: false } }) : null;

async function count(table, filter) {
  let q = admin.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}
const missingTable = (e) => /does not exist|Could not find the table|relation .* does not exist/i.test(e?.message ?? '');

// ---------- 2. Tables (migrations) ----------
section('2. Tables (supabase/migrations)');
const MIGRATION = {
  init: '20261110000000_init.sql',
  verses: '20261110000100_verses_gospel.sql',
  workflow: '20261110000200_content_workflow.sql',
  reports: '20261110000300_reports.sql',
  recall: '20261110000400_recall_questions.sql',
};
const tables = [
  ['books', MIGRATION.init],
  ['questions', MIGRATION.init],
  ['profiles', MIGRATION.init],
  ['daily_results', MIGRATION.init],
  ['question_reports', MIGRATION.init],
  ['verses', MIGRATION.verses],
  ['gospel_steps', MIGRATION.verses],
  ['faqs', MIGRATION.verses],
  ['reading_sources', MIGRATION.verses],
  ['book_targets', MIGRATION.workflow],
];
let tablesOk = true;
for (const [t, file] of tables) {
  try {
    await count(t);
    ok(t);
  } catch (e) {
    tablesOk = false;
    if (missingTable(e)) bad(`table ${t} is missing`, `run supabase/migrations/${file} in the SQL Editor`);
    else bad(`table ${t}: ${e.message}`);
  }
}
// Columns added by later migrations
const columnCheck = async (table, column, file) => {
  const { error } = await admin.from(table).select(column).limit(1);
  if (error) bad(`${table}.${column} is missing`, `run supabase/migrations/${file} in the SQL Editor`);
  else ok(`${table}.${column} (${file.slice(15, -4)})`);
};
await columnCheck('questions', 'source', MIGRATION.workflow);
await columnCheck('question_reports', 'category', MIGRATION.reports);

// Migration 5 allows recall rows (ta can be empty)
{
  const { error } = await admin.rpc('withdrawn_question_ids', { p_since: new Date().toISOString() });
  if (error) bad('function withdrawn_question_ids is missing', `run supabase/migrations/${MIGRATION.workflow}`);
  else ok('function withdrawn_question_ids');
}

// ---------- 3. Content ----------
section('3. Content');
const expect = async (label, n, want, fix) => {
  if (n >= want) ok(`${label}: ${n}`);
  else if (n === 0) bad(`${label}: none`, fix);
  else warn(`${label}: ${n} (expected ${want})`, fix);
};
if (tablesOk) {
  const seedFix = 'run supabase/seed.sql in the SQL Editor (npm run db:seed-sql rebuilds it)';
  await expect('books', await count('books'), 66, seedFix);
  const starter = local('content/packs/old-testament.json').questions.length + local('content/packs/new-testament.json').questions.length;
  await expect('starter quiz questions', await count('questions', (q) => q.neq('type', 'recall').like('id', '___-___')), starter, seedFix);
  await expect('verses', await count('verses'), local('content/verses.json').verses.length, seedFix);
  const gospel = local('content/gospel.json');
  await expect('gospel steps', await count('gospel_steps'), gospel.steps.length, seedFix);
  await expect('FAQs', await count('faqs'), gospel.faqs.length, seedFix);
  await expect('reading sources', await count('reading_sources'), gospel.sources.length, seedFix);
  await expect('book targets', await count('book_targets'), 66, 'npm run db:import (also loads the targets)');

  let recallLocal = 0;
  try {
    recallLocal = local('public/packs/uw/index.json').total;
  } catch {
    /* packs not imported */
  }
  const recall = await count('questions', (q) => q.eq('type', 'recall'));
  await expect('Recall questions', recall, recallLocal, `run supabase/migrations/${MIGRATION.recall}, then npm run db:import`);

  const review = await count('questions', (q) => q.eq('status', 'review'));
  if (review) warn(`${review} questions waiting for review`, 'Table editor → questions → filter status = review');
  const reports = await count('question_reports', (q) => q.eq('status', 'new'));
  if (reports) warn(`${reports} open player reports`, 'SQL Editor: select * from open_reports;');
}

// ---------- 4. What the public app key can do ----------
section('4. Security rules (as a player, with the publishable key)');
if (!anon) {
  bad('skipped: no publishable key');
} else {
  const { count: pub, error: e1 } = await anon.from('questions').select('*', { count: 'exact', head: true });
  if (e1) bad(`players cannot read questions: ${e1.message}`, `re-run supabase/migrations/${MIGRATION.init}`);
  else ok(`players can read published questions (${pub})`);

  const { data: profs, error: e2 } = await anon.from('profiles').select('id').limit(1);
  if (!e2 && profs?.length) bad('players can read other people\'s profiles', 'row level security is off on profiles: re-run the init migration');
  else ok('profiles are private');

  const { error: e3 } = await anon.rpc('daily_leaderboard', {});
  if (e3) bad(`daily_leaderboard not callable: ${e3.message}`, `re-run supabase/migrations/${MIGRATION.init}`);
  else ok('daily leaderboard function');

  const { error: e4 } = await anon.from('book_progress').select('code').limit(1);
  if (!e4) bad('players can read the team-only book_progress view', `re-run supabase/migrations/${MIGRATION.workflow}`);
  else ok('team-only views are hidden from players');
}

// ---------- 5. Report emails ----------
section('5. Report emails (supabase/functions/report-email)');
try {
  const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/report-email`, { method: 'POST', body: '{}' });
  if (res.status === 404) warn('Edge Function report-email is not deployed yet', 'see supabase/functions/report-email/README.md (reports are still saved in the database meanwhile)');
  else if (res.status === 401) ok('report-email is deployed and rejects calls without the webhook secret');
  else if (res.status === 500) warn('report-email is deployed but its secrets are missing', 'Edge Functions → Secrets: ADMIN_EMAIL, RESEND_API_KEY, WEBHOOK_SECRET');
  else ok(`report-email answered (HTTP ${res.status})`);
  console.log('     Also check: Database → Webhooks has an INSERT webhook on question_reports → report-email with header x-webhook-secret.');
} catch (e) {
  warn(`could not reach the functions endpoint: ${e.message}`);
}

// ---------- Summary ----------
console.log(`\n${problems ? `❌ ${problems} problem(s)` : '✅ No problems'}${warnings ? `, ⚠️  ${warnings} to look at` : ''}.`);
process.exit(problems ? 1 : 0);
