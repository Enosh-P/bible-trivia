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
  const { session, profile } = useAccount();
  const uiLang = useApp((s) => s.uiLang);
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

  return (
    <section className="glass card-pad">
      <h2 className="eyebrow">{t.profile}</h2>
      <NameForm />
      <span className="caption">{t.chooseAvatar}</span>
      <AvatarGrid current={profile?.avatar} lang={uiLang} onPick={(id) => void updateProfile({ avatar: id }).catch(() => {})} />
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
