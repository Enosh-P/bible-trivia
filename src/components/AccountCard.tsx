import { useEffect, useState } from 'react';
import { LogOut, Users } from 'lucide-react';
import { signOut, updateProfile, useAccount } from '../online/account';
import { supabase } from '../online/supabase';
import type { Horse } from '../engine/modes';
import { useT } from '../store';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { AuthForm } from './AuthForm';
import { HorseHead, IconTile, STROKE } from './icons';

const AVATARS: Horse[] = ['pale', 'red', 'black', 'white'];

/** Settings: sign in, or edit your name and avatar colour and sign out. */
export function AccountCard() {
  const t = useT();
  const { session, profile } = useAccount();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setName(profile?.display_name ?? ''), [profile?.display_name]);

  if (!supabase) return null;

  if (!session) {
    return (
      <>
        <Pressable className="install-card glass" onClick={() => setOpen(true)}>
          <IconTile horse="pale" icon={Users} size={38} />
          <div className="grow">
            <strong>{t.signInTitle}</strong>
            <span className="caption">{t.signIn} · {t.signUp}</span>
          </div>
        </Pressable>
        <Sheet open={open} onClose={() => setOpen(false)} label={t.signIn}>
          <h2 className="title">{t.signInTitle}</h2>
          <p className="caption">{t.signInSub}</p>
          <AuthForm onDone={() => setOpen(false)} />
        </Sheet>
      </>
    );
  }

  return (
    <section className="glass card-pad">
      <h2 className="eyebrow">{t.profile}</h2>
      <div className="code-row">
        <input className="field" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} aria-label={t.yourName} />
        <Pressable
          className="btn btn-primary small"
          disabled={saving || !name.trim() || name === profile?.display_name}
          onClick={async () => {
            setSaving(true);
            await updateProfile({ display_name: name.trim() }).catch(() => {});
            setSaving(false);
          }}
        >
          {t.save}
        </Pressable>
      </div>
      <div className="avatar-pick" role="radiogroup" aria-label={t.profile}>
        {AVATARS.map((h) => (
          <button key={h} role="radio" aria-checked={profile?.avatar === h} className={profile?.avatar === h ? 'is-on' : ''} onClick={() => updateProfile({ avatar: h })}>
            <IconTile horse={h} icon={HorseHead} size={40} />
          </button>
        ))}
      </div>
      <div className="person">
        <span className="caption grow">
          {session.user.email}
          {profile && ` · ${t.yourCode}: ${profile.friend_code}`}
        </span>
        <Pressable className="btn glass small" onClick={() => signOut()}>
          <LogOut size={16} strokeWidth={STROKE} /> {t.signOut}
        </Pressable>
      </div>
    </section>
  );
}
