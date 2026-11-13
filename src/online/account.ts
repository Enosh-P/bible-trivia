import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useApp } from '../store';
import type { Horse, ModeId } from '../engine/modes';

/*
 * Accounts, friends and challenges (Supabase Auth + the functions in
 * supabase/migrations/20261111000600_social.sql). Everything here is optional:
 * without Supabase or without signing in, the app works as before.
 */

export interface Profile {
  id: string;
  display_name: string;
  avatar: Horse;
  friend_code: string;
  xp: number;
  streak: number;
  last_day: string | null;
  /** Added by migration 11; missing until it has been run. */
  hearts?: number;
}

export interface Friend {
  user_id: string;
  display_name: string;
  avatar: Horse;
  friend_code: string | null;
  xp: number | null;
  streak: number | null;
  status: 'pending' | 'accepted';
  incoming: boolean;
}

export interface ChallengePlayer {
  user_id: string;
  name: string;
  avatar: Horse;
  me: boolean;
  score: number | null;
  correct: number | null;
  total: number | null;
  finished_at: string | null;
}

export interface Challenge {
  id: string;
  mode: ModeId;
  question_ids: string[];
  created_at: string;
  expires_at: string;
  created_by: string;
  players: ChallengePlayer[];
}

export interface BoardRow {
  rank: number;
  user_id: string;
  display_name: string;
  avatar: Horse;
  score: number;
  correct: number;
  total: number;
  is_me: boolean;
}

export interface FriendRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface HistoryRow {
  challenge_id: string;
  mode: ModeId;
  created_at: string;
  expires_at: string;
  created_by: string;
  question_ids: string[];
  my_score: number | null;
  my_correct: number | null;
  my_total: number | null;
  my_finished_at: string | null;
  their_score: number | null;
  their_correct: number | null;
  their_total: number | null;
  their_finished_at: string | null;
  players: number;
}

export interface AllTimeRow {
  rank: number;
  user_id: string;
  display_name: string;
  avatar: Horse;
  wins: number;
  played: number;
  xp: number;
  is_me: boolean;
}

interface AccountState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  friends: Friend[];
  challenges: Challenge[];
  /** Your all-time record against each friend, by user id. */
  records: Record<string, FriendRecord>;
  /** True after opening a password-reset link: the app asks for a new password. */
  recovering: boolean;
  setSession: (s: Session | null) => void;
  refresh: () => Promise<void>;
}

export const useAccount = create<AccountState>((set, get) => ({
  ready: !supabase,
  session: null,
  profile: null,
  friends: [],
  challenges: [],
  records: {},
  recovering: false,
  setSession: (session) => set({ session, ready: true, ...(session ? {} : { profile: null, friends: [], challenges: [], records: {} }) }),
  refresh: async () => {
    if (!supabase || !get().session) return;
    const uid = get().session!.user.id;
    const [p, f, c, r] = await Promise.all([
      loadProfile(uid),
      supabase.rpc('my_friends'),
      supabase.rpc('my_challenges'),
      supabase.rpc('friend_records'),
    ]);
    if (p.data) {
      set({ profile: p.data as Profile });
      await mergeProgress(p.data as Profile);
    }
    if (f.data) set({ friends: f.data as Friend[] });
    if (c.data) set({ challenges: c.data as Challenge[] });
    if (r.data) {
      const records: Record<string, FriendRecord> = {};
      for (const row of r.data as (FriendRecord & { user_id: string })[]) records[row.user_id] = { wins: row.wins, losses: row.losses, ties: row.ties };
      set({ records });
    }
  },
}));

const PROFILE_COLUMNS = 'id, display_name, avatar, friend_code, xp, streak, last_day';

/** The profile, with hearts when the database has them (migration 11). */
async function loadProfile(uid: string) {
  const withHearts = await supabase!.from('profiles').select(`${PROFILE_COLUMNS}, hearts`).eq('id', uid).maybeSingle();
  if (!withHearts.error) return withHearts;
  return supabase!.from('profiles').select(PROFILE_COLUMNS).eq('id', uid).maybeSingle();
}

/** Keep the higher of the device's and the account's progress, on both sides. */
async function mergeProgress(p: Profile) {
  const local = useApp.getState();
  if (p.xp > local.xp) {
    useApp.setState({ xp: p.xp, streak: p.streak, lastDay: p.last_day ?? undefined, hearts: p.hearts ?? 0 });
  } else if (local.xp > p.xp) {
    await pushProgress();
  }
}

