# Bible Trivia — வேத வினாடி வினா

Tamil & English Bible trivia as an installable, offline-first web app (PWA).
Cold-grey "liquid glass" design with the Four Horsemen of Revelation 6 as accent colours, line icons, spring animations and cartoon question art.

See **[PLAN.md](PLAN.md)** for the research, feature roadmap and design decisions.

## Put it online

Free hosting on Cloudflare Pages, with a custom domain if you want one: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173   (/?art shows all cartoon illustrations)
npm test           # validates every question + engine logic
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build (needed to test install/offline)
```

## App icon

The cartoon icon (a happy open Bible with a question bubble) is `public/favicon.svg`. After changing it, run `npm run icons` to redraw the PNG icons for phones.

## Project layout

| Path | What |
|---|---|
| `content/packs/*.json` | Question bank (bilingual). Add questions here, then run `npm test`. |
| `src/design/` | Design tokens (cold grey + horse colours), glass materials, grain/aurora |
| `src/motion/springs.ts` | Spring presets, momentum projection, rubber-banding |
| `src/art/Illustrations.tsx` | Cartoon SVG stickers for questions |
| `src/engine/` | Question types, modes, picker (daily seed, weak-question weighting), scoring |
| `src/screens/` | Welcome (sign-in), Home, Daily, Game (all modes), Results, Progress, Settings |
| `src/i18n/` | UI strings (EN/TA) and the 66 book names |
| `src/storage/db.ts` | IndexedDB (Dexie): answer history, rounds |
| `supabase/` | Database migrations + generated seed |
| `content/verses.json` | 365 verses (KJV + BSI Tamil O.V.) for Verse of the Day, memory verses and the gospel; built from `content/verse-list.txt` by `npm run content:verses` |
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
2. **SQL Editor** → New query → paste the whole of **`supabase/setup.sql`** → Run. It contains every migration plus the starter content, and it's safe to run again any time (after pulling updates, or if a run stopped halfway). `npm run db:setup-sql` rebuilds it.
3. **Environment variables:** copy `.env.example` to `.env.local` and fill it in from Supabase → Project Settings → API Keys:

   | Variable | Where it's used | Value |
   |---|---|---|
   | `VITE_SUPABASE_URL` | the app | Project URL, `https://<ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | the app | `sb_publishable_...`, safe to be public |
   | `SUPABASE_URL` | scripts on your computer | same Project URL |
   | `SUPABASE_SECRET_KEY` | scripts on your computer | `sb_secret_...`. **Never** in the app, the repo, or a `VITE_` variable |

   On a hosting service (Vercel, Netlify, Cloudflare Pages), add the two `VITE_` variables in its environment settings. They're built into the page at build time.

4. **Load the Recall questions** (about 17,000 rows; too big to paste into the SQL Editor):
   ```bash
   npm run db:import
   ```
5. **Check everything:**
   ```bash
   npm run db:check
   ```
   It tests the keys, every table, the content counts, what players can and can't see, and the report-email function, and prints the fix for anything missing. It only reads; it never changes data.

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

## Multiple-choice questions (main source)

**Quiz by Book** (the first game mode) has about **33,000 multiple-choice questions across all 66 books**. Pick a book, then the whole book or one chapter. Classic, Speed, Survival, Study and the Daily Challenge mix them in too. Files: `public/packs/mcq/<BOOK>.json`, one per book, downloaded when first used and then kept offline.

- **About 28,500 human-written questions**: Dr. Ted Hildebrandt's chapter quizzes (biblicalelearning.org, Gordon College), from the [BIBLE dataset](https://huggingface.co/datasets/MushroomGecko/BIBLE) (CC BY 4.0). The dataset's machine-generated questions are used only for the 22 books that have no human-written ones (Isaiah, Jeremiah, Hebrews, the letters of Peter and John, and others).
- **Who Said It?** has **3,200 sayings**:
  - the "Who said…?" questions above
  - about 170 well-known sayings written for this app in KJV wording (`content/who/quotes.json`)
  - speeches from across the Bible: speakers from [Clear Bible's speaker data](https://github.com/Clear-Bible/speaker-quotations) (CC BY 4.0), words from the World English Bible (public domain)

  The wrong options are other speakers from the same book.
- Clean-up on import: verse references move out of the question and show after answering; options are shuffled (the source put most answers in B or C); long questions are left out.

```bash
npm run content:mcq                  # rebuild everything (downloads the sources the first time)
npm run content:mcq -- --merge-only  # just add new Tamil translations
```

**Tamil:** translate with IndicTrans2 (`--set mcq`, see `scripts/indictrans2/README.md`), then run `--merge-only`. Until a book is translated, Tamil mode shows its questions in English.

## Recall: human-written questions with answers

**Recall mode** uses about **17,000 human-written questions with answers, covering every chapter of the Bible**: unfoldingWord® Translation Questions, written by Bible translators to check understanding of each chapter. They're stored one file per book in `public/packs/uw/`, downloaded when a player first opens that book, then kept offline. Refresh them with `npm run content:uw`.

These are English only for now. Tamil versions, and multiple-choice versions with options, are the small "generated" part. Each one is checked by a person before it is published.

Credit: *original work by unfoldingWord, available from unfoldingword.org/utq, CC BY-SA 4.0* (shown in the app).

## Tamil for Recall

**Free option (recommended if you have a GPU):** IndicTrans2 by AI4Bharat. See `scripts/indictrans2/README.md` (works well on Lightning AI).

### Or: Google Translate (paid after 500,000 characters a month)

The Recall questions are written in English. `npm run translate:recall` translates them with Google Cloud Translation. Before translating, it swaps Bible names and terms for their Tamil Bible spelling (`content/glossary/names-ta.json`: David → தாவீது, God → தேவன், Moses → மோசே …), so Google keeps them and the result reads like the Tamil Bible.

```bash
npm run translate:recall -- --top 11 --dry-run   # what it would cost (popular books ≈ $6)
npm run translate:recall -- --top 11             # the 11 popular books first
npm run translate:recall                         # everything (≈ $40; first 500,000 characters a month are free)
npm run db:import                                # put the Tamil into Supabase
```
- Progress is saved per book in `content/translations/ta/recall/`. A stopped run continues where it left off and never pays twice.
- In Supabase, Tamil is only filled in where it is empty (`ta_status = machine`). When a reviewer edits the Tamil in the table editor, it becomes `reviewed` automatically and is never overwritten.
- The app shows Tamil in Tamil mode and both languages in Both mode, with a small "machine-translated, tap the flag for mistakes" note until a question is reviewed.
- Add names to the glossary any time; it applies to the next translation run.

## Practice (tab)

Built from the answers stored on the phone (`src/engine/practice.ts`):
- **Fix my mistakes:** wrong answers come back until they're answered right twice in a row.
- **Review:** questions you know come back after 1, 3, 7, 14, then 30 days (spaced repetition).
- **Saved:** the ☆ on any question during a game keeps it here.
- **Weak spots:** accuracy per book, weakest first; tap one to practise that book.
- **Mistakes notebook:** every missed and saved question with its answer, filtered by book.
- **Memory verses:** learn the 365 verses (or your own) by heart; each round hides more words (`src/engine/memory.ts`).
- **Books of the Bible:** which book comes next or before, Old or New Testament, which comes first (`src/engine/drill.ts`).

Practice rounds have no timer and earn half XP; they count towards the daily streak.

**Practice follows the account** (`src/online/practiceSync.ts`, migration 14): answers, saved questions and memory-verse progress sync between a person's devices through `practice_answers`, `saved_questions` and `practice_state`. Each device keeps a copy for offline play; signing out sends what's left and clears the device.

## Offline play

Once the app has been opened online, it keeps questions on the phone. Once a day, in the background, it downloads:
- the popular books and Who Said It?
- the books for the next 3 days' Daily Challenge
- 3 more books each day, until the whole Bible is saved

Offline, games use the saved books, and Quiz by Book dims the others. Daily Challenge and friend challenge results played offline are kept (`outbox` in IndexedDB) and sent when the phone is back online, together with XP and streak. Saved files refresh themselves when used online, so fixes and new Tamil translations arrive on their own. See `src/online/stock.ts` and `src/online/outbox.ts`.

## Accounts, friends and challenges

**Everyone signs in first.** When Supabase is set up, the app opens on a sign-in screen (Google, or email and password), and games, friends and progress appear after signing in. Once signed in, the app also works offline. Without Supabase settings (local development) the app runs without accounts.

Players can sign up with email and password, or with Google. Everyone gets a 6-character **friend code** to share. Friends can:
- **Challenge** each other: the same questions for everyone, played whenever it suits, then scores are compared. Start one from a friend's row, or from any results screen ("Challenge friends with these questions").
- See the **family board**: today's Daily Challenge scores, or all-time challenge wins.
- Track **head-to-head records**: each friend shows your all-time record against them (wins–losses–ties). Tap a friend for best scores and your full shared challenge history.

XP, streak and **streak hearts** are saved to the account, so progress follows you to another phone. Every 5 days in a row earns a heart (up to 3); a heart automatically saves the streak on a missed day.

**Supabase settings (one time):** Authentication → Sign In / Providers → **Email** enabled.

**Google sign-in (optional):**
1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → **OAuth consent screen**: app name "Bible Trivia", your email; audience **External**; publish it (or add family emails as test users).
2. APIs & Services → **Credentials → Create credentials → OAuth client ID** → type **Web application**:
   - Authorized JavaScript origins: `http://localhost:5173` (and your hosted address later)
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Sign In / Providers → **Google** → enable, paste the Client ID and Client secret.
4. Supabase → Authentication → URL Configuration → **Redirect URLs**: add `http://localhost:5173/**` (and the hosted address later).

Google accounts get their Google name as their profile name (changeable in Settings).
- For a family app, turn **off "Confirm email"**. Supabase's built-in email sender only sends a few emails per hour, so confirmation emails can get stuck. With it on, people must click the emailed link before they can sign in.
- Authentication → URL Configuration → **Site URL**: your app's address, such as `http://localhost:5173` now, or the hosted address later. Password-reset links open there.

The friends and challenge rules are in `supabase/migrations/20261111000600_social.sql`: people only see their own friends, challenges and scores, and can only challenge friends.

## Emails (password reset, confirmations, security notices)

Bilingual email templates for every Supabase Auth email are in `supabase/templates/`, with subjects and where to paste them in `supabase/templates/README.md` (`npm run emails` rebuilds them). **Connect your own email sender (free with Gmail) before sharing the app.** Supabase's built-in sender only reaches your own team's addresses.

## Notifications

Daily verse, Daily Challenge reminder, streak warning, and friend and challenge alerts as phone notifications (web push), each switchable in Settings. They're scheduled by **Supabase Cron**, so no other server is needed. Setup: `supabase/functions/push/README.md`.

## Reports from players

Every question, Recall card, FAQ answer and the Verse of the Day has a flag button. Players pick what's wrong (wrong answer, typo, Tamil translation, confusing, other) and can add a comment and contact details.
- **With Supabase:** reports are stored in `question_reports` and emailed to the admin. Setup is in `supabase/functions/report-email/README.md`. Open reports: `select * from open_reports;`
- **Offline:** reports wait on the phone and are sent when it's back online.
- **Without Supabase:** set `VITE_ADMIN_EMAIL` in `.env` and the flag opens the email app with the report already filled in.

## Growing the question bank (10,000+)

**Supabase is the source of truth.** The app ships about 70 starter questions so it works offline from the first launch, then downloads every published question from the database in the background and keeps them offline.

Targets live in `content/targets.json`: 20 per chapter, +10 for important chapters, 4 per psalm, 12 per Proverbs chapter, popular books first. That's about 22,000 in total. Run `npm run q:plan` to see what's still missing.

**1. Write questions** with Claude (needs `ANTHROPIC_API_KEY`):
```bash
npm run q:try -- --book GEN --chapter 1        # one chapter right away, to check quality
npm run q:submit -- --top 11                    # the 11 popular books as one batch (half price)
npm run q:collect                               # once the batch has finished (usually under an hour)
```
Each question is checked automatically: both languages, four distinct options, a valid book, chapter and verse, Tamil script present, and no repeats. New questions are saved to `content/books/<BOOK>.json` as `status: "review"`. Rejected ones go to `.generator/` with the reason. Running `submit` again only asks for what's still missing.

**2. Import into Supabase** (reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from `.env.local`):
```bash
npm run db:import
```
Only new questions are added. Questions already in the database are never overwritten, so reviewers' fixes are safe.

**3. Review in Supabase**: Table editor → `questions`, filter `status = review`. Fix the wording, then set `status` to `published` (or `retired`), and optionally add `review_note` and `reviewed_by`. Published questions reach players on their next app start. Run `select * from book_progress` in the SQL editor for per-book progress.

**4. Back up** reviewers' work into git now and then: `npm run db:export`.

**Questions from other apps or websites:** don't copy them. Their wording is copyrighted, even though Bible facts are not. Import a collection only when it is openly licensed or you have written permission, and fill in `attribution` and `license` for those rows.

## Scripture text & licensing

- English quotations: KJV (public domain).
- Tamil quotations: Bible Society of India, Tamil O.V. Short quotations are credited "BSI – Tamil – O.V." in the app. **Before publishing widely, confirm permission with BSI** (see PLAN.md §4).
- Questions and explanations are original content.
