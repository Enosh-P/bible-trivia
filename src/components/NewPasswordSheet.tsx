import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { setNewPassword, useAccount } from '../online/account';
import { useT } from '../store';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { IconTile, STROKE } from './icons';

/** Opens by itself when someone arrives from a password-reset email. */
export function NewPasswordSheet() {
  const t = useT();
  const recovering = useAccount((s) => s.recovering);
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState('saving');
    setError(null);
    try {
      await setNewPassword(password);
      setState('done');
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  }

  return (
    <Sheet open={recovering || state === 'done'} onClose={() => (state === 'done' ? setState('idle') : useAccount.setState({ recovering: false }))} label={t.newPasswordTitle}>
      <IconTile horse="pale" icon={KeyRound} size={40} />
      <h2 className="title">{state === 'done' ? t.passwordUpdated : t.newPasswordTitle}</h2>
      {state !== 'done' ? (
        <form className="auth-form" onSubmit={save}>
          <input className="field" type="password" autoComplete="new-password" minLength={6} placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          {error && <p className="caption form-msg is-error">{error}</p>}
          <Pressable className="btn btn-primary" type="submit" disabled={state === 'saving' || password.length < 6}>
            <KeyRound size={18} strokeWidth={STROKE} /> {t.save}
          </Pressable>
        </form>
      ) : (
        <Pressable className="btn btn-primary" onClick={() => setState('idle')}>
          {t.close}
        </Pressable>
      )}
    </Sheet>
  );
}
