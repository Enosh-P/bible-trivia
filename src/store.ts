import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from './engine/types';
import { STRINGS } from './i18n/strings';
import { dayKey } from './engine/picker';
import { nextStreak } from './engine/scoring';

export type QuestionLang = Lang | 'both';
export type ThemePref = 'dark' | 'light' | 'system';

interface Settings {
  uiLang: Lang;
  qLang: QuestionLang;
  theme: ThemePref;
  sound: boolean;
  haptics: boolean;
  textScale: number;
  /** Show the verse on the answer card after each question (on by default). */
  showVerses?: boolean;
  /** Quiz by Book: seconds per question (20, 40 or 60). */
  quizSeconds?: 20 | 40 | 60;
}

interface Progress {
  xp: number;
  streak: number;
  lastDay?: string;
  /** Saves a missed day each; one earned every 5 streak days (max 3). */
  hearts: number;
  /** Set when hearts healed missed days, so Home can say so once. */
  healedNote?: { day: string; count: number };
  /** Set when a heart was earned, so the results screen can celebrate it. */
  heartEarnedOn?: string;
  dailyDoneOn?: string;
  dailyScore?: number;
  totalAnswered: number;
  totalCorrect: number;
  /** Memory verses: level per verse id (4 = learned). */
  memory?: Record<string, number>;
  /** When memory verses or your own verses last changed here (for syncing). */
  practiceUpdatedAt?: number;
  /** Verses the player added to Memory verses (typed or pasted). */
  myVerses?: { id: string; book: string; chapter: number; verse: number; verseEnd?: number; en: string; ta: string }[];
}

interface AppState extends Settings, Progress {
  set: (patch: Partial<Settings>) => void;
  finishRound: (r: { xp: number; correct: number; total: number; daily?: boolean; score: number }) => void;
}

/** Phones set to Tamil start in Tamil. */
function defaultLang(): Lang {
  try {
    return navigator.languages?.some((l) => l.toLowerCase().startsWith('ta')) ? 'ta' : 'en';
  } catch {
    return 'en';
  }
}

/**
 * The interface follows the question language: Tamil trivia gets a Tamil UI.
 * Only in "both" mode can the interface language be picked separately.
 */
function linkLanguages(patch: Partial<Settings>): Partial<Settings> {
  if (patch.qLang && patch.qLang !== 'both') return { ...patch, uiLang: patch.qLang };
  return patch;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      uiLang: defaultLang(),
      // Questions in both English and Tamil to start with; the app's own words follow the phone.
      qLang: 'both',
      theme: 'light',
      sound: true,
      haptics: true,
      textScale: 1,
      xp: 0,
      streak: 0,
      hearts: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      set: (patch) => set(linkLanguages(patch)),
      finishRound: (r) =>
        set((s) => {
          const today = dayKey();
          const st = nextStreak({ streak: s.streak, lastDay: s.lastDay, hearts: s.hearts }, today);
          return {
            xp: s.xp + r.xp,
            streak: st.streak,
            lastDay: st.lastDay,
            hearts: st.hearts ?? 0,
            ...(st.healed ? { healedNote: { day: today, count: st.healed } } : {}),
            ...(st.earned ? { heartEarnedOn: today } : {}),
            totalAnswered: s.totalAnswered + r.total,
            totalCorrect: s.totalCorrect + r.correct,
            ...(r.daily ? { dailyDoneOn: today, dailyScore: r.score } : {}),
          };
        }),
    }),
    {
      name: 'bt-app',
      version: 3,
      migrate: (persisted, version) => {
        const s = persisted as Partial<Settings>;
        // v1 let the UI and question languages differ; v2 links them.
        if (version < 2 && s.qLang && s.qLang !== 'both') s.uiLang = s.qLang;
        // v3: light is the new default look (dark was the old default, not a choice).
        if (version < 3) s.theme = 'light';
        return s as AppState;
      },
    },
  ),
);

/** UI strings in the chosen app language. */
export function useT() {
  return STRINGS[useApp((s) => s.uiLang)];
}
