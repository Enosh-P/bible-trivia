# Bible Trivia — வேத வினாடி வினா

Tamil & English Bible trivia as an installable, offline-first web app (PWA).
Cold-grey "liquid glass" design with the Four Horsemen of Revelation 6 as accent colours, line icons, spring animations and cartoon question art.

See **[PLAN.md](PLAN.md)** for the research, feature roadmap and design decisions.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173   (/?art shows all cartoon illustrations)
npm test           # validates every question + engine logic
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build (needed to test install/offline)
```

## Project layout

| Path | What |
|---|---|
| `content/packs/*.json` | Question bank (bilingual). Add questions here, then run `npm test`. |
| `src/design/` | Design tokens (cold grey + horse colours), glass materials, grain/aurora |
| `src/motion/springs.ts` | Spring presets, momentum projection, rubber-banding |
| `src/art/Illustrations.tsx` | Cartoon SVG stickers for questions |
| `src/engine/` | Question types, modes, picker (daily seed, weak-question weighting), scoring |
| `src/screens/` | Home, Daily, Game (all modes), Results, Progress, Settings |
| `src/i18n/` | UI strings (EN/TA) and the 66 book names |
| `src/storage/db.ts` | IndexedDB (Dexie): answer history, rounds |
| `supabase/` | Database migrations + generated seed |
| `content/verses.json` | Verses (KJV + BSI Tamil O.V.) for Verse of the Day, feedback and gospel |
| `content/gospel.json` | Gospel presentation steps + FAQ for seekers |
| `src/online/supabase.ts` | Optional Supabase client: question sync, reports |
| `.claude/skills/bible-trivia-design/` | Design rules for Claude sessions working on this repo |

## Adding a question

```json
{
  "id": "mrk-001", "type": "mcq", "book": "MRK", "chapter": 4, "verse": 39, "difficulty": 1, "answer": 2, "art": "fish",
  "en": { "q": "…", "options": ["…", "…", "…", "…"], "explain": "…" },
  "ta": { "q": "…", "options": ["…", "…", "…", "…"], "explain": "…" }
}
```

- `type`: `mcq` · `tf` (answer is `true`/`false`, no options) · `who` · `book` · `blank` (use `____` for the gap)
- Options are in the **same order** in both languages; `answer` is the index.
- `art` is optional — one of the keys in `src/art/Illustrations.tsx`.
- Every Tamil string should be checked by a Tamil reader before release.

## Database (Supabase)

The app works fully offline from the bundled JSON. Supabase is where content grows (new questions reach players without an app update) and where accounts and leaderboards will live.

**One-time setup**
1. Create a project at supabase.com (the free tier is plenty).
2. **SQL Editor** → run each file in `supabase/migrations/` in order:
   - `20261110000000_init.sql`: books, questions, profiles, answers, daily results, reports, security rules, `daily_leaderboard()`
   - `20261110000100_verses_gospel.sql`: verses, gospel steps, FAQ, reading sources
3. Run `npm run db:seed-sql`, then run the generated `supabase/seed.sql` in the SQL Editor. It is safe to re-run; it updates rows instead of duplicating them.
4. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   The anon key is safe in the app; row-level security decides what it can do. **Never** put the `service_role` key in the app or the repo.

(With the Supabase CLI instead: `supabase link`, then `supabase db push`.)

**What the security rules allow**
| | Not signed in | Signed in |
|---|---|---|
| Read books, verses, gospel, published FAQs & questions | ✅ | ✅ |
| Read drafts / edit content | ❌ | ❌ (use the dashboard) |
| Report a question | ✅ | ✅ |
| Own profile, answers, daily result | — | ✅ own rows only |
| Daily leaderboard (names + scores only) | ✅ | ✅ |

These rules were tested against Postgres 16, including that other people's rows are refused.

**Adding content later:** edit `content/*.json`, run `npm test`, then `npm run db:seed-sql` and re-run `seed.sql`. Or edit rows in the Supabase table editor: the app pulls questions changed since its last sync on startup.

## Scripture text & licensing

- English quotations: KJV (public domain).
- Tamil quotations: Bible Society of India, Tamil O.V. Short quotations are credited "BSI – Tamil – O.V." in the app. **Before publishing widely, confirm permission with BSI** (see PLAN.md §4).
- Questions and explanations are original content.
