---
name: bible-trivia-design
description: Design system and content rules for the Bible Trivia PWA (Tamil & English). Use when adding or changing any screen, component, animation, colour, icon, cartoon illustration, or question in this repo.
---

# Bible Trivia design rules

Follow these so every screen feels like the same app. Motion and material rules come from Apple's *Designing Fluid Interfaces* (see the `apple-design` skill for the reasoning).

## Colour: cold light grey + dark sky teal, solid only
- **Light mode is the default.** Dark is a choice in Settings.
- **Liquid glass, solid colours, no gradients.** Cards are see-through glass (`.glass`: ~50% tint, 24px blur, bright 1px edge, inner top highlight). Floating chrome uses `.glass-thick`. Behind everything are three flat, solid-colour shapes (`.atmosphere .blob`, sky teal, blue-grey and a touch of red) that the glass blurs. Never use gradient fills on cards or buttons.
- Light / Dark / System is switchable from the sidebar (desktop), the Home header (phone) and Settings (`ThemeToggle`).
- Base: cold light grey `--bg #f1f3f5`, white cards. Dark: charcoal `#111417`, cards `#1a1e22`.
- Accent: dark sky teal (`--accent #137c99`, white text on it via `--on-accent`, teal text `--accent-ink #0e6a84`; dark mode `#3fb6d6`). It's used for primary buttons, correct answers, toggles and the active tab. Cartoons use `#2a9fc0` / `#137c99`. In Both mode, Tamil is bold deep purple (`--ta-ink`) so it never reads as a link or the accent.
- **Never use gold.** The four horse colours remain as icon-tile accents only (`--{h}`, `--{h}-ink`, `--{h}-wash`); `pale` is the accent teal. Wrong = red, correct = teal.

## Layout
- Mobile: bottom tab bar. Desktop (≥960px): left sidebar (`--sidebar-w`), wider grids; game, results and recall stay at a reading width (720px).

## Icons
- Lucide line icons, `strokeWidth={STROKE}` (1.6). Never filled icon sets.
- **Never use the sparkle icon** (`Sparkles`, `Sparkle`, or sparkle/twinkle marks in art) for anything. The user explicitly rejected it.
- An icon representing a thing goes on an `IconTile` with its horse colour. Every icon gets its own colour highlight.
- Custom icons are drawn on Lucide's 24px grid with round caps (see `HorseHead`).

## Cartoon art (`src/art/Illustrations.tsx`, `src/art/ModeArt.tsx`)

Game-mode tiles on Home show only a cartoon (`ModeArt`) and the mode name, with no counts or descriptions. Tapping a tile opens a sheet with how to play and a Start game button. A new mode needs a cartoon, `modeHow` lines (EN and TA), and an entry in `MODE_ORDER`.

- viewBox `0 0 160 120`, ink outline `#1d2430` at 3px with round caps and joins, flat fills from the `C` palette, no gradients.
- Friendly faces where they fit. Keep it respectful: no depictions of God or Jesus' face.
- Add the key to the `ArtKey` type, register it in `ART`, then check it at `/?art` in dev.

## Surfaces
- Animate `transform` and `opacity` only. A persisting `filter` on a parent breaks backdrop blur on floating chrome.
- Overlays (sheets, toasts) render through a portal.

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
