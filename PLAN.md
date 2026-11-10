# Bible Trivia PWA — Tamil & English
*Project plan · v0.2 · Nov 2026 — Phase 0 + most of MVP built*

A mobile-first, installable web app (PWA) for Bible trivia in **Tamil and English**. It has many game formats, line icons, colour themes taken from the Book of Revelation, and iOS-style "liquid glass" motion and texture throughout.

---

## 1. What the research shows (what popular Bible trivia apps do)

The top-rated apps (Aged Studio *Bible Trivia*, Topy *Word Quiz*, *Daily Bible Trivia*, VerseQuest, Versle, Bible Arena) all share the same core loop:

| Pattern | Seen in | Why it works |
|---|---|---|
| **Daily challenge** (5–10 questions, same for everyone) | Daily Bible Trivia, VerseQuest, Bible Streak | Habit forming; shareable result |
| **Streaks + XP + levels** | VerseQuest, Bible Arena, Versle | Retention |
| **Many game modes** (speed, survival, fill-the-blank, build-the-verse, Wordle-style) | VerseQuest (14 modes) | Variety keeps it from feeling repetitive |
| **Lifelines** (50/50, skip, time freeze) | Bible Quiz Game Offline | Reduces frustration |
| **Head-to-head / group play** (code to join, 1v1) | VerseQuest, Bible Arena, Bible Buff | Social, church/youth-group use |
| **Leaderboards** | Most apps | Competition |
| **Timer vs. no-timer study mode** | Devo Bible Quiz | Serves both gamers and learners |
| **Offline play** | Several | Important in India where data can be patchy |

**Common complaints we can win on:** ads between levels, paywalled modes, and ambiguous questions. Our plan: **no ads**, **every question shows its Bible reference** plus a short explanation, and a "report this question" button.

**Gap in the market:** almost no polished **Tamil** Bible trivia app exists, and none is properly bilingual. That is our main differentiator.

---

## 2. Feature list

### 2.1 Game formats
| # | Format | Description | Phase |
|---|---|---|---|
| 1 | **Classic Quiz** | 4-option multiple choice, pick book/testament/difficulty | MVP |
| 2 | **True / False** | Fast swipe left/right (card swipe with spring physics) | MVP |
| 3 | **Daily Challenge** | 7 fixed questions per day, shareable result grid (like Wordle) | MVP |
| 4 | **Who Said It?** | Quote → pick the speaker | MVP |
| 5 | **Which Book?** | Verse/event → pick the book | MVP |
| 6 | **Fill the Blank** | Verse with a missing word, pick or type it | MVP |
| 7 | **Speed Round** | 60 seconds, as many as possible | v1 |
| 8 | **Survival** | 3 lives, gets harder each question | v1 |
| 9 | **Build the Verse** | Drag word tiles into the right order (drag with spring physics) | v1 |
| 10 | **Timeline** | Drag events into chronological order | v1 |
| 11 | **Match Pairs** | Connect person ↔ event, or Tamil ↔ English name | v1 |
| 12 | **Verse Word** (Wordle-style) | Guess a Bible word in 6 tries. English first; Tamil needs a grapheme-aware version (see §4) | v1.5 |
| 13 | **Study Mode** | No timer, explanation and reference after every answer | MVP |
| 14 | **Pass & Play** | 2–6 players on one phone (youth groups, families) | v1 |
| 15 | **Live Duel / Room Code** | Real-time 1v1 or group via a room code | v2 (needs backend) |

### 2.2 Progress & motivation
- XP, levels, daily streak (with one "streak freeze" per week)
- Badges, e.g. "Read all 4 Gospels", "100 correct in Tamil", "Survived 20"
- Per-book mastery map: the 66 books as a grid that fills in as you master each one
- Review queue: questions you got wrong come back later (simple spaced repetition)
- Lifelines: 50/50, Skip, +10s

### 2.3 Bilingual (Tamil ⇄ English)
- UI language and question language are **separate settings**. For example, the UI can be in English while questions are in Tamil.
- **Side-by-side mode:** shows the question in both languages (good for learners).
- Each question is stored once with `ta` and `en` fields, so the two languages never drift apart.
- Tamil book names and the reference format are localised (e.g. யோவான் 3:16).

