import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellOff, Feather, Flame, ScrollText, Users } from 'lucide-react';
import { DEFAULT_PREFS, disablePush, enablePush, isSubscribed, keepPushAlive, loadPrefs, pushSupport, pushWanted, savePrefs, type NotificationPrefs } from '../online/push';
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
export function NotificationSettings() {
  const t = useT();
  const session = useAccount((s) => s.session);
  const [on, setOn] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const support = pushSupport();

  useEffect(() => {
    if (!session) return;
    // On if you turned it on here (or the device is subscribed from before this was remembered).
    if (pushWanted()) {
      setOn(true);
      void keepPushAlive();
    } else {
      void isSubscribed().then((sub) => {
        if (sub) useApp.setState({ pushWanted: true });
        setOn(sub);
      });
    }
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

  /** One notification: its name and switch on the first line, its time(s) underneath. */
  const item = (horse: Horse, icon: LucideIcon, label: string, sub: string, key: keyof NotificationPrefs, times: { key: 'verse_hour' | 'morning_hour' | 'afternoon_hour' | 'reminder_hour'; label: string }[] = []) => (
    <section className="glass setting-card">
      <div className="setting-head">
        <IconTile horse={horse} icon={icon} size={36} />
        <span className="menu-text">
          <strong>{label}</strong>
          <span className="caption">{sub}</span>
        </span>
        <Switch on={Boolean(prefs[key])} onChange={(v) => update({ [key]: v })} label={label} />
      </div>
      {times.length > 0 && prefs[key] && (
        <div className={`notif-times ${times.length > 1 ? 'is-many' : ''}`}>
          {times.map((tm) => (
            <label key={tm.key}>
              <span className="caption">{tm.label}</span>
              <HourPicker value={prefs[tm.key]} onChange={(h) => update({ [tm.key]: h })} label={`${label}: ${tm.label}`} />
            </label>
          ))}
        </div>
      )}
    </section>
  );

  const note = !session ? t.notifSignIn : support === 'ios-install' ? t.notifIosInstall : support === 'unsupported' ? t.notifUnsupported : support === 'denied' ? t.notifDenied : null;

  return (
    <>
      <section className="glass setting-card">
        <div className="setting-head">
          <IconTile horse="pale" icon={on ? Bell : BellOff} size={36} />
          <span className="menu-text">
            <strong>{t.notifMaster}</strong>
            <span className="caption">{on ? t.on : t.off}</span>
          </span>
          {session && support === 'ok' && <Switch on={on} onChange={(v) => !busy && toggle(v)} label={t.notifications} />}
        </div>
        {note && <p className="caption setting-note">{note}</p>}
      </section>
      {session && support === 'ok' && on && (
        <>
          {item('pale', ScrollText, t.notifVerse, t.notifVerseSub, 'daily_verse', [{ key: 'verse_hour', label: t.notifTime }])}
          {item('white', Feather, t.notifThoughtShort, t.notifThoughtSub, 'daily_thought')}
          {item('red', Flame, t.notifReminder, t.notifReminderSub, 'daily_reminder', [
            { key: 'morning_hour', label: t.morning },
            { key: 'afternoon_hour', label: t.afternoon },
            { key: 'reminder_hour', label: t.evening },
          ])}
          {item('black', Users, t.notifFriends, t.notifFriendsSub, 'friends')}
          <Pressable
            className="btn glass notif-test"
            onClick={async () => {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification(t.notifTestTitle, { body: t.notifTestBody, icon: '/pwa-192.png', tag: 'test' });
            }}
          >
            <Bell size={18} strokeWidth={STROKE} /> {t.notifTest}
          </Pressable>
        </>
      )}
    </>
  );
}
