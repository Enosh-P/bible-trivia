---
name: bible-trivia-design
description: Design system and content rules for the Bible Trivia PWA (Tamil & English). Use when adding or changing any screen, component, animation, colour, icon, cartoon illustration, or question in this repo.
---

# Bible Trivia design rules

Follow these so every screen feels like the same app. Motion and material rules come from Apple's *Designing Fluid Interfaces* (see the `apple-design` skill for the reasoning).

## Colour: cold grey + the Four Horsemen
- **Never use gold or warm yellow** as a UI colour. The user explicitly rejected it.
- Base is cold blue-grey steel. Accents are only the four horses (Revelation 6):
  - `white`: conquest → primary, Classic, Daily
  - `red`: war → wrong answers, Speed, Survival, streak flame
  - `black`: the balances → True/False, Which Book (black tile with a **silver** stroke)
  - `pale` (chlōros, pale green) → correct answers, Who Said It, Fill the Blank, Study
- Only use tokens from `src/design/tokens.css`. Each horse has `--{h}`, `--{h}-ink`, `--{h}-wash`. Add a `.horse-{h}` class to get `--h`, `--h-ink`, `--h-wash`.
- Correct = pale, wrong = red, always.

## Icons
- Lucide line icons, `strokeWidth={STROKE}` (1.6). Never filled icon sets.
- **Never use the sparkle icon** (`Sparkles`, `Sparkle`, or sparkle/twinkle marks in art) for anything. The user explicitly rejected it.
- An icon representing a thing goes on an `IconTile` with its horse colour. Every icon gets its own colour highlight.
- Custom icons are drawn on Lucide's 24px grid with round caps (see `HorseHead`).

## Cartoon art (`src/art/Illustrations.tsx`)
- viewBox `0 0 160 120`, ink outline `#1d2430` at 3px with round caps and joins, flat fills from the `C` palette, no gradients.
- Friendly faces where they fit. Keep it respectful: no depictions of God or Jesus' face.
- Add the key to the `ArtKey` type, register it in `ART`, then check it at `/?art` in dev.

## Light mode
- **No gradient colours in light mode.** Fills are flat colour. Behind the glass sit flat, solid coloured shapes (`.drops`) instead of the aurora.
- Light glass is clear "liquid drop" glass: very transparent white (`--surface` ≈ 26%), strong blur and saturation, a bright rim, and an inner curve of light and shade made with inset shadows, not gradients.

## Glass & texture
- Surfaces use `.glass` (or `.glass-thick` for big or floating ones). Add `.liquid` to hero surfaces for Chromium refraction.
- **Never put `filter` (including `blur(0px)`) or `opacity` animations that persist on an ancestor of a glass element.** It turns off backdrop blur. Animate `transform` and `opacity` only, and only transiently.
- The grain and aurora live in `Atmosphere`. Don't add other full-screen moving backgrounds.

## Motion
- Use presets from `src/motion/springs.ts`: `calm` (default, no bounce), `snappy` (press), `sheet`, `flick` (only after a gesture with momentum).
- Respond on pointer-down. `Pressable` already does the press scale and tap sound.
- Gestures: drag 1:1, decide with `project(velocity)`, and hand velocity to the spring.
- Enter and exit along the same path (game slides in from the right and leaves to the right).
- `MotionConfig reducedMotion="user"` is on. Don't loop animations slower than one cycle per 5 seconds, except the aurora, which is turned off for reduced motion.

## Type & language
- `lang="ta"` on Tamil text: it gets Noto Sans/Serif Tamil, taller line-height, and no negative tracking.
- Verse quotes use `.verse` (Fraunces / Noto Serif Tamil).
- Every UI string lives in `src/i18n/strings.ts` in **both** `en` and `ta`. TypeScript enforces this.

## Content
- **Prefer human-written sources.** The main source is unfoldingWord Translation Questions (`public/packs/uw/`, Recall mode). Generated content (Tamil translations, multiple-choice options) is the smaller part and always goes to review first.
- Every question-like item must show a `ReportButton` (`src/components/Report.tsx`) with a target from `src/online/reports.ts`.
- Sheets and overlays render through a portal (see `Sheet`). A transformed parent breaks `position: fixed`.
- **Supabase is the source of truth** for questions. `content/books/*.json` holds new questions waiting to be imported, plus backups (`npm run db:export`). Never overwrite reviewed rows; the importer only inserts new ids.
- New questions always start as `status: "review"`. Only a human reviewer publishes, because the Tamil needs a native reader.
- Never copy questions from other apps or websites. Use original or openly licensed content only, and record `attribution` and `license` for imported content.
- All checks go through `scripts/lib/validate.mjs` (the generator, the importer and the tests share it).
- Questions live in `content/packs/*.json`, bilingual, with options in the same order. `npm test` validates them.
- Each mode needs at least `length` questions of its types; the tests check this.
- English quotes are KJV. Tamil quotes are BSI O.V., kept short. Prefer paraphrase plus a reference.