### 2.4 App / PWA
- Installable on Android and desktop (native install prompt) and on iOS (a custom "Add to Home Screen" guide sheet, since iOS has no install prompt)
- Works fully **offline**: question packs are cached; progress is saved on the device (IndexedDB)
- Light/dark mode, text size setting, reduced-motion and reduced-transparency support
- Haptics where supported (Android). iOS Safari has no vibration API, so iOS gets sound plus visual feedback instead.
- Share result card (Web Share API)
- Optional later: account sync, global leaderboard (v2)

---

## 3. Visual design

### 3.1 Colours — cold grey + the Four Horsemen (Revelation 6:1–8)
*Updated: gold and the "New Jerusalem" theme were removed. One palette, with light and dark variants of the same cold steel grey.*

**Base: cold blue-grey steel**
| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0D1015` | `#E6EAEF` |
| `--bg-3` (raised) | `#1A2029` | `#F6F8FA` |
| `--text` | `#E7ECF2` | `#121821` |
| `--text-2` | `#9BA6B5` | `#4F5A69` |

**Accents: the four horses**
| Horse | Meaning | Hue | Used for |
|---|---|---|---|
| White | Conquest (bow, crown) | `#EEF2F6` | Primary, Classic, Daily |
| Red ("fiery red") | War (sword) | `#E0493E` | Wrong answers, Speed, Survival, streaks |
| Black | Famine (balances) | `#050608` tile, silver `#C9D2DE` stroke | True/False, Which Book |
| Pale (Gk. *chlōros*) | Death | `#8FBFA3` pale green | Correct answers, Who Said It, Fill the Blank, Study |

Every horse has three tokens: `--{horse}` (fill), `--{horse}-ink` (icon stroke tuned per theme), `--{horse}-wash` (icon tile background). See `src/design/tokens.css`.

### 3.2 Line icons in their own colour
- Lucide line icons, stroke `1.6`, rounded. Each icon sits on a small **tile tinted with its horse colour**, and the stroke uses that horse's ink colour (red flame for streaks, pale-green sparkle for XP, a black tile with a silver stroke for the balances, and so on).
- Custom horse-head icon drawn on the same 24px grid (`HorseHead` in `src/components/icons.tsx`).

### 3.2b Cartoon pictures on questions *(new)*
- Questions can carry `"art": "<key>"`, which shows a friendly cartoon "sticker" above the question. It pops in on a spring and wiggles when tapped.
- Style: chunky ink outlines, flat fills, cute faces, horse-palette accents, light sticker card (works in both themes). Drawn as inline SVG, so it's tiny and works offline.
- Done: ark, fish (Jonah), lion (sleeping, Daniel), sling (David), burning bush, Bethlehem star, loaves & fish, black horse with balances, Zacchaeus' tree.
- Next: Moses & tablets, Red Sea, Goliath, Jericho walls, manger, empty tomb, boat on the storm, Pentecost flames, the other three horses. Aim for 30–40 so most questions get one.

### 3.3 "Liquid glass", motion & texture
This follows the **apple-design** skill (loaded and applied — see §6).

- **Glass surfaces:** the tab bar, top bar, sheets and answer cards are translucent layers (`backdrop-filter: blur() saturate()`) with a bright top edge and content scrolling underneath. Bigger surfaces get more blur and deeper shadow.
- **Liquid refraction:** an SVG displacement filter gives a "lens" edge on glass buttons. This only works in Chromium, so Safari and Firefox get plain blur (progressive enhancement).
- **Springs everywhere:** the Motion library (motion.dev) is the animation engine.
  - Default: no bounce, ~0.35s response (calm, no overshoot)
  - Small bounce only after a flick (True/False swipe, sheet throw)
  - Every animation can be interrupted: grab a sheet mid-close and it follows your finger
- **Gestures:** press feedback on touch-down (scale 0.97), sheets that follow the finger 1:1, momentum projection on release, rubber-band at edges.
- **Page transitions:** the View Transitions API morphs a mode card into its game screen (shared-element "zoom from where you tapped"). Exit follows the same path back.
- **Answer feedback:** a correct answer gives an emerald "liquid fill" ripple from the tap point plus a sound. A wrong answer gives a soft horizontal shake plus a red tint. Visual, sound and haptic fire on the same frame.
- **Texture:** a subtle film grain / parchment noise overlay (SVG `feTurbulence`, ~3–4% opacity), plus a slow, gentle "aurora" gradient behind the glass in the theme colours.
- **Accessibility:** reduced motion switches to cross-fades only, reduced transparency switches to solid surfaces, and higher-contrast mode adds solid borders.