/** Save XP and streak to the account (after each round). */
export async function pushProgress() {
  const { session } = useAccount.getState();
  if (!supabase || !session) return;
  const { xp, streak, lastDay, hearts } = useApp.getState();
  const row = { xp, streak, last_day: lastDay ?? null, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('profiles').update({ ...row, hearts }).eq('id', session.user.id);
  // Before the hearts migration has been run, save the rest.
  if (error) await supabase.from('profiles').update(row).eq('id', session.user.id);
}

/** Starts listening for sign-in changes. Call once at app start. */
let started = false;
export function initAccount() {
  if (!supabase || started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => {
    useAccount.getState().setSession(data.session);
    void useAccount.getState().refresh();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') useAccount.setState({ recovering: true });
    useAccount.getState().setSession(session);
    void useAccount.getState().refresh();
  });
}

// ---------- Sign in / out ----------
export async function signUp(email: string, password: string, name: string) {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name.trim().slice(0, 32), ui_lang: useApp.getState().uiLang } },
  });
  if (error) throw error;
  // With "Confirm email" on in Supabase, there is no session until the link is clicked.
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Google sign-in (set up in Supabase → Authentication → Providers → Google). */
export async function signInWithGoogle() {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    // Come back to this same page; Supabase finishes the sign-in on load.
    options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } },
  });
  if (error) throw error;
}

export async function resetPassword(email: string) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) throw error;
}

/** Finish a password reset (the user arrived from the reset email). */
export async function setNewPassword(password: string) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  useAccount.setState({ recovering: false });
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export async function updateProfile(patch: Partial<Pick<Profile, 'display_name' | 'avatar'>>) {
  const { session } = useAccount.getState();
  if (!supabase || !session) return;
  const { error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', session.user.id);
  if (error) throw error;
  await useAccount.getState().refresh();
}

// ---------- Friends ----------
export type FriendRequestResult = 'sent' | 'accepted' | 'already_friends' | 'already_sent' | 'not_found' | 'self' | 'signed_out';

export async function addFriend(code: string): Promise<FriendRequestResult> {
  if (!supabase) return 'signed_out';
  const { data, error } = await supabase.rpc('send_friend_request', { p_code: code });
  if (error) throw error;
  await useAccount.getState().refresh();
  return data as FriendRequestResult;
}

export async function respondToFriend(from: string, accept: boolean) {
  if (!supabase) return;
  const { error } = await supabase.rpc('respond_friend_request', { p_from: from, p_accept: accept });
  if (error) throw error;
  await useAccount.getState().refresh();
}

export async function removeFriend(other: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('remove_friend', { p_other: other });
  if (error) throw error;
  await useAccount.getState().refresh();
}

export async function friendsDailyBoard(): Promise<BoardRow[]> {
  if (!supabase || !useAccount.getState().session) return [];
  const today = new Date();
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data } = await supabase.rpc('friends_daily_board', { p_day: day });
  return (data as BoardRow[]) ?? [];
}

// ---------- Daily result ----------
export async function saveDailyResult(day: string, score: number, correct: number, total: number) {
  const { session } = useAccount.getState();
  if (!supabase || !session) return;
  // One per person per day; a repeat is simply ignored by the database.
  await supabase.from('daily_results').insert({ user_id: session.user.id, day, score, correct, total });
}

// ---------- Challenges ----------
export async function createChallenge(mode: ModeId, questionIds: string[], friendIds: string[]): Promise<string> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.rpc('create_challenge', { p_mode: mode, p_question_ids: questionIds, p_friends: friendIds });
  if (error) throw error;
  await useAccount.getState().refresh();
  return data as string;
}

export async function submitChallenge(challengeId: string, score: number, correct: number, total: number) {
  if (!supabase) return;
  const { error } = await supabase.rpc('submit_challenge_result', { p_challenge: challengeId, p_score: score, p_correct: correct, p_total: total });
  if (error && !/already played/.test(error.message)) throw error;
  await useAccount.getState().refresh();
}

/** The current player's state in a challenge. */
export function myTurn(c: Challenge): boolean {
  return Boolean(c.players.find((p) => p.me && !p.finished_at)) && new Date(c.expires_at) > new Date();
}

// ---------- Head-to-head ----------
/** Every challenge you shared with one friend, newest first. */
export async function friendHistory(friendId: string): Promise<HistoryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('friend_history', { p_friend: friendId });
  if (error) throw error;
  return (data as HistoryRow[]) ?? [];
}

/** You and your friends by challenges won. */
export async function allTimeBoard(): Promise<AllTimeRow[]> {
  if (!supabase || !useAccount.getState().session) return [];
  const { data } = await supabase.rpc('all_time_board');
  return (data as AllTimeRow[]) ?? [];
}

/** 'ahead' | 'behind' | 'level' | 'new' for a record. */
export function standing(r?: FriendRecord): 'ahead' | 'behind' | 'level' | 'new' {
  if (!r || r.wins + r.losses + r.ties === 0) return 'new';
  return r.wins > r.losses ? 'ahead' : r.wins < r.losses ? 'behind' : 'level';
}
