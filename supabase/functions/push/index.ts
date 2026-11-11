// Supabase Edge Function: sends web push notifications.
//
// Called two ways (both with header x-webhook-secret: WEBHOOK_SECRET):
//   - Supabase Cron every 30 minutes, body {"task":"scheduled"}: queues the daily
//     verse / reminder / streak messages that are due (in each person's own time
//     zone), then sends everything waiting.
//   - Database Webhook on INSERT into notification_queue (friend requests,
//     challenges): sends right away.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com),
// WEBHOOK_SECRET. SUPABASE_URL and the secret key are provided automatically.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Lang = 'en' | 'ta';
interface QueueRow { id: number; user_id: string; kind: string; payload: Record<string, unknown>; attempts: number }
interface Sub { id: number; user_id: string; endpoint: string; p256dh: string; auth: string }
interface Verse { id: string; book_code: string; chapter: number; verse: number; en: string; ta: string }

function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    if (keys.default) return keys.default;
  } catch { /* not set */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

// Created on first use, so the helpers above can be tested without a database.
let _db: ReturnType<typeof createClient> | null = null;
const db = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_t, k) => {
    _db ??= createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), { auth: { persistSession: false } });
    return (_db as unknown as Record<string | symbol, unknown>)[k];
  },
});

const MODE: Record<string, { en: string; ta: string }> = {
  classic: { en: 'Classic', ta: 'கிளாசிக்' },
  truefalse: { en: 'True or False', ta: 'சரியா தவறா' },
  who: { en: 'Who Said It?', ta: 'சொன்னவர் யார்?' },
  book: { en: 'Which Book?', ta: 'எந்தப் புஸ்தகம்?' },
  blank: { en: 'Fill the Blank', ta: 'வசனத்தை நிரப்பு' },
};

// ---------- Verse of the Day: the same choice as the app (src/engine/verses.ts) ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function verseOfTheDay(verses: Verse[], day: string): Verse {
  const sorted = [...verses].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const order = [...sorted.keys()];
  const random = mulberry32(Math.floor(dayNumber / sorted.length) + 1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return sorted[order[dayNumber % sorted.length]];
}

const clip = (s: string, n = 170) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// ---------- Message text ----------
export function message(row: QueueRow, lang: Lang, verses: Verse[], books: Record<string, { en: string; ta: string }>) {
  const p = row.payload as Record<string, string | number>;
  const name = String(p.name ?? '');
  const mode = MODE[String(p.mode)]?.[lang] ?? String(p.mode ?? '');
  const ta = lang === 'ta';
  switch (row.kind) {
    case 'daily_verse': {
      const v = verseOfTheDay(verses, String(p.day));
      const ref = `${books[v.book_code]?.[lang] ?? v.book_code} ${v.chapter}:${v.verse}`;
      return { title: ta ? `இன்றைய வசனம் · ${ref}` : `Verse of the Day · ${ref}`, body: clip(ta ? v.ta : v.en), url: '/?open=home', tag: 'daily-verse' };
    }
    case 'daily_reminder':
      return {
        title: ta ? 'இன்றைய சவால் காத்திருக்கிறது' : "Today's Challenge is waiting",
        body: ta ? '7 கேள்விகள், சுமார் 2 நிமிடங்கள். உங்கள் குடும்பம் விளையாடிவிட்டதா?' : '7 questions, about 2 minutes. Has your family played yet?',
        url: '/?open=daily', tag: 'daily-reminder',
      };
    case 'streak_rescue':
      return {
        title: ta ? `உங்கள் ${p.streak} நாள் தொடரைக் காப்பாற்றுங்கள்` : `Keep your ${p.streak}-day streak`,
        body: ta ? 'நள்ளிரவுக்கு முன் இன்றைய சவாலை விளையாடுங்கள்.' : "Play today's challenge before midnight.",
        url: '/?open=daily', tag: 'streak',
      };
    case 'friend_request':
      return { title: ta ? `${name} உங்கள் நண்பராக விரும்புகிறார்` : `${name} wants to be your friend`, body: ta ? 'ஏற்றுக்கொள்ள நண்பர்கள் பக்கத்தைத் திறங்கள்.' : 'Open Friends to accept.', url: '/?open=friends', tag: `friend-${name}` };
    case 'friend_accepted':
      return { title: ta ? `${name} உங்கள் நண்பர் ஆனார்` : `${name} accepted your friend request`, body: ta ? 'இப்போது ஒரு சவால் அனுப்புங்கள்!' : 'Send them a challenge!', url: '/?open=friends', tag: `friend-${name}` };
    case 'challenge_received':
      return { title: ta ? `${name} உங்களுக்குச் சவால் விட்டார்` : `${name} challenged you`, body: ta ? `${mode} · அதே கேள்விகள், எப்போது வேண்டுமானாலும் விளையாடலாம்.` : `${mode} · same questions, play any time.`, url: '/?open=friends', tag: `challenge-${p.challenge_id}` };
    case 'challenge_finished':
      return { title: ta ? `சவால் முடிந்தது: ${p.winner} வென்றார்` : `Challenge finished: ${p.winner} won`, body: `${mode} · ${p.scores}`, url: '/?open=friends', tag: `challenge-${p.challenge_id}` };
    default:
      return null;
  }
}

