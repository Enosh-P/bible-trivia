import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff, Flame, ScrollText, Sun, Users } from 'lucide-react';
import { DEFAULT_PREFS, disablePush, enablePush, isSubscribed, loadPrefs, pushSupport, savePrefs, type NotificationPrefs } from '../online/push';
import { useAccount } from '../online/account';
import { spring } from '../motion/springs';
import { useApp, useT } from '../store';
import { IconTile, STROKE } from './icons';
import { Pressable } from './Pressable';
import type { Horse } from '../engine/modes';
import type { LucideIcon } from 'lucide-react';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)}>
      <motion.span className="toggle-knob" layout transition={spring.flick} />
    </button>
  );
}

function HourPicker({ value, onChange, label }: { value: number; onChange: (h: number) => void; label: string }) {
  const uiLang = useApp((s) => s.uiLang);
  const fmt = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(uiLang === 'ta' ? 'ta-IN' : undefined, { hour: 'numeric' });
  return (
    <select className="field hour-pick" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {fmt(h)}
        </option>
      ))}
    </select>
  );
}

/** Settings → Notifications: on/off for this device, what to get, and when. */
export function NotificationsCard() {
  const t = useT();
  const session = useAccount((s) => s.session);
  const [on, setOn] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const support = pushSupport();

  useEffect(() => {
    if (!session) return;
    void isSubscribed().then(setOn);
    void loadPrefs().then(setPrefs);
  }, [session]);

  if (support === 'not-configured') return null;

  const update = (patch: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (on) void savePrefs(next).catch(() => {});
  };

  async function toggle(v: boolean) {
    setBusy(true);
    try {
      if (v) setOn(await enablePush(prefs));
      else {
        await disablePush();
        setOn(false);
      }
    } finally {
      setBusy(false);
    }
  }

  const row = (horse: Horse, icon: LucideIcon, label: string, key: keyof NotificationPrefs, hourKey?: 'verse_hour' | 'reminder_hour') => (
    <div className="row">
      <IconTile horse={horse} icon={icon} size={30} />
      <span className="row-label">{label}</span>
      <div className="row-control notif-control">
        {hourKey && prefs[key] && <HourPicker value={prefs[hourKey]} onChange={(h) => update({ [hourKey]: h })} label={label} />}
        <Switch on={Boolean(prefs[key])} onChange={(v) => update({ [key]: v })} label={label} />
      </div>
    </div>
  );

  return (
    <section className="glass group">
      <div className="row">
        <IconTile horse="pale" icon={on ? Bell : BellOff} size={30} />
        <span className="row-label">{t.notifications}</span>
        <div className="row-control">
          {session && support === 'ok' && <Switch on={on} onChange={(v) => !busy && toggle(v)} label={t.notifications} />}
        </div>
      </div>
      {!session && <p className="caption notif-note">{t.notifSignIn}</p>}
      {session && support === 'ios-install' && <p className="caption notif-note">{t.notifIosInstall}</p>}
      {session && support === 'unsupported' && <p className="caption notif-note">{t.notifUnsupported}</p>}
      {session && support === 'denied' && <p className="caption notif-note">{t.notifDenied}</p>}
      {session && support === 'ok' && on && (
        <>
          {row('pale', ScrollText, t.notifVerse, 'daily_verse', 'verse_hour')}
          {row('white', Sun, t.notifReminder, 'daily_reminder', 'reminder_hour')}
          {row('red', Flame, t.notifStreak, 'streak')}
          {row('black', Users, t.notifFriends, 'friends')}
          <Pressable
            className="btn glass small notif-test"
            onClick={async () => {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification(t.notifTestTitle, { body: t.notifTestBody, icon: '/pwa-192.png', tag: 'test' });
            }}
          >
            <Bell size={16} strokeWidth={STROKE} /> {t.notifTest}
          </Pressable>
        </>
      )}
    </section>
  );
}
