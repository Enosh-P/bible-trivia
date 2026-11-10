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
}

interface Progress {
  xp: number;
  streak: number;
  lastDay?: string;
  dailyDoneOn?: string;
  dailyScore?: number;
  totalAnswered: number;
  totalCorrect: number;
}

interface AppState extends Settings, Progress {
  set: (patch: Partial<Settings>) => void;
  finishRound: (r: { xp: number; correct: number; total: number; daily?: boolean; score: number }) => void;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
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
      qLang: defaultLang(),
      theme: 'dark',
      sound: true,
      haptics: true,
      textScale: 1,
      xp: 0,
      streak: 0,
      totalAnswered: 0,
      totalCorrect: 0,
      set: (patch) => set(linkLanguages(patch)),
      finishRound: (r) =>
        set((s) => {
          const today = dayKey();
          const st = nextStreak({ streak: s.streak, lastDay: s.lastDay }, today, yesterdayKey());
          return {
            xp: s.xp + r.xp,
            streak: st.streak,
            lastDay: st.lastDay,
            totalAnswered: s.totalAnswered + r.total,
            totalCorrect: s.totalCorrect + r.correct,
            ...(r.daily ? { dailyDoneOn: today, dailyScore: r.score } : {}),
          };
        }),
    }),
    {
      name: 'bt-app',
      version: 2,
      // v1 let the UI and question languages differ; v2 links them.
      migrate: (persisted, version) => {
        const s = persisted as Partial<Settings>;
        if (version < 2 && s.qLang && s.qLang !== 'both') s.uiLang = s.qLang;
        return s as AppState;
      },
    },
  ),
);

/** UI strings in the chosen app language. */
export function useT() {
  return STRINGS[useApp((s) => s.uiLang)];
}