async function drain(): Promise<{ sent: number; failed: number }> {
  const { data: queue } = await db.from('notification_queue').select('id, user_id, kind, payload, attempts')
    .is('sent_at', null).lt('attempts', 5).order('created_at').limit(300);
  if (!queue?.length) return { sent: 0, failed: 0 };
  const users = [...new Set(queue.map((q) => q.user_id))];
  const [{ data: subs }, { data: prefs }] = await Promise.all([
    db.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', users),
    db.from('notification_prefs').select('user_id, lang').in('user_id', users),
  ]);
  const needsVerse = queue.some((q) => q.kind === 'daily_verse');
  const [{ data: verses }, { data: bookRows }] = needsVerse
    ? await Promise.all([db.from('verses').select('id, book_code, chapter, verse, en, ta'), db.from('books').select('code, name_en, name_ta')])
    : [{ data: [] }, { data: [] }];
  const books = Object.fromEntries((bookRows ?? []).map((b: { code: string; name_en: string; name_ta: string }) => [b.code, { en: b.name_en, ta: b.name_ta }]));
  const lang = Object.fromEntries((prefs ?? []).map((p: { user_id: string; lang: Lang }) => [p.user_id, p.lang]));

  let sent = 0, failed = 0;
  for (const row of queue as QueueRow[]) {
    const msg = message(row, lang[row.user_id] ?? 'en', (verses ?? []) as Verse[], books);
    const targets = ((subs ?? []) as Sub[]).filter((s) => s.user_id === row.user_id);
    let delivered = false;
    if (msg) {
      for (const s of targets) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 12 * 3600 });
          delivered = true;
          await db.from('push_subscriptions').update({ last_ok_at: new Date().toISOString() }).eq('id', s.id);
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          // The device unsubscribed or the app was removed: forget it.
          if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
    // No device left, or an unknown kind: nothing more to try.
    if (delivered || !targets.length || !msg) {
      await db.from('notification_queue').update({ sent_at: new Date().toISOString() }).eq('id', row.id);
      if (delivered) sent++;
    } else {
      await db.from('notification_queue').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      failed++;
    }
  }
  return { sent, failed };
}

if (import.meta.main) Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) return new Response('unauthorized', { status: 401 });
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return new Response('VAPID keys not set', { status: 500 });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', pub, priv);

  const body = await req.json().catch(() => ({}));
  let queued = 0;
  if (body?.task === 'scheduled') {
    const { data, error } = await db.rpc('queue_scheduled_notifications');
    if (error) return new Response(`schedule failed: ${error.message}`, { status: 500 });
    queued = data ?? 0;
  }
  const result = await drain();
  return Response.json({ queued, ...result });
});