### 3.4 Typography
- English: system UI font (SF Pro on iOS), plus a serif (*Fraunces*) for verse quotes
- Tamil: **Noto Sans Tamil** / **Noto Serif Tamil** for verses (Google Fonts, OFL)
- Tamil needs about 15–20% more line-height and no negative letter-spacing. These are set per language with `:lang(ta)`.

---

## 4. Content & licensing — needs a decision ⚠️

| Item | Status |
|---|---|
| **English verse text** | Use **KJV** or **WEB (World English Bible)**. Both are public domain and safe. |
| **Tamil verse text (BSI O.V. / Union Version)** | **Copyrighted by the Bible Society of India.** Short quotations (under ~1,000 verses, with the credit "BSI – Tamil – O.V.") are generally allowed, but bundling a lot of text needs **written permission from BSI**. |
| Tamil Ecumenical Bible DB (github: jayarathina) | The repo is under the Unlicense, but the *translation itself* may still be copyrighted. Verify before use. |
| **Questions** | We write our own, so we own them. Each one stores a reference, difficulty, category, `ta` + `en` text, and an explanation. |

**Recommendation:** questions **paraphrase** facts instead of quoting long Tamil verse text, and show the reference (e.g. யோவான் 3:16). Only modes that need exact wording (Fill the Blank, Build the Verse) use short quoted verses, with the BSI credit, staying well under the limit. Ask BSI for permission early in parallel.

**Seed content target:** 600 questions for MVP (300 OT, 300 NT, 3 difficulties), growing to 2,000+. They will be stored as JSON packs per book group, validated by a schema, and reviewed by a Tamil speaker.

**Tamil word game note:** Tamil letters are grapheme clusters (e.g. கொ = க + ொ), so the Wordle-style mode has to count *letters as people see them* (`Intl.Segmenter`), not code points.

---

## 5. Technical plan

### 5.1 Stack
| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + React + TypeScript** | Fast, huge ecosystem, Motion works best with React |
| Motion | **Motion** (motion.dev) + View Transitions API | Interruptible springs, gesture + velocity handoff |
| Styling | CSS variables (design tokens) + CSS Modules or Tailwind v4 | Themes are just token swaps |
| State | Zustand | Small and simple |
| Storage | IndexedDB via Dexie | Offline progress, review queue |
| i18n | Lightweight custom dictionary (or i18next) | Two languages, kept simple |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest, offline cache, update prompt |
| Icons | `lucide-react` + custom SVG sprite | Line icons |
| Tests | Vitest + Playwright (mobile viewports) | Logic + real-device-like checks |
| Hosting | Cloudflare Pages / Vercel / GitHub Pages | Free, HTTPS (required for PWA) |
| v2 backend | Supabase (auth, leaderboards, realtime duels) | Only when online features are added |

### 5.2 Proposed repo structure
```
bible-trivia/
├─ .claude/skills/           # project skills (see §6)
├─ public/                   # icons, maskable icons, iOS splash screens
├─ content/
│  ├─ schema.json            # question schema
│  └─ packs/                 # gospels.json, torah.json, …
├─ src/
│  ├─ app/                   # routes, layout, providers
│  ├─ design/                # tokens.css, themes (horsemen / new-jerusalem), glass.css, grain
│  ├─ motion/                # spring presets, gesture hooks (useDragSheet, useSwipeCard)
│  ├─ components/            # GlassCard, TabBar, Sheet, AnswerButton, Icon…
│  ├─ modes/                 # classic/, truefalse/, daily/, buildverse/, timeline/ …
│  ├─ engine/                # question picker, scoring, streaks, spaced repetition
│  ├─ i18n/                  # ta.json, en.json, book names
│  ├─ storage/               # Dexie db
│  └─ pwa/                   # install prompt, iOS install sheet, update toast
├─ scripts/validate-content.ts
├─ tests/
└─ PLAN.md
```

