import { supabase } from './supabase';
import { useAccount } from './account';
import { useApp } from '../store';

/*
 * Web push: the phone or browser gives us a subscription; we save it with the
 * person's preferences. The `push` Edge Function sends the messages.
 * Works on Android, desktop, and iPhone/iPad once the app is on the Home Screen (iOS 16.4+).
 */

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? '';

export interface NotificationPrefs {
  daily_verse: boolean;
  verse_hour: number;
  daily_reminder: boolean;
  morning_hour: number;
  afternoon_hour: number;
  reminder_hour: number;
  streak: boolean;
  friends: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  daily_verse: true,
  verse_hour: 7,
  daily_reminder: true,
  morning_hour: 9,
  afternoon_hour: 13,
  reminder_hour: 19,
  streak: true,
  friends: true,
};

export type PushSupport = 'ok' | 'unsupported' | 'ios-install' | 'not-configured' | 'denied';

export function pushSupport(): PushSupport {
  if (!supabase || !VAPID_PUBLIC_KEY) return 'not-configured';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return ios && !standalone ? 'ios-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.ready;
}

/** Is this device currently subscribed? */
export async function isSubscribed(): Promise<boolean> {
  if (pushSupport() !== 'ok') return false;
  const sub = await (await registration()).pushManager.getSubscription();
  return Boolean(sub);
}

export async function loadPrefs(): Promise<NotificationPrefs> {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid) return DEFAULT_PREFS;
  const { data } = await supabase.from('notification_prefs').select('*').eq('user_id', uid).maybeSingle();
  return data ? { ...DEFAULT_PREFS, ...(data as Partial<NotificationPrefs>) } : DEFAULT_PREFS;
}

/** Save what the person wants, with their language and time zone. */
export async function savePrefs(prefs: NotificationPrefs) {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid) return;
  const { error } = await supabase.from('notification_prefs').upsert({
    user_id: uid,
    ...prefs,
    lang: useApp.getState().uiLang,
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Subscribe this device (or reuse its subscription) and save it on the server. */
async function subscribeDevice(uid: string) {
  if (!supabase) return;
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) as BufferSource }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: uid, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
}

/** Ask permission, subscribe this device, and save it. */
export async function enablePush(prefs: NotificationPrefs): Promise<boolean> {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid || pushSupport() !== 'ok') return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  await subscribeDevice(uid);
  await savePrefs(prefs);
  useApp.setState({ pushWanted: true });
  return true;
}

/** Notifications stay on until you turn them off. */
export function pushWanted(): boolean {
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return false;
  return useApp.getState().pushWanted === true;
}

/**
 * On every start: if you turned notifications on, make sure this device is still
 * subscribed and the server knows it. A browser can drop or replace a
 * subscription (app update, an expired endpoint the server cleaned up), and this
 * puts it back quietly, without asking again.
 */
export async function keepPushAlive() {
  const uid = useAccount.getState().session?.user.id;
  if (!uid || !pushWanted()) return;
  try {
    await subscribeDevice(uid);
  } catch {
    /* offline: try again next start */
  }
}

/** Stop notifications on this device. */
export async function disablePush() {
  useApp.setState({ pushWanted: false });
  if (pushSupport() !== 'ok') return;
  const sub = await (await registration()).pushManager.getSubscription();
  if (!sub) return;
  await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Keep notification language in step with the app language. */
export async function syncPushLanguage(lang: 'en' | 'ta') {
  const uid = useAccount.getState().session?.user.id;
  if (!supabase || !uid) return;
  await supabase.from('notification_prefs').update({ lang }).eq('user_id', uid);
}
