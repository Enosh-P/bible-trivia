import { useState } from 'react';
import { NameForm } from './EditName';
import { LogOut, Users } from 'lucide-react';
import { signOut, updateProfile, useAccount } from '../online/account';
import { supabase } from '../online/supabase';
import { useApp, useT } from '../store';
import { AvatarGrid } from './AvatarPicker';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { AuthForm } from './AuthForm';
import { IconTile, STROKE } from './icons';


/** Settings: sign in, or edit your name and avatar colour and sign out. */
export function AccountCard() {
  const t = useT();
  const { session } = useAccount();
  const [open, setOpen] = useState(false);

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

  return <ProfileDetails />;
}

/** Settings → Profile: your name, your picture, and signing out, each in its own card. */
export function ProfileDetails() {
  const t = useT();
  const { session, profile } = useAccount();
  const uiLang = useApp((s) => s.uiLang);
  if (!session) return null;
  return (
    <>
      <section className="glass setting-card">
        <NameForm />
      </section>
      <section className="glass setting-card">
        <div className="menu-text">
          <strong>{t.chooseAvatar}</strong>
          <span className="caption">{t.chooseAvatarHelp}</span>
        </div>
        <AvatarGrid current={profile?.avatar} lang={uiLang} onPick={(id) => void updateProfile({ avatar: id }).catch(() => {})} />
      </section>
      <section className="glass setting-card">
        <div className="menu-text">
          <strong>{session.user.email}</strong>
          {profile && (
            <span className="caption">
              {t.yourCode}: {profile.friend_code}
            </span>
          )}
        </div>
        <Pressable className="btn glass" onClick={() => signOut()}>
          <LogOut size={18} strokeWidth={STROKE} /> {t.signOut}
        </Pressable>
      </section>
    </>
  );
}