### 5.3 Screens
1. **Home**: daily challenge card, streak flame, continue button, mode grid
2. **Modes**: glass cards, each with its horse/stone accent
3. **Game screen**: question, answers, timer ring, lifelines, progress
4. **Result**: score, XP gained, review answers, share card
5. **Progress**: 66-book mastery map, badges, stats
6. **Settings**: language (UI / questions / side-by-side), theme, sound, haptics, text size, install app

Navigation is a bottom glass tab bar: **Play · Daily · Progress · Settings**.

---

## 6. Claude skills to use

| Skill | Where it is used |
|---|---|
| **apple-design** ✅ (loaded) | Spring values, gestures, interruptible animation, glass materials, typography, reduced motion. This is the source of §3.3. |
| **artifact-design** | Quick visual previews of themes and screens for you to approve before building |
| **run** | Launch the app and take mobile screenshots to verify each milestone |
| **code-review** / **security-review** | Before each milestone merge |
| **skill-creator** | Create a **project skill** in `.claude/skills/bible-trivia-design/` that records *our* tokens, spring presets, icon rules and Tamil typography rules, so every future session builds consistently |
| **simplify** | Clean-up passes |

There is no ready-made "liquid glass" or "PWA" skill in your list, so the project skill above fills that gap.

---

## 7. Milestones

| Phase | Scope | Result |
|---|---|---|
| **0. Setup** | Repo, Vite/React/TS, lint, tokens, both themes, glass + grain, icon set, project skill | Styled shell you can install |
| **1. MVP** | Home, Classic, True/False, Who Said It, Which Book, Fill the Blank, Study mode, Daily Challenge, results, local progress, Tamil/English, offline, 600 questions | Usable app |
| **2. v1** | Speed, Survival, Build the Verse, Timeline, Match Pairs, Pass & Play, badges, mastery map, review queue, share cards | Feature-rich app |
| **3. v1.5** | Verse Word (Wordle-style) in EN and TA, content expanded to 2,000+ | |
| **4. v2** | Accounts, global leaderboard, live duels with room codes (Supabase) | Social features |

---

## 8. Status
- ✅ Phase 0 done: Vite + React + TS, cold-grey/horsemen tokens, glass + grain + aurora, icons, PWA install + offline, project skill.
- ✅ MVP modes built: Classic, Daily, True/False (swipe), Who Said It, Which Book, Fill the Blank, Study, plus Speed and Survival.
- ✅ Bilingual UI + questions (EN / TA / both side-by-side), results + share, streak, XP, levels, book mastery map.
- ✅ 70 seed questions (target 600), 9 cartoon illustrations, Supabase schema + seed generator.
- ✅ Bible verses: Verse of the Day, full verse shown after answering, 32 verses (KJV + BSI O.V.).
- ✅ Gospel tab: "The Way of Life" (8 steps following the outline of *The Mystery of Human Life*, in our own words) + 10 seeker FAQs, with further-reading titles from Watchman Nee / Witness Lee.
- ✅ Tamil UI follows Tamil questions; Tamil-language phones start in Tamil.
- ✅ Light mode: clear liquid-drop glass, flat colours (no gradients). No sparkle icons anywhere.
- ✅ Supabase: 2 migrations, row-level security tested, leaderboard function, seed generator, background question sync.
- ✅ Question bank at scale: Supabase is the source of truth; targets total about 22,000 (20/chapter, more for key chapters, fewer for Psalms); Claude batch generator with automatic checks; importer that never overwrites reviewed rows; review workflow and `book_progress` view; paged offline sync in the app.
- ⏳ Next: grow the question bank, more art, Build the Verse, Timeline, Match Pairs, Pass & Play.

## 9. Decisions (original list)
1. **App name**: ideas: *Vedha Quest*, *Manna*, *Lampstand / விளக்குத்தண்டு*, *Seven Seals*.
2. **Tamil Bible version**: BSI O.V. (most familiar, needs permission for heavy use) or another?
3. **Stack**: OK with React + Vite + TypeScript?
4. **Default theme**: ✅ decided: cold grey + Four Horsemen (dark default, light variant).
5. **Online features**: is offline-only fine for MVP, with leaderboards/duels later?
6. **Question writing**: should I generate a first draft of the question bank for you to review, or do you have existing questions?
